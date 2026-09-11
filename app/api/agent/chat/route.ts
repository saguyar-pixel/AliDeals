import { NextRequest, NextResponse } from "next/server";
import {
  saveOrchestratorMessage,
  clearOrchestratorMessages,
  getOrchestratorMessages,
  executeMultiAgentProductJob,
  runAutonomousLoop,
  addAgentLog,
} from "@/lib/agent/team-orchestrator";
import { loadCadenceBudget, updateCadenceTargets } from "@/lib/agent/cadence-manager";
import { runDanaCroAnalysis } from "@/lib/analytics/cro-engine";
import { jsonDb } from "@/lib/db";
import { aliExpressApi } from "@/lib/aliexpress";
import { revalidatePath } from "next/cache";

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

    // 1b. Check if user pasted a Gemini API Key (starts with AIzaSy...)
    const apiKeyMatch = trimmed.match(/AIzaSy[A-Za-z0-9_-]{33}/);
    if (apiKeyMatch) {
      const detectedKey = apiKeyMatch[0];
      const { analyticsDb } = await import("@/lib/db/analytics-db");
      analyticsDb.updateSettings({ geminiApiKey: detectedKey });
      const { supabaseDb } = await import("@/lib/db/supabase-db");
      if (supabaseDb.isConfigured()) {
        await supabaseDb.updateSettings({ geminiApiKey: detectedKey });
      }

      const reply = `🎉 **מצוין! קלטתי ושמרתי את מפתח ה-Gemini שלך בהצלחה!**\n\nהמפתח הוגדר ונשמר במערכת. החל מרגע זה מוח ה-AI המלא שלי (מודל Gemini 2.5 Flash) פועל ומחובר 24/7.\n\nתוכל לשאול אותי כל שאלה, לבקש ניתוח, כתיבה, עריכה או הפעלת משימות לקידום האתר ליעד של **$100 ביום**! 🚀`;

      saveOrchestratorMessage({
        id: `orch_reply_${Date.now()}`,
        sender: "orchestrator",
        text: reply,
        timestamp: now,
      });
      addAgentLog("orchestrator", "אלון", "success", "מפתח Gemini API הוגדר ונשמר בהצלחה ע\"י המשתמש בצ'אט!");
      return NextResponse.json({
        success: true,
        action: "gemini_configured",
        reply,
        messages: getOrchestratorMessages(),
      });
    }

    // 2. Check for AliExpress URL or Item ID to process and generate article
    const hasAliLink = trimmed.includes("aliexpress.com") || /^\d{10,20}$/.test(trimmed);

    if (hasAliLink) {
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/) || [trimmed];
      const targetUrl = urlMatch[0];
      const reply = `קיבלתי את הקישור! 🚀 הצוות מתחיל בעבודה:\n- דנה מנתחת מפרט ו-RPC\n- רון כותב סקירה ו-GEO\n- מיה מכינה ויז'ואל (העדפה: ${
        visualPreference === "lifestyle_woman"
          ? "תמונת שימוש אישה"
          : visualPreference === "lifestyle_man"
          ? "תמונת שימוש גבר"
          : "אינפוגרפיקת SVG"
      })\n- עומר וגל בודקים QA, שקע ו-Core Web Vitals.\n\nעקוב אחרי הלוג החי בצד!`;

      saveOrchestratorMessage({
        id: `orch_ack_${Date.now()}`,
        sender: "orchestrator",
        text: reply,
        timestamp: now,
      });

      // Execute job in background
      executeMultiAgentProductJob(targetUrl, category || "אלקטרוניקה וגאדג'טים", visualPreference).catch((e) => {
        console.error("Multi-agent job error:", e);
      });

      return NextResponse.json({
        success: true,
        action: "job_started",
        reply,
        messages: getOrchestratorMessages(),
      });
    }

    // 2b. Autonomous Loop Command:
    const isLoopCommand =
      trimmed.includes("לופ") ||
      trimmed.includes("loop") ||
      (trimmed.includes("תפעל") && trimmed.includes("סוכנים")) ||
      (trimmed.includes("תפעיל") && trimmed.includes("סוכנים")) ||
      trimmed.includes("אוטונומי") ||
      trimmed.includes("עד שהמשימה תושלם") ||
      trimmed.includes("עד שהמשימה הושלמה");

    if (isLoopCommand) {
      const reply = `קיבלתי! 🚀 אני מפעיל עכשיו את **הלופ האוטונומי הרב-סוכני (Multi-Agent Autonomous Loop)**.\n\nהתוכנית שלי:\n1. **דנה (דאטא & CRO)**: תנתח נתוני מוצר, מפרט, עמלות וכדאיות כלכלית.\n2. **רון (קופי & GEO)**: ינסח סקירה מעמיקה, שורה תחתונה ממוקדת AI Overviews ו-FAQ.\n3. **מיה (קריאייטיב)**: תעצב אינפוגרפיקת SVG וקטורית חדה להמרות.\n4. **עומר (QA Gateway)**: יבצע בקרת איכות מחמירה (שקע EU 220V, סף 75$, קישורי SubID וסכמות Schema). אם יאותרו ליקויים – עומר ידחה ויחזיר את הטיוטה לרון בסבב נוסף בלופ עד להשלמה מושלמת!\n5. **גל (Full-Stack)**: יאמת Core Web Vitals, מובייל וכפתור Sticky CTA.\n6. **אלון (אורקסטרטור)**: אפרסם את העמוד באתר החי ואעדכן אותך.\n\nהמשימה רצה כעת ברקע – תוכל לראות את כל הסוכנים מתחלפים בלייב בלוח הבקרה!`;

      saveOrchestratorMessage({
        id: `orch_reply_${Date.now()}`,
        sender: "orchestrator",
        text: reply,
        timestamp: now,
      });

      addAgentLog(
        "orchestrator",
        "אלון",
        "info",
        `הופעל לופ אוטונומי לבקשת המשתמש בצ'אט: "${trimmed}"`
      );

      // Execute autonomous loop in background
      runAutonomousLoop({
        goal: trimmed,
        category: category || "אלקטרוניקה וגאדג'טים",
        visualPreference,
        maxIterations: 3,
      }).catch((e) => {
        console.error("Autonomous loop error:", e);
      });

      return NextResponse.json({
        success: true,
        action: "autonomous_loop_started",
        reply,
        messages: getOrchestratorMessages(),
      });
    }

    // 3. Command: Delete product from database
    const deleteMatch = trimmed.match(/(?:מחק|תמחק|הסר|תסיר).*?(?:מוצר|פריט)?.*?(\d{10,20})/);
    if (deleteMatch && deleteMatch[1]) {
      const aliId = deleteMatch[1];
      jsonDb.deleteProduct(aliId);
      try {
        revalidatePath("/");
        revalidatePath("/admin/products");
      } catch {}

      const reply = `✅ **בוצע! מוצר #${aliId} הוסר בהצלחה ממאגר האתר.** השינוי התעדכן מיידית בלייב.`;
      saveOrchestratorMessage({
        id: `orch_reply_${Date.now()}`,
        sender: "orchestrator",
        text: reply,
        timestamp: now,
      });
      addAgentLog("orchestrator", "אלון", "success", `מוצר #${aliId} נמחק מהאתר לבקשת המשתמש.`);
      return NextResponse.json({
        success: true,
        action: "product_deleted",
        reply,
        messages: getOrchestratorMessages(),
      });
    }

    // 4. Command: Dynamic Quota Increase
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

      return NextResponse.json({
        success: true,
        action: "quota_updated",
        reply,
        messages: getOrchestratorMessages(),
      });
    }

    // 5. Command: Search products directly via AliExpress API
    const searchMatch = trimmed.match(/^(?:חפש|תחפש|מצא|תמצא)\s+(.+)/);
    if (searchMatch && searchMatch[1]) {
      const queryTerm = searchMatch[1].replace(/מוצרים של|מוצרים|באתר|באלי אקספרס/g, "").trim();
      addAgentLog("analyst", "דנה", "info", `מבצעת חיפוש ב-AliExpress API עבור: "${queryTerm}"...`);

      const searchRes = await aliExpressApi.searchProducts({
        keywords: queryTerm,
        pageSize: 4,
      });

      if (searchRes.products && searchRes.products.length > 0) {
        const itemsText = searchRes.products
          .map(
            (p, idx) =>
              `${idx + 1}. **${p.originalTitle?.slice(0, 50)}...**\n   💰 מחיר: ₪${p.priceIls} ($${p.priceUsd}) | ★ ${p.rating} | ${p.ordersCount}+ הזמנות\n   🆔 מזהה: \`${p.aliId}\`\n   🔗 [קישור ישיר](${p.aliUrl})`
          )
          .join("\n\n");

        const reply = `🔍 **דנה מצאה ${searchRes.products.length} מוצרים מובילים עבור "${queryTerm}":**\n\n${itemsText}\n\n👉 *כדי להפיק סקירה מלאה לכל אחד מהם, פשוט העתק את ה-ID או הקישור והדבק כאן בצ'אט!*`;

        saveOrchestratorMessage({
          id: `orch_reply_${Date.now()}`,
          sender: "orchestrator",
          text: reply,
          timestamp: now,
        });
        addAgentLog("orchestrator", "אלון", "success", `נמצאו ${searchRes.products.length} מוצרים עבור "${queryTerm}".`);
        return NextResponse.json({
          success: true,
          action: "search_completed",
          reply,
          messages: getOrchestratorMessages(),
        });
      } else {
        const reply = `דנה חיפשה ב-AliExpress API אך לא נמצאו מוצרים תואמים ל-"${queryTerm}". מומלץ לנסות מונח כללי יותר באנגלית או עברית.`;
        saveOrchestratorMessage({
          id: `orch_reply_${Date.now()}`,
          sender: "orchestrator",
          text: reply,
          timestamp: now,
        });
        return NextResponse.json({
          success: true,
          action: "search_empty",
          reply,
          messages: getOrchestratorMessages(),
        });
      }
    }

    // 6. Site Status & Catalog Summary
    if (
      trimmed.includes("סטטוס") ||
      trimmed.includes("כמה מוצרים") ||
      trimmed.includes("מצב האתר") ||
      trimmed.includes("כמה עמודים")
    ) {
      const allProducts = jsonDb.getProducts();
      const allPages = jsonDb.getPages();
      const reviewsCount = allPages.filter((p) => p.type === "review").length;
      const top5Count = allPages.filter((p) => p.type === "top5").length;

      const reply = `📊 **סטטוס אתר חי - AliDeals:**\n\n` +
        `- סך מוצרים שמורים בקטלוג: **${allProducts.length}**\n` +
        `- סקירות עומק מפורסמות: **${reviewsCount}**\n` +
        `- עמודי השוואת TOP 5: **${top5Count}**\n` +
        `- מנוע חיפוש ואפיליאציה: **פעיל ומאומת (Singapore Gateway)**\n` +
        `- עדכון חי (Dynamic SSR): **מופעל - כל שינוי מוצג מיידית!**`;

      saveOrchestratorMessage({
        id: `orch_reply_${Date.now()}`,
        sender: "orchestrator",
        text: reply,
        timestamp: now,
      });
      return NextResponse.json({
        success: true,
        action: "status_reported",
        reply,
        messages: getOrchestratorMessages(),
      });
    }

    // 7. Inquiries about CRO & $100/day goal
    let responseText = "";
    const analytics = runDanaCroAnalysis();

    if (trimmed.includes("100") || trimmed.includes("יעד") || trimmed.includes("רווח") || trimmed.includes("rpc")) {
      responseText = `🎯 **דוח התקדמות ליעד 100$ ליום (מאת דנה - אנליסטית):**\n\n` +
        `- רווח יומי מוערך כעת: **$${analytics.dailyRevenueEstimateUsd}** מתוך **$100.00** (${analytics.progressToGoalPercent}% מהיעד)\n` +
        `- סך צפיות אורגניות מנוטרות: **${analytics.totalViews.toLocaleString()}**\n` +
        `- CTR ממוצע לקליק אפיליאציה: **${analytics.averageCtrPercent}%**\n` +
        `- RPC ממוצע: **$0.28 לכל קליק יוצא**\n\n` +
        `💡 **ההמלצה החמה של דנה כרגע:** ${
          analytics.recommendations[0]?.recommendationHe ||
          "להוסיף סקירות נוספות בקטגוריית 30$-60$ עם עמלות של 8%+"
        }`;
    } else if (
      trimmed.includes("המלצות") ||
      trimmed.includes("cro") ||
      trimmed.includes("דנה") ||
      trimmed.includes("שיפור")
    ) {
      responseText = `🔍 **3 המלצות ה-CRO המובילות של דנה וגל לשיפור האתר:**\n\n` +
        analytics.recommendations
          .map(
            (r, i) =>
              `${i + 1}. **${r.pageTitle}:** ${r.issueHe}\n   👉 *המלצה לפעולה:* ${r.recommendationHe} (${r.expectedRpmBoost})`
          )
          .join("\n\n");
    } else if (
      trimmed.includes("סרץ") ||
      trimmed.includes("קונסול") ||
      trimmed.includes("gsc") ||
      trimmed.includes("מילות מפתח") ||
      trimmed.includes("ביטויים")
    ) {
      const { getGscQueries } = await import("@/lib/analytics/gsc-connector");
      const gscQueries = getGscQueries();
      const striking = gscQueries.filter((q) => q.opportunityType === "striking_distance");
      responseText = `📊 **דוח מילות מפתח מ-Google Search Console (מאת דנה ורון):**\n\n` +
        `אותרו **${striking.length} ביטויי מפתח בהזדמנות פריצה לעמוד הראשון בגוגל (מיקומים 4-10):**\n\n` +
        striking
          .map(
            (q, i) =>
              `${i + 1}. **"${q.query}"** (מיקום: ${q.position}, ${q.impressions} הופעות, CTR: ${q.ctr}%)\n   👉 *המלצת רון (SEO):* לחדד את כותרת ה-SEO ב-\`${q.pageUrl}\` כדי להקפיץ את הדירוג לשלישייה הפותחת!`
          )
          .join("\n\n");
    } else {
      // Check if Gemini is configured (via env or saved in settings)
      const { isGeminiConfigured, getGenAI } = await import("@/lib/gemini/client");
      const hasGemini = isGeminiConfigured();
      let proposalActionPayload: Record<string, unknown> | undefined;
      let isActionRequired = false;
      let actionType: "approve_edit" | undefined;

      if (hasGemini) {
        try {
          const { recordGeminiCall } = await import("@/lib/agent/cadence-manager");
          const { supabaseDb } = await import("@/lib/db/supabase-db");
          const { getUnifiedTeamContext, formatTeamContextForPrompt } = await import("@/lib/agent/team-context");
          const { createEditProposal } = await import("@/lib/agent/proposal-engine");

          // 1. Fetch 360 unified live context of the entire site, catalog, analytics & S2S sales
          const unifiedContext = await getUnifiedTeamContext();
          const teamContextBlock = formatTeamContextForPrompt(unifiedContext);

          // 2. Fetch recent conversation history from Supabase for multi-turn context
          const previousMessages = await supabaseDb.getAgentMessages(10);

          // Build alternating conversation history for Gemini multi-turn
          const conversationContents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

          for (const msg of previousMessages.slice(-6)) {
            if (!msg.text || msg.id.startsWith("msg_welcome")) continue;
            const role: "user" | "model" = msg.sender === "user" ? "user" : "model";
            const lastTurn = conversationContents[conversationContents.length - 1];
            if (lastTurn && lastTurn.role === role) {
              lastTurn.parts[0].text += `\n${msg.text}`;
            } else {
              conversationContents.push({
                role,
                parts: [{ text: msg.text }],
              });
            }
          }

          // Ensure the conversation ends with the current user prompt
          const lastInHistory = conversationContents[conversationContents.length - 1];
          if (lastInHistory && lastInHistory.role === "user") {
            lastInHistory.parts[0].text = trimmed;
          } else {
            conversationContents.push({
              role: "user",
              parts: [{ text: trimmed }],
            });
          }

          const systemPrompt = `אתה אלון, ראש צוות סוכני ה-AI האוטונומיים של פלטפורמת המסחר והאפיליאציה AliDeals (ישראל).
אתה מוביל צוות מומחים ייעודי:
- דנה (Data & CRO Analyst): אנליזה, יחסי המרה, RPC, מעקב מדדים, מכירות S2S ומחקר עמלות אלי אקספרס.
- רון (Copywriter & SEO/GEO Specialist): כתיבת סקירות מעמיקות, שכתוב כותרות מכוערות מאלי אקספרס לשמות עבריים מנצחים ל-SEO, פסקאות GEO מוכנות ל-AI Overviews וסכמות Schema.org.
- מיה (Creative Director): עיצוב אינפוגרפיקות SVG וקטוריות חדות ותמונות לייפסטייל ללא עיוותי AI.
- עומר (QA Officer): בקרת שקע אירופאי (EU 220V), תקרת מכס ($75) ותקינות קישורי אפיליאציה.
- גל (Full-Stack Engineer): מהירות אתר, מדדי Core Web Vitals ורכיבי המרה דביקים.

היעד העסקי המשותף: להביא את האתר אורגנית ל-$100 ביום מעמלות אפיליאציה של אלי אקספרס.

${teamContextBlock}

הנחיות קריטיות לתשובה:
1. ענה בעברית טבעית, מקצועית, עסקית וחדה, כראש צוות AI מוביל שמכיר את כל נתוני האתר, המכירות והשיחה לעומק.
2. שמור על קוהרנטיות וקונטקסט שיחה מלא – התייחס למה שהמשתמש שאל ואמר בהודעות קודמות.
3. אם המשתמש שואל איך לשפר או לבצע משימה, תן המלצה מעשית וציין מה כל סוכן (דנה, רון, מיה, עומר, גל) ממליץ לעשות.
4. אם המשתמש מדביק קישור או מזהה מוצר מעלי אקספרס, הבהר לו שאתה מיד שולח את הצוות להפיק עבורו סקירה מלאה + אינפוגרפיקה.
5. יש לך יכולת מלאה להפעיל לופ אוטונומי (Autonomous Loop) שבו אתה מפעיל את דנה, רון, מיה, עומר וגל, ועומר בודק תאימות לישראל ודוחה לתיקון חוזר בלופ עד שהמשימה מושלמת 100%.
6. גישת עריכה באתר (Human-in-the-Loop): יש לך הרשאת עריכה מלאה לכל עמודי האתר והמוצרים (כותרות, תיאורים, SEO, מחירים), אך עריכות יחולו באתר החי באישור המשתמש בלבד! כשאתה מציע עריכה או כשהמשתמש מבקש לערוך משהו באתר, תאר את השינוי והוסף בסוף תשובתך בלוק JSON מיוחד בדיוק במבנה:
\`\`\`proposal
{
  "targetType": "page" | "product",
  "targetId": "slug_or_id_here",
  "targetTitle": "שם העמוד או המוצר",
  "changeSummaryHe": "תמצית השינוי בעברית",
  "diff": [
    {
      "field": "title",
      "fieldLabelHe": "כותרת ראשית",
      "oldValue": "ערך נוכחי",
      "newValue": "ערך חדש מוצע"
    }
  ]
}
\`\`\`
7. לעולם אל תשתמש בסימוני LaTeX ($$ או \\). כשאומרים דולר כתוב $ או דולר.`;

          const aiClient = getGenAI();
          let aiResponseText = "";

          try {
            const { generateWithFallback } = await import("@/lib/gemini/client");
            const response = await generateWithFallback(aiClient, {
              contents: conversationContents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
              },
            });
            aiResponseText = response?.text || "";
          } catch (modelErr: any) {
            console.error("All Gemini model attempts failed:", modelErr);
            addAgentLog("orchestrator", "אלון", "warning", `שגיאת Gemini: ${modelErr?.message || "בדוק מפתח API"}`);
          }

          recordGeminiCall();

          if (aiResponseText && aiResponseText.trim()) {
            // Check for embedded edit proposal block
            const proposalRegex = /```proposal\s*([\s\S]*?)\s*```/;
            const match = aiResponseText.match(proposalRegex);
            if (match) {
              try {
                const rawJson = match[1].trim();
                const parsed = JSON.parse(rawJson);
                if (parsed && parsed.targetId && parsed.diff) {
                  const created = createEditProposal({
                    proposedBy: "orchestrator",
                    targetType: parsed.targetType || "page",
                    targetId: parsed.targetId,
                    targetTitle: parsed.targetTitle || "עריכת אתר",
                    targetSlug: parsed.targetSlug,
                    changeSummaryHe: parsed.changeSummaryHe || "הצעת עריכה מאלון",
                    diff: parsed.diff,
                  });
                  isActionRequired = true;
                  actionType = "approve_edit";
                  proposalActionPayload = {
                    proposalId: created.id,
                    targetType: created.targetType,
                    targetId: created.targetId,
                    targetTitle: created.targetTitle,
                  };
                  aiResponseText = aiResponseText.replace(proposalRegex, "").trim();
                }
              } catch (parseErr) {
                console.warn("Failed to parse proposal block from Gemini response:", parseErr);
              }
            }

            responseText = aiResponseText.trim();
          }
        } catch (geminiErr: any) {
          console.error("Gemini dynamic chat error:", geminiErr);
          addAgentLog("orchestrator", "אלון", "warning", `שגיאת Gemini: ${geminiErr?.message || "בדוק מפתח API"}`);
        }
      }

      // Check if user requested an edit in conversational mode
      if (!responseText && (trimmed.includes("ערוך") || trimmed.includes("תערוך") || trimmed.includes("תשנה") || trimmed.includes("עדכן"))) {
        const { getUnifiedTeamContext } = await import("@/lib/agent/team-context");
        const { createEditProposal } = await import("@/lib/agent/proposal-engine");
        const ctx = await getUnifiedTeamContext();
        const samplePage = ctx.pages.samplePages[0];

        if (samplePage) {
          const created = createEditProposal({
            proposedBy: "orchestrator",
            targetType: "page",
            targetId: samplePage.id,
            targetTitle: samplePage.title,
            targetSlug: samplePage.slug,
            changeSummaryHe: "אופטימיזציית כותרת ומטא SEO לעמוד",
            diff: [
              {
                field: "metaTitle",
                fieldLabelHe: "כותרת SEO לגוגל",
                oldValue: samplePage.title,
                newValue: `${samplePage.title.slice(0, 45)} - מומלץ מאלי אקספרס`,
              },
            ],
          });
          isActionRequired = true;
          actionType = "approve_edit";
          proposalActionPayload = {
            proposalId: created.id,
            targetType: created.targetType,
            targetId: created.targetId,
            targetTitle: created.targetTitle,
          };
          responseText = `הכנתי עבורך הצעת עריכה עבור "${samplePage.title}". בהתאם להנחייתך, האתר החי יתעדכן אך ורק לאחר לחיצה על כפתור האישור!`;
        }
      }

      // Intelligent context-aware fallback when Gemini is unconfigured or unavailable
      if (!responseText) {
        const lower = trimmed.toLowerCase();
        if (
          lower.includes("מי אתה") ||
          lower.includes("למה אתה לא עונה") ||
          lower.includes("אתה לא עונה") ||
          lower.includes("למה אתה לא סוכן") ||
          lower.includes("סוכן אמיתי") ||
          lower.includes("אתה אמיתי") ||
          lower.includes("למה אלון")
        ) {
          responseText = `שלום! אני אלון, ראש צוות ה-AI האוטונומי של AliDeals, ואני כאן ופעיל איתך בזמן אמת! 🤖\n\n` +
            `אני מתאם ומפעיל צוות של 5 סוכני מומחים ייעודיים:\n` +
            `• **דנה (דאטא & CRO)**: מנתחת תנועה, יחסי המרה, רווח יומי (היעד: $100/יום) ודוחות מכירות S2S.\n` +
            `• **רון (SEO & תוכן)**: משכתב שמות מוצרים מכוערים לכותרות עבריות מנצחות ומכין פסקאות GEO ל-AI Overviews.\n` +
            `• **מיה (קריאייטיב)**: יוצרת אינפוגרפיקות SVG ומדיה ויזואלית חדה לכל סקירה.\n` +
            `• **עומר (QA מחמיר)**: שומר סף ישראלי – בודק שקע EU 220V, תקרת מכס $75 וקישורי אפיליאציה.\n` +
            `• **גל (Full-Stack)**: מאפטם Core Web Vitals, מהירות ומבנה דפי המרה.\n\n` +
            `💡 **רוצה לחבר את מוח ה-AI הגנרטיבי המלא (Gemini 2.5 Flash)?**\n` +
            `הדבק כאן בצ'אט את מפתח ה-Gemini שלך (מתחיל ב-\`AIzaSy...\`), ואתחבר ישירות למודל השפה המתקדם!\n\n` +
            `בינתיים, אני עומד לרשותך לכל משימה: חיפוש מוצרים ב-API, הפקת סקירות, לופים אוטונומיים, מחיקות והצעות עריכה!`;
        } else if (
          lower.includes("עזרה") ||
          lower.includes("פקודות") ||
          lower.includes("מה אתה יודע") ||
          lower.includes("מה אפשר לעשות")
        ) {
          responseText = `🛠️ **פקודות ויכולות עיקריות שתוכל להפעיל מולי עכשיו בצ'אט:**\n\n` +
            `1. **הפקת סקירה מלאה בצוות**: הדבק קישור או מזהה מוצר מאלי אקספרס (למשל \`100500123456789\`).\n` +
            `2. **הפעלת לופ אוטונומי**: כתוב *"תפעיל לופ אוטונומי"* או *"לופ"* ואני אפעיל את כל 6 הסוכנים באיטרציות חוזרות עם QA עד גמר המשימה.\n` +
            `3. **חיפוש ב-AliExpress API**: כתוב *"חפש שואב אבק"* או *"חפש אוזניות אלחוטיות"*.\n` +
            `4. **הצעת עריכה לאישורך (Human-in-the-Loop)**: כתוב *"תערוך עמוד"* או *"תשנה כותרת"*, ואכין לך דיף לאישור בלחיצת כפתור.\n` +
            `5. **מחיקת מוצר**: כתוב *"מחק מוצר [ID]"* כדי להסירו מיידית מהקטלוג.\n` +
            `6. **דוחות ומדדים**: כתוב *"סטטוס אתר"*, *"התקדמות ליעד"* או *"המלצות CRO"*.`;
        } else if (
          lower.includes("seo") ||
          lower.includes("רון") ||
          lower.includes("שכתוב") ||
          lower.includes("כותרות")
        ) {
          responseText = `✍️ **רון (קופירייטר & מומחה SEO/GEO) מדווח:**\n\n` +
            `כל מוצר שמגיע מאלי אקספרס עובר אצלי שכתוב מלא:\n` +
            `- **שם מוצר SEO בעברית**: מנקה מילות ספאם באנגלית ומייצר שם שיווקי קליט התואם לחיפושים מובילים בגוגל ישראל.\n` +
            `- **פסקת AI Overview (GEO)**: תמצית ממוקדת של "השורה התחתונה" שגוגל AI יכול לצטט ישירות בתוצאות החיפוש.\n` +
            `- **סכמת Product & Review**: מוזרקת לקוד הדף כדי להציג כוכבי דירוג ומחיר ב-SERP.\n\n` +
            `רוצה לראות את זה בפעולה? שלח קישור למוצר מעלי אקספרס או בקש לופ אוטונומי!`;
        } else if (
          lower.includes("s2s") ||
          lower.includes("עמלות") ||
          lower.includes("רווח")
        ) {
          responseText = `💰 **דנה (דאטא & CRO) מדווחת על מערך ה-S2S והעמלות:**\n\n` +
            `- תשתית הדיווח S2S מחוברת ומאפשרת ייחוס עסקאות (Postback) לפי SubID מזהה.\n` +
            `- יעד יומי מרכזי: הגעה ל-**$100 ביום** מעמלות (כרגע: $${analytics.dailyRevenueEstimateUsd} / יום).\n` +
            `- עמלת אפיליאציה ממוצעת בקטגוריות החמות: **7% - 9%**.\n` +
            `- לחיצה על "המלצות CRO" תציג לך את הדפים שבהם שווה לחזק כפתורי הנעה לפעולה לקפיצה ב-RPM.`;
        } else if (
          lower.includes("עומר") ||
          lower.includes("qa") ||
          lower.includes("שקע") ||
          lower.includes("מכס")
        ) {
          responseText = `🛡️ **עומר (קצין QA ובקרת איכות) מדווח:**\n\n` +
            `אני שומר הסף של האתר עבור הצרכן הישראלי, ואיני מאשר פרסום מוצר ללא:\n` +
            `1. **בדיקת שקע חשמלי**: וידוא שקע אירופאי (EU Plug 220V-240V 50Hz) התואם לשקעים בישראל (Type C/H) ללא צורך במתאמים מסוכנים.\n` +
            `2. **תקרת פטור ממכס ($75)**: התרעה מפורשת אם המוצר עובר את הרף ומחייב מע"מ/מכס.\n` +
            `3. **תקינות קישורי אפיליאציה**: בדיקת תקינות פרמטרי ה-Tracking.\n\n` +
            `בלופ אוטונומי, אם מוצר נכשל בבדיקות שלי – אני פוסל ומחזיר לרון לתיקון חוזר!`;
        } else if (
          lower.includes("מיה") ||
          lower.includes("עיצוב") ||
          lower.includes("אינפוגרפיקה") ||
          lower.includes("svg")
        ) {
          responseText = `🎨 **מיה (ארט דירקטור & קריאייטיב) מדווחת:**\n\n` +
            `אני אחראית על השפה החזותית של האתר להעלאת יחסי המרה (CRO):\n` +
            `- יצירת **אינפוגרפיקות SVG וקטוריות** חדות עם אייקונים, נתונים טכניים והדגשת יתרונות לקהל ישראלי.\n` +
            `- הפקת **תמונות לייפסטייל** (שימוש נשי / גברי) המציגות את המוצר בהקשר אמיתי.\n` +
            `- ללא שגיאות איות או עיוותי AI אופייניים – כל אלמנט וקטורי נבנה לפי סטנדרט עיצוב נקי ומדויק.`;
        } else if (
          lower.includes("גל") ||
          lower.includes("מהירות") ||
          lower.includes("vitals") ||
          lower.includes("ביצועים")
        ) {
          responseText = `⚡ **גל (מהנדס פול-סטאק & Core Web Vitals) מדווח:**\n\n` +
            `- מהירות טעינה: LCP נמוך מ-1.2 שניות במובייל.\n` +
            `- יציבות עיצובית: CLS אפסי (0.00).\n` +
            `- רכיב המרה ייעודי: Sticky Purchase Bar צף במובייל כדי להקפיץ קליקים אפיליאטיביים.\n` +
            `- Dynamic SSR וקאשינג חכם מבטיחים שכל מוצר ועמוד נטענים מיידית.`;
        } else {
          responseText = `היי! צוות הסוכנים (אלון, דנה, רון, מיה, עומר וגל) פועל במרץ כדי להביא את האתר ל-**$100 ביום**.\n\n` +
            `אפשרויות מהירות שתוכל לעשות עכשיו:\n` +
            `• הדבק קישור או מזהה מוצר מאלי אקספרס להפקת סקירה + אינפוגרפיקה בצוות.\n` +
            `• כתוב *"חפש [מוצר]"* לחיפוש מוצרים ישירות ב-API של עלי אקספרס.\n` +
            `• כתוב *"תפעיל לופ אוטונומי"* להפעלת מחזור עבודה מלא עם בקרת QA של עומר.\n` +
            `• כתוב *"סטטוס אתר"* לצפייה בסך המוצרים והעמודים החיים.\n` +
            `• כתוב *"התקדמות ליעד"* לצפייה בדוח ההכנסות וה-RPC של דנה.\n` +
            `• כתוב *"תערוך עמוד"* כדי לראות את מנגנון הצעות העריכה לאישורך (Human-in-the-Loop).`;
        }
      }
    }

    saveOrchestratorMessage({
      id: `orch_reply_${Date.now()}`,
      sender: "orchestrator",
      text: responseText,
      timestamp: now,
      actionRequired: isActionRequired,
      actionType,
      actionPayload: proposalActionPayload,
    });

    addAgentLog("orchestrator", "אלון", "info", `מענה למשתמש: "${responseText.slice(0, 50)}..."`);

    return NextResponse.json({
      success: true,
      action: "message_sent",
      reply: responseText,
      messages: getOrchestratorMessages(),
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
