import { NextRequest, NextResponse } from "next/server";
import { getGscSettings, saveGscSettings, getGscQueries } from "@/lib/analytics/gsc-connector";

export async function GET() {
  const settings = getGscSettings();
  const queries = getGscQueries();
  return NextResponse.json({
    success: true,
    settings,
    queries,
    strikingDistanceCount: queries.filter((q) => q.opportunityType === "striking_distance").length,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updated = saveGscSettings(body);
    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update GSC settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
