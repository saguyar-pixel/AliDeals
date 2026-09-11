import { NextRequest, NextResponse } from "next/server";
import { getAgentTeam, getAgentLogs, getOrchestratorMessages } from "@/lib/agent/team-orchestrator";
import { loadCadenceBudget, updateCadenceTargets } from "@/lib/agent/cadence-manager";
import { runDanaCroAnalysis } from "@/lib/analytics/cro-engine";
import { getBacklogTasks } from "@/lib/agent/backlog-manager";
import { getEditProposals, getPendingEditProposals } from "@/lib/agent/proposal-engine";

export async function GET() {
  try {
    const budget = loadCadenceBudget();
    let logs = getAgentLogs();
    let messages = getOrchestratorMessages();
    const analytics = runDanaCroAnalysis();
    const tasks = getBacklogTasks();
    const proposals = getEditProposals();
    const pendingProposalsCount = getPendingEditProposals().length;

    const { supabaseDb } = await import("@/lib/db");
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
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Status fetch error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * POST endpoint to update daily/weekly production targets on-demand
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dailyProducts, weeklyTop5, weeklyCategories } = body;

    const updatedBudget = updateCadenceTargets(dailyProducts, weeklyTop5, weeklyCategories);

    return NextResponse.json({
      success: true,
      budget: updatedBudget,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Update budget error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
