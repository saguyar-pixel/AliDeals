import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Zero-DB Brevo (Sendinblue) Newsletter Subscription
 * Adheres strictly to Zero-DB architecture:
 * No subscriber details or logs are persisted to local files or Supabase.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const firstName = String(body.firstName || body.first_name || "").trim();
    const source = String(body.source || "footer").trim();

    // Basic email validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, error: "כתובת אימייל אינה תקינה" },
        { status: 400 }
      );
    }

    const brevoApiKey = process.env.BREVO_API_KEY;
    const brevoListId = process.env.BREVO_LIST_ID ? Number(process.env.BREVO_LIST_ID) : undefined;

    if (!brevoApiKey) {
      console.warn("[Brevo Newsletter] BREVO_API_KEY is not configured in Environment. Operating in mock mode.");
      return NextResponse.json({
        success: true,
        message: "נרשמת בהצלחה לדילים השבועיים של AliDeals!",
        source,
      });
    }

    // Call Brevo Contacts API
    const brevoPayload: Record<string, any> = {
      email,
      updateEnabled: true,
      attributes: {
        FIRSTNAME: firstName || "חבר/ת AliDeals",
        SOURCE: source,
        OPT_IN_DATE: new Date().toISOString(),
      },
    };

    if (brevoListId && !isNaN(brevoListId)) {
      brevoPayload.listIds = [brevoListId];
    }

    const res = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": brevoApiKey,
      },
      body: JSON.stringify(brevoPayload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      // Check if duplicate contact - which is already successful subscription
      if (errorData?.code === "duplicate_parameter") {
        return NextResponse.json({
          success: true,
          message: "כתובת זו כבר רשומה לרשימת התפוצה שלנו!",
          source,
        });
      }

      console.error("[Brevo Newsletter] API error response:", errorData);
      return NextResponse.json(
        {
          success: false,
          error: errorData?.message || "שגיאה בחיבור לשירות הדיוור של Brevo",
        },
        { status: res.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "נרשמת בהצלחה לדילים השבועיים של AliDeals!",
      source,
    });
  } catch (err: any) {
    console.error("[Brevo Newsletter] Exception:", err);
    return NextResponse.json(
      { success: false, error: err.message || "שגיאה פנימית בהרשמה" },
      { status: 500 }
    );
  }
}
