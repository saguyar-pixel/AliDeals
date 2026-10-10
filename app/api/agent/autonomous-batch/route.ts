import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { runAutonomousMorningRadar } from "@/lib/agent/alon-radar";
import { addAgentLog } from "@/lib/agent/team-orchestrator";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(req: NextRequest): boolean {
  // 1. Vercel Cron header
  if (req.headers.get("x-vercel-cron")) return true;

  // 2. Secret in Authorization header or query param
  const authHeader = req.headers.get("authorization");
  const url = new URL(req.url);
  const querySecret = url.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET || "alideals_morning_radar_secret";

  if (authHeader && authHeader.includes(cronSecret)) return true;
  if (querySecret && querySecret === cronSecret) return true;

  // 3. Admin session / cookie authentication
  if (verifyAdminAccess(req)) return true;

  return false;
}

export async function GET(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "גישה נדחתה: נדרשת הרשאת מנהל או CRON_SECRET תקין" },
        { status: 403 }
      );
    }

    addAgentLog(
      "orchestrator",
      "אלון",
      "info",
      "הפעלת רדאר שוק אוטונומי מתוזמן (Cron/Webhook) להפקת 8 כתבות חדשות..."
    );

    const result = await runAutonomousMorningRadar();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Autonomous batch execution failed";
    console.error("[Autonomous Batch Error]:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json(
        { error: "גישה נדחתה: נדרשת הרשאת מנהל או CRON_SECRET תקין" },
        { status: 403 }
      );
    }

    addAgentLog(
      "orchestrator",
      "אלון",
      "info",
      "הפעלת רדאר שוק אוטונומי ידנית מה-CMS להפקת 8 כתבות חדשות..."
    );

    const result = await runAutonomousMorningRadar();

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Autonomous batch execution failed";
    console.error("[Autonomous Batch Error]:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
