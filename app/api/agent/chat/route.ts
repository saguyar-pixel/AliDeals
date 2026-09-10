import { NextRequest, NextResponse } from "next/server";
import {
  saveOrchestratorMessage,
  clearOrchestratorMessages,
  executeMultiAgentProductJob,
  addAgentLog,
} from "@/lib/agent/team-orchestrator";
import { loadCadenceBudget, updateCadenceTargets } from "@/lib/agent/cadence-manager";
import { runDanaCroAnalysis } from "@/lib/analytics/cro-engine";
import { addBacklogTask } from "@/lib/agent/backlog-manager";

export async function POST(req: NextRequest) {
  try {
    const { text, category, visualPreference = "infographic" } = await req.json();
    if (!text || !text.trim()) {
      return NextResponse.json({ error: "Missing message text" }, { status: 400 });
    }

    const trimmed = text.trim();
    const now = new Date().toLocaleTimeString("he-IL", { hour12: false });

    // 1. Save user message
    saveOrchestratorMessage({
      id: `user_${Date.now()}`,
      sender: "user",
      text: trimmed,
      timestamp: now,
    });

    // 2. Check for URL to process product
    const hasAliLink = trimmed.includes("aliexpress.com") || /^\d{10,20}$/.test(trimmed);

    if (hasAliLink) {
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/) || [trimmed];
      const targetUrl = urlMatch[0];

      saveOrchestratorMessage({
        id: `orch_ack_${Date.now()}`,
        sender: "orchestrator",
        text: `קיבלתי את הקישור! 🚀 הצוות מתחיל בעבודה:\n- דנה מנתחת מפרט ו-RPC\n- רון כותב סקירה ו-GEO\n- מיה מכינה ויז'ואל (העדפה: ${visualPreference === "lifestyle_woman" ? "תמונת שימוש אישה" : visualPreference === "lifestyle_man" ? "תמונת שימוש גבר" : "אינפוגרפיקת SVG"})\n- עומר וגל בודקים QA, שקע ו-Core Web Vitals.\n\nעקוב אחרי הלוג החי בצד!`,
        timestamp: now,
      });

      // Execute job in background
      executeMultiAgentProductJob(targetUrl, category || "אלקטרוניקה וגאדג'טים", visualPreference).catch((e) => {
        console.error("Multi-agent job error:", e);
      });

      return NextResponse.json({ success: true, action: "job_started" });
    }

    // 3. Dynamic Quota Increase Commands
    const quotaMatch = trimmed.match(/תעלה.*?מכסה.*?(\d+)/) || trimmed.match(/יעד.*?יומי.*?(\d+)/);
    if (quotaMatch && quotaMatch[1]) {
      const newTarget = parseInt(quotaMatch[1], 10);
      updateCadenceTargets(newTarget);
      const reply = `קיבלתי! עדכנתי את היעד היומי ל-**${newTarget} מוצרים ביום**. הצוות יתאים את קצב העבודה, ועדיין נשמור על מגבלות ה-Free Tier של Gemini.`;

      saveOrchestratorMessage({
        id: `orch_reply_${Date.now()}`,
        sender: "orchestrator",
        text: reply,
        timestamp: now,
      });
      addAgentLog("orchestrator", "אלון", "success", `היעד היומי עודכן לבקשת המרקטר: ${newTarget} מוצרים ביום.`);

      return NextResponse.json({ success: true, action: "quota_updated", reply });
    }

    // 4. Inquiries about CRO & $100/day goal
    let responseText = "";
    const analytics = runDanaCroAnalysis();
    const budget = loadCadenceBudget();

    if (trimmed.includes("100") || trimmed.includes("יעד") || trimmed.includes("רווח") || trimmed.includes("rpc")) {
      responseText = `🎯 **דוח התקדמות ליעד 100$ ליום (מאת דנה - אנליסטית):**\n\n` +
        `- רווח יומי מוערך כעת: **$${analytics.dailyRevenueEstimateUsd}** מתוך **$100.00** (${analytics.progressToGoalPercent}% מהיעד)\n` +
        `- סך צפיות אורגניות מנוטרות: **${analytics.totalViews.toLocaleString()}**\n` +
        `- CTR ממוצע לקליק אפיליאציה: **${analytics.averageCtrPercent}%**\n` +
        `- RPC ממוצע: **$0.28 לכל קליק יוצא**\n\n` +
        `💡 **ההמלצה החמה של דנה כרגע:** ${analytics.recommendations[0]?.recommendationHe || "להוסיף סקירות נוספות בקטגוריית 30$-60$ עם עמלות של 8%+"}`;
    } else if (trimmed.includes("המלצות") || trimmed.includes("cro") || trimmed.includes("דנה") || trimmed.includes("שיפור")) {
      responseText = `🔍 **3 המלצות ה-CRO המובילות של דנה וגל לשיפור האתר:**\n\n` +
        analytics.recommendations
          .map(
            (r, i) => `${i + 1}. **${r.pageTitle}:** ${r.issueHe}\n   👉 *המלצה לפעולה:* ${r.recommendationHe} (${r.expectedRpmBoost})`
          )
          .join("\n\n");
    } else if (trimmed.includes("סרץ") || trimmed.includes("קונסול") || trimmed.includes("gsc") || trimmed.includes("מילות מפתח") || trimmed.includes("ביטויים")) {
      const { getGscQueries } = await import("@/lib/analytics/gsc-connector");
      const gscQueries = getGscQueries();
      const striking = gscQueries.filter((q) => q.opportunityType === "striking_distance");
      responseText = `📊 **דוח מילות מפתח מ-Google Search Console (מאת דנה ורון):**\n\n` +
        `אותרו **${striking.length} ביטויי מפתח בהזדמנות פריצה לעמוד הראשון בגוגל (מיקומים 4-10):**\n\n` +
        striking
          .map(
            (q, i) =>
              `${i + 1}. **"${q.query}"** (מיקום: ${q.position}, ${q.impressions} הופעות, CTR: ${q.ctr}%)\n   👉 *המלצת רון (SEO):* לחדד את כותרת ה-SEO ב-\`${q.pageUrl}\` כדי להקפיץ את הדירוג לשלישייה הפותחת ולתפוס את כל הקליקים!`
          )
          .join("\n\n");
    } else {
      // Check if Gemini API Key is available for real dynamic responses
      if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5) {
        try {
          const { ai, GEMINI_MODEL } = await import("@/lib/gemini/client");
          const aiResponse = await ai.models.generateContent({
            model: GEMINI_MODEL,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `אתה אלון, ראש צוות סוכני ה-AI של פלטפורמת האפיליאציה AliDeals (ישראל).
הצוות שלך כולל את דנה (אנליסטית CRO), רון (קופירייטר SEO ו-GEO), מיה (קריאייטיב ואינפוגרפיקות), עומר (בקרת שקעים ותקרת מכס 75$) וגל (מהנדס אתר).
היעד העסקי המרכזי: הגעה ל-$100 ביום מעמלות אפיליאציה באלי אקספרס.

פניית המשתמש / המרקטר: "${trimmed}"
השב בעברית שיווקית, עניינית ומעשית. אם הוא שואל לגבי מוצר או רעיון, תן המלצות ספציפיות לישראל (שקע EU, פטור מכס עד $75, ספקים אמינים).`
                  }
                ]
              }
            ],
            config: {
              temperature: 0.7,
            }
          });

          if (aiResponse.text) {
            responseText = aiResponse.text;
          }
        } catch (geminiErr) {
          console.warn("Gemini dynamic chat fallback:", geminiErr);
        }
      }

      if (!responseText) {
        responseText = `היי! צוות הסוכנים (אלון, דנה, רון, מיה, עומר וגל) פועל במרץ כדי להביא את האתר ל-**$100 ביום**.\n\nאפשרויות זמינות:\n- הדבק קישור מאלי אקספרס להפקת סקירה + אינפוגרפיקה.\n- כתוב *"התקדמות ליעד"* לצפייה בדוח ההכנסות וה-RPC של דנה.\n- כתוב *"המלצות CRO"* לצפייה בהזדמנויות שיפור ההמרה של גל ודנה.\n- כתוב *"תעלה מכסה ל-X"* לשינוי מספר המוצרים היומי.`;
      }
    }

    saveOrchestratorMessage({
      id: `orch_reply_${Date.now()}`,
      sender: "orchestrator",
      text: responseText,
      timestamp: now,
    });

    addAgentLog("orchestrator", "אלון", "info", `מענה למשתמש: "${responseText.slice(0, 50)}..."`);

    return NextResponse.json({
      success: true,
      action: "message_sent",
      reply: responseText,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const freshMessages = clearOrchestratorMessages();
    addAgentLog("orchestrator", "אלון", "info", "היסטוריית השיחה אופסה לבקשת המשתמש. התחלת שיחה חדשה.");
    return NextResponse.json({ success: true, messages: freshMessages });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reset chat";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
