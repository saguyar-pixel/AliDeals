import { NextRequest, NextResponse } from "next/server";
import { getAgentTeam, getAgentLogs, getOrchestratorMessages } from "@/lib/agent/team-orchestrator";
import { loadCadenceBudget, updateCadenceTargets } from "@/lib/agent/cadence-manager";
import { runDanaCroAnalysisAsync } from "@/lib/analytics/cro-engine";
import { getBacklogTasks } from "@/lib/agent/backlog-manager";
import { getEditProposals, getPendingEditProposals } from "@/lib/agent/proposal-engine";
import { verifyAdminAccess } from "@/lib/security/firewall";

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 401 });
    }

    const budget = loadCadenceBudget();
    let logs = getAgentLogs();
    let messages = getOrchestratorMessages();
    const analytics = await runDanaCroAnalysisAsync();
    const tasks = getBacklogTasks();
    const proposals = getEditProposals();
    const pendingProposalsCount = getPendingEditProposals().length;

    const { supabaseDb } = await import("@/lib/db");
    const { isGeminiConfigured, getWaterfallStatus } = await import("@/lib/gemini/client");
    if (supabaseDb.isConfigured()) {
      try {
        const [cloudLogs, cloudMessages] = await Promise.all([
          supabaseDb.getAgentLogs(60),
          supabaseDb.getAgentMessages(50),
        ]);
        if (cloudLogs && cloudLogs.length > 0) logs = cloudLogs;
        if (cloudMessages && cloudMessages.length > 0) messages = cloudMessages;
      } catch {}
    }

    return NextResponse.json({
      team: getAgentTeam(),
      budget,
      logs: logs.slice(0, 60),
      messages,
      analytics,
      tasks,
      proposals,
      pendingProposalsCount,
      geminiConfigured: await isGeminiConfigured(),
      waterfall: getWaterfallStatus(),
    });
  } catch {
    return NextResponse.json({ error: "Status fetch error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 401 });
    }

    const body = await req.json();
    const { dailyProducts, weeklyTop5, weeklyCategories } = body;

    const updatedBudget = updateCadenceTargets(dailyProducts, weeklyTop5, weeklyCategories);

    return NextResponse.json({
      success: true,
      budget: updatedBudget,
    });
  } catch {
    return NextResponse.json({ error: "Update budget error" }, { status: 500 });
  }
}
