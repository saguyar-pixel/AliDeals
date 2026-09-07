import { NextRequest, NextResponse } from "next/server";
import { AGENT_TEAM, getAgentLogs, getOrchestratorMessages } from "@/lib/agent/team-orchestrator";
import { loadCadenceBudget, updateCadenceTargets } from "@/lib/agent/cadence-manager";
import { runDanaCroAnalysis } from "@/lib/analytics/cro-engine";
import { getBacklogTasks } from "@/lib/agent/backlog-manager";

export async function GET() {
  try {
    const budget = loadCadenceBudget();
    const logs = getAgentLogs();
    const messages = getOrchestratorMessages();
    const analytics = runDanaCroAnalysis();
    const tasks = getBacklogTasks();

    return NextResponse.json({
      team: AGENT_TEAM,
      budget,
      logs: logs.slice(0, 60),
      messages,
      analytics,
      tasks,
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
