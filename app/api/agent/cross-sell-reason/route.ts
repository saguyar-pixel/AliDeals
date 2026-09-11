import { NextRequest, NextResponse } from "next/server";
import { generateRonCrossSellReason } from "@/lib/agent/ron-copywriter";
import { verifyAdminAccess } from "@/lib/security/firewall";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ success: false, error: "גישה נדחתה: אין הרשאת מנהל" }, { status: 403 });
    }

    const body = await req.json();
    const mainTitle = body.mainTitle || "מוצר ראשי";
    const complementaryTitles: string[] = Array.isArray(body.complementaryTitles) ? body.complementaryTitles : [];

    if (complementaryTitles.length === 0) {
      return NextResponse.json({
        success: false,
        error: "חובה לציין לפחות מוצר משלים אחד",
      }, { status: 400 });
    }

    const reason = await generateRonCrossSellReason(mainTitle, complementaryTitles);

    return NextResponse.json({
      success: true,
      reason,
    });
  } catch (err: any) {
    console.error("Cross-sell reason API error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
