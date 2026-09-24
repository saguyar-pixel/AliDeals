import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { getApiKeyAsync } from "@/lib/gemini/client";

export async function GET() {
  return handleTest();
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const customKey = body?.geminiApiKey?.trim();
  return handleTest(customKey);
}

async function handleTest(providedKey?: string) {
  try {
    const key = (providedKey && providedKey.length > 5 && !providedKey.includes("placeholder"))
      ? providedKey
      : await getApiKeyAsync();

    if (!key || key.length < 5 || key.includes("placeholder")) {
      return NextResponse.json(
        {
          success: false,
          message: "לא הוגדר מפתח Gemini API. אנא הזן מפתח תקין ולחץ על שמירה או בדיקה.",
        },
        { status: 400 }
      );
    }

    const aiClient = new GoogleGenAI({ apiKey: key });

    // Test with the standard Gemini 2.5 Flash model
    const testResult = await aiClient.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "אימות חיבור קצרצר. ענה במילה אחת: פעיל.",
    });

    const reply = testResult.text?.trim() || "";

    return NextResponse.json({
      success: true,
      message: "החיבור ל-Gemini API (gemini-2.5-flash) הצליח והמודל פעיל!",
      model: "gemini-2.5-flash",
      reply,
    });
  } catch (err: any) {
    console.error("Gemini connection test failed:", err);
    let userMsg = "שגיאה בחיבור ל-Gemini API: " + (err?.message || String(err));
    const statusStr = String(err?.status || err?.code || "");
    const errText = String(err?.message || "");

    if (statusStr.includes("400") || errText.includes("API_KEY_INVALID") || errText.includes("API key not valid")) {
      userMsg = "מפתח ה-API שהוזן אינו תקין (Invalid API Key). ודא שהעתקת מפתח תקין מ-Google AI Studio.";
    } else if (statusStr.includes("403") || errText.includes("PERMISSION_DENIED")) {
      userMsg = "אין הרשאה לשימוש במפתח זה או שהגישה ל-Gemini API חסומה בפרויקט.";
    } else if (statusStr.includes("429") || errText.includes("RESOURCE_EXHAUSTED")) {
      userMsg = "הגעת למגבלת הקריאות (Rate Limit) של Gemini. נסה שוב בעוד דקה.";
    } else if (statusStr.includes("404") || errText.includes("NOT_FOUND")) {
      userMsg = "המודל gemini-2.5-flash אינו נגיש עבור מפתח זה.";
    }

    return NextResponse.json(
      {
        success: false,
        message: userMsg,
        details: errText,
      },
      { status: 500 }
    );
  }
}
