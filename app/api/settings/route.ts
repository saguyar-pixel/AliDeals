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
        geminiApiKey: settings.geminiApiKey || "",
        hasGeminiKey: Boolean(settings.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        geminiApiKeyMasked: settings.geminiApiKey ? `${settings.geminiApiKey.slice(0, 6)}...${settings.geminiApiKey.slice(-4)}` : (process.env.GEMINI_API_KEY ? "מוגדר ב-ENV" : ""),
        enableDealRequestWidget: settings.enableDealRequestWidget !== undefined ? settings.enableDealRequestWidget : true,
        dealRequestTelegramUrl: settings.dealRequestTelegramUrl || process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || "https://t.me/AliDealsIL?start=site_deal_request",
        dealRequestTitle: settings.dealRequestTitle || "אתם מבקשים — אנחנו מוצאים!",
        gtmId: settings.gtmId || "",
        gtmHeadScript: settings.gtmHeadScript || "",
        gtmBodyScript: settings.gtmBodyScript || "",
        customHeadScript: settings.customHeadScript || "",
        customBodyScript: settings.customBodyScript || "",
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
    const cleanId = body.gaMeasurementId !== undefined ? String(body.gaMeasurementId).trim() : undefined;
    const cleanGtmId = body.gtmId !== undefined ? String(body.gtmId).trim().toUpperCase() : undefined;

    // Validate GA4 format (G-XXXXXXXXXX) if provided and non-empty
    if (cleanId && !/^G-[A-Z0-9]+$/i.test(cleanId)) {
      return NextResponse.json(
        { error: "מזהה GA4 לא תקין. הפורמט הנדרש הוא G-XXXXXXXXXX (לדוגמה: G-ABC123XYZ0)" },
        { status: 400 }
      );
    }

    // Validate GTM format (GTM-XXXXXXX) if provided and non-empty
    if (cleanGtmId && !/^GTM-[A-Z0-9]+$/i.test(cleanGtmId)) {
      return NextResponse.json(
        { error: "מזהה GTM לא תקין. הפורמט הנדרש הוא GTM-XXXXXXX (לדוגמה: GTM-ABC1234)" },
        { status: 400 }
      );
    }

    const { supabaseDb } = await import("@/lib/db");
    const updated = await supabaseDb.updateSettings({
      ...(cleanId !== undefined ? { gaMeasurementId: cleanId ? cleanId.toUpperCase() : "" } : {}),
      ...(cleanGtmId !== undefined ? { gtmId: cleanGtmId } : {}),
      ...(body.gtmHeadScript !== undefined ? { gtmHeadScript: String(body.gtmHeadScript) } : {}),
      ...(body.gtmBodyScript !== undefined ? { gtmBodyScript: String(body.gtmBodyScript) } : {}),
      ...(body.customHeadScript !== undefined ? { customHeadScript: String(body.customHeadScript) } : {}),
      ...(body.customBodyScript !== undefined ? { customBodyScript: String(body.customBodyScript) } : {}),
      ...(body.siteUrl ? { siteUrl: String(body.siteUrl).trim() } : {}),
      ...(body.aliexpressAppKey !== undefined ? { aliexpressAppKey: String(body.aliexpressAppKey).trim() } : {}),
      ...(body.aliexpressAppSecret !== undefined ? { aliexpressAppSecret: String(body.aliexpressAppSecret).trim() } : {}),
      ...(body.aliexpressDefaultTrackingId ? { aliexpressDefaultTrackingId: String(body.aliexpressDefaultTrackingId).trim() } : {}),
      ...(body.geminiApiKey !== undefined ? { geminiApiKey: String(body.geminiApiKey).trim() } : {}),
      ...(body.enableDealRequestWidget !== undefined ? { enableDealRequestWidget: Boolean(body.enableDealRequestWidget) } : {}),
      ...(body.dealRequestTelegramUrl !== undefined ? { dealRequestTelegramUrl: String(body.dealRequestTelegramUrl).trim() } : {}),
      ...(body.dealRequestTitle !== undefined ? { dealRequestTitle: String(body.dealRequestTitle).trim() } : {}),
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
