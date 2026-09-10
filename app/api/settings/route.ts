import { NextRequest, NextResponse } from "next/server";
import { analyticsDb } from "@/lib/db/analytics-db";
import { verifyAdminAccess } from "@/lib/security/firewall";

export async function GET() {
  try {
    const settings = analyticsDb.getSettings();
    return NextResponse.json({
      success: true,
      settings: {
        gaMeasurementId: settings.gaMeasurementId || process.env.NEXT_PUBLIC_GA_ID || "",
        siteUrl: settings.siteUrl || "https://ali-deals.co.il",
        aliexpressDefaultTrackingId: settings.aliexpressDefaultTrackingId || "default",
        updatedAt: settings.updatedAt,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load settings" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const body = await req.json();
    const cleanId = body.gaMeasurementId ? String(body.gaMeasurementId).trim() : undefined;

    // Validate GA4 format (G-XXXXXXXXXX) if provided
    if (cleanId && !/^G-[A-Z0-9]+$/i.test(cleanId)) {
      return NextResponse.json(
        { error: "מזהה GA4 לא תקין. הפורמט הנדרש הוא G-XXXXXXXXXX (לדוגמה: G-ABC123XYZ0)" },
        { status: 400 }
      );
    }

    const updated = analyticsDb.saveSettings({
      ...(cleanId !== undefined ? { gaMeasurementId: cleanId.toUpperCase() } : {}),
      ...(body.siteUrl ? { siteUrl: String(body.siteUrl).trim() } : {}),
      ...(body.aliexpressDefaultTrackingId ? { aliexpressDefaultTrackingId: String(body.aliexpressDefaultTrackingId).trim() } : {}),
    });

    return NextResponse.json({
      success: true,
      message: "ההגדרות נשמרו בהצלחה!",
      settings: updated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save settings" }, { status: 500 });
  }
}
