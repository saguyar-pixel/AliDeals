import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/security/firewall";

function maskSecret(val?: string | null): string {
  if (!val || val.length < 8) return "";
  return `${val.slice(0, 4)}...${val.slice(-4)}`;
}

function isSafeTelegramUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    return host === "t.me" || host === "telegram.me" || host.endsWith(".t.me");
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { supabaseDb } = await import("@/lib/db");
    const settings = await supabaseDb.getSettings();
    const isAdmin = verifyAdminAccess(req);

    const safeTelegramUrl =
      settings.dealRequestTelegramUrl && isSafeTelegramUrl(settings.dealRequestTelegramUrl)
        ? settings.dealRequestTelegramUrl
        : process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL ||
          process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL ||
          "https://t.me/AliDealsIL?start=site_deal_request";

    const publicSettings = {
      gaMeasurementId: settings.gaMeasurementId || process.env.NEXT_PUBLIC_GA_ID || "",
      siteUrl: settings.siteUrl || "https://ali-deals.co.il",
      enableDealRequestWidget:
        settings.enableDealRequestWidget !== undefined ? settings.enableDealRequestWidget : true,
      dealRequestTelegramUrl: safeTelegramUrl,
      dealRequestTitle: settings.dealRequestTitle || "אתם מבקשים — אנחנו מוצאים!",
      updatedAt: settings.updatedAt,
    };

    // Unauthenticated visitors only receive public display/GA4 fields — zero secrets or scripts
    if (!isAdmin) {
      return NextResponse.json({
        success: true,
        settings: publicSettings,
      });
    }

    const rawAliSecret = settings.aliexpressAppSecret || process.env.ALIEXPRESS_APP_SECRET || "";
    const rawGeminiKey = settings.geminiApiKey || "";

    return NextResponse.json({
      success: true,
      settings: {
        ...publicSettings,
        aliexpressAppKey: settings.aliexpressAppKey || process.env.ALIEXPRESS_APP_KEY || "",
        // Never expose raw secrets in API responses — return boolean + masked preview only
        aliexpressAppSecret: "",
        hasAliexpressSecret: Boolean(rawAliSecret),
        aliexpressAppSecretMasked: settings.aliexpressAppSecret
          ? maskSecret(settings.aliexpressAppSecret)
          : process.env.ALIEXPRESS_APP_SECRET
          ? "מוגדר ב-ENV"
          : "",
        aliexpressDefaultTrackingId:
          settings.aliexpressDefaultTrackingId || process.env.ALIEXPRESS_TRACKING_ID || "default",
        geminiApiKey: "",
        hasGeminiKey: Boolean(rawGeminiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
        geminiApiKeyMasked: rawGeminiKey
          ? maskSecret(rawGeminiKey)
          : process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
          ? "מוגדר ב-ENV"
          : "",
        gtmId: settings.gtmId || "",
        gtmHeadScript: settings.gtmHeadScript || "",
        gtmBodyScript: settings.gtmBodyScript || "",
        customHeadScript: settings.customHeadScript || "",
        customBodyScript: settings.customBodyScript || "",
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
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

    if (cleanId && !/^G-[A-Z0-9]+$/i.test(cleanId)) {
      return NextResponse.json(
        { error: "מזהה GA4 לא תקין. הפורמט הנדרש הוא G-XXXXXXXXXX (לדוגמה: G-ABC123XYZ0)" },
        { status: 400 }
      );
    }

    if (cleanGtmId && !/^GTM-[A-Z0-9]+$/i.test(cleanGtmId)) {
      return NextResponse.json(
        { error: "מזהה GTM לא תקין. הפורמט הנדרש הוא GTM-XXXXXXX (לדוגמה: GTM-ABC1234)" },
        { status: 400 }
      );
    }

    if (body.dealRequestTelegramUrl !== undefined) {
      const candidateUrl = String(body.dealRequestTelegramUrl).trim();
      if (candidateUrl && !isSafeTelegramUrl(candidateUrl)) {
        return NextResponse.json(
          { error: "כתובת טלגרם לא תקינה. חובה להזין קישור רשמי המתחיל ב-https://t.me/" },
          { status: 400 }
        );
      }
    }

    // Only update secret fields when a real new secret (not empty/masked) is explicitly provided
    const incomingAliSecret =
      body.aliexpressAppSecret !== undefined ? String(body.aliexpressAppSecret).trim() : undefined;
    const shouldUpdateAliSecret =
      incomingAliSecret !== undefined &&
      incomingAliSecret.length > 0 &&
      !incomingAliSecret.includes("...") &&
      !incomingAliSecret.includes("מוגדר");

    const incomingGeminiKey =
      body.geminiApiKey !== undefined ? String(body.geminiApiKey).trim() : undefined;
    const shouldUpdateGeminiKey =
      incomingGeminiKey !== undefined &&
      incomingGeminiKey.length > 0 &&
      !incomingGeminiKey.includes("...") &&
      !incomingGeminiKey.includes("מוגדר");

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
      ...(shouldUpdateAliSecret ? { aliexpressAppSecret: incomingAliSecret } : {}),
      ...(body.aliexpressDefaultTrackingId
        ? { aliexpressDefaultTrackingId: String(body.aliexpressDefaultTrackingId).trim() }
        : {}),
      ...(shouldUpdateGeminiKey ? { geminiApiKey: incomingGeminiKey } : {}),
      ...(body.enableDealRequestWidget !== undefined
        ? { enableDealRequestWidget: Boolean(body.enableDealRequestWidget) }
        : {}),
      ...(body.dealRequestTelegramUrl !== undefined
        ? { dealRequestTelegramUrl: String(body.dealRequestTelegramUrl).trim() }
        : {}),
      ...(body.dealRequestTitle !== undefined ? { dealRequestTitle: String(body.dealRequestTitle).trim() } : {}),
    });

    // Redact raw secrets from POST response
    const safeUpdated = {
      ...updated,
      aliexpressAppSecret: undefined,
      geminiApiKey: undefined,
      hasAliexpressSecret: Boolean(updated.aliexpressAppSecret || process.env.ALIEXPRESS_APP_SECRET),
      hasGeminiKey: Boolean(updated.geminiApiKey || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    };

    return NextResponse.json({
      success: true,
      message: "ההגדרות נשמרו בהצלחה!",
      settings: safeUpdated,
    });
  } catch {
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
