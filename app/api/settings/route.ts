import { NextRequest, NextResponse } from "next/server";
import { analyticsDb } from "@/lib/db/analytics-db";
import { verifyAdminAccess } from "@/lib/security/firewall";

export async function GET() {
  try {
    const { supabaseDb } = await import("@/lib/db");
    const settings = await supabaseDb.getSettings();
    return NextResponse.json({
      success: true,
      settings: {
        gaMeasurementId: settings.gaMeasurementId || process.env.NEXT_PUBLIC_GA_ID || "",
        siteUrl: settings.siteUrl || "https://ali-deals.co.il",
        aliexpressAppKey: settings.aliexpressAppKey || process.env.ALIEXPRESS_APP_KEY || "",
        aliexpressAppSecret: settings.aliexpressAppSecret || process.env.ALIEXPRESS_APP_SECRET || "",
        aliexpressDefaultTrackingId: settings.aliexpressDefaultTrackingId || process.env.ALIEXPRESS_TRACKING_ID || "default",
        hasGeminiKey: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        geminiApiKeyMasked: settings.geminiApiKey ? `${settings.geminiApiKey.slice(0, 6)}...${settings.geminiApiKey.slice(-4)}` : (process.env.GEMINI_API_KEY ? "מוגדר ב-ENV" : ""),
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

    const { supabaseDb } = await import("@/lib/db");
    const updated = await supabaseDb.updateSettings({
      ...(cleanId !== undefined ? { gaMeasurementId: cleanId.toUpperCase() } : {}),
      ...(body.siteUrl ? { siteUrl: String(body.siteUrl).trim() } : {}),
      ...(body.aliexpressAppKey !== undefined ? { aliexpressAppKey: String(body.aliexpressAppKey).trim() } : {}),
      ...(body.aliexpressAppSecret !== undefined ? { aliexpressAppSecret: String(body.aliexpressAppSecret).trim() } : {}),
      ...(body.aliexpressDefaultTrackingId ? { aliexpressDefaultTrackingId: String(body.aliexpressDefaultTrackingId).trim() } : {}),
      ...(body.geminiApiKey !== undefined ? { geminiApiKey: String(body.geminiApiKey).trim() } : {}),
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
