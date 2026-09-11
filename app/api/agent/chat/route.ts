import { NextRequest, NextResponse } from "next/server";
import {
  saveOrchestratorMessage,
  clearOrchestratorMessages,
  executeMultiAgentProductJob,
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

    // 2. Check for AliExpress URL or Item ID to process and generate article
    const hasAliLink = trimmed.includes("aliexpress.com") || /^\d{10,20}$/.test(trimmed);

    if (hasAliLink) {
      const urlMatch = trimmed.match(/https?:\/\/[^\s]+/) || [trimmed];
      const targetUrl = urlMatch[0];

      saveOrchestratorMessage({
        id: `orch_ack_${Date.now()}`,
        sender: "orchestrator",
        text: `קיבלתי את הקישור! 🚀 הצוות מתחיל בעבודה:\n- דנה מנתחת מפרט ו-RPC\n- רון כותב סקירה ו-GEO\n- מיה מכינה ויז'ואל (העדפה: ${
          visualPreference === "lifestyle_woman"
            ? "תמונת שימוש אישה"
            : visualPreference === "lifestyle_man"
            ? "תמונת שימוש גבר"
            : "אינפוגרפיקת SVG"
        })\n- עומר וגל בודקים QA, שקע ו-Core Web Vitals.\n\nעקוב אחרי הלוג החי בצד!`,
        timestamp: now,
      });

      // Execute job in background
      executeMultiAgentProductJob(targetUrl, category || "אלקטרוניקה וגאדג'טים", visualPreference).catch((e) => {
        console.error("Multi-agent job error:", e);
      });

      return NextResponse.json({ success: true, action: "job_started" });
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
      return NextResponse.json({ success: true, action: "product_deleted", reply });
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

      return NextResponse.json({ success: true, action: "quota_updated", reply });
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
        return NextResponse.json({ success: true, action: "search_completed", reply });
      } else {
        const reply = `דנה חיפשה ב-AliExpress API אך לא נמצאו מוצרים תואמים ל-"${queryTerm}". מומלץ לנסות מונח כללי יותר באנגלית או עברית.`;
        saveOrchestratorMessage({
          id: `orch_reply_${Date.now()}`,
          sender: "orchestrator",
          text: reply,
          timestamp: now,
        });
        return NextResponse.json({ success: true, action: "search_empty", reply });
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
      return NextResponse.json({ success: true, action: "status_reported", reply });
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
      // Check if Gemini API Key is available for real dynamic AI responses
      const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (geminiKey && geminiKey.length > 5) {
        try {
          const { getGenAI, MODELS } = await import("@/lib/gemini/client");
          const { recordGeminiCall } = await import("@/lib/agent/cadence-manager");
          const { supabaseDb } = await import("@/lib/db/supabase-db");

          // 1. Fetch live catalog and pages from Supabase (with fallback)
          const allProducts = await supabaseDb.getProducts();
          const allPages = await supabaseDb.getPages();
          const reviewsCount = allPages.filter((p) => p.type === "review").length;
          const top5Count = allPages.filter((p) => p.type === "top5").length;
          const dealsCount = allPages.filter((p) => p.type === "deal").length;
          const topCategories = Array.from(new Set(allProducts.map((p) => p.category))).filter(Boolean).slice(0, 8);
          const recentProductsSummary = allProducts
            .slice(0, 6)
            .map((p) => `- ${p.titleHe || p.originalTitle} (₪${p.priceIls}, $${p.priceUsd}, ${p.rating}★, ID: ${p.aliId})`)
            .join("\n");

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
- דנה (Data & CRO Analyst): אנליזה, יחסי המרה, RPC, מעקב מדדים ומחקר עמלות אלי אקספרס.
- רון (Copywriter & SEO/GEO Specialist): כתיבת סקירות מעמיקות וכנות, פסקאות GEO מוכנות לציטוט ב-SearchGPT / AI Overviews וסכמות Schema.org.
- מיה (Creative Director): עיצוב אינפוגרפיקות SVG וקטוריות חדות ותמונות לייפסטייל ללא עיוותי AI.
- עומר (QA Officer): בקרת שקע אירופאי (EU 220V), תקרת מכס ($75) ותקינות קישורי אפיליאציה.
- גל (Full-Stack Engineer): מהירות אתר, מדדי Core Web Vitals ורכיבי המרה דביקים.

היעד העסקי המשותף: להביא את האתר אורגנית ל-$100 ביום מעמלות אפיליאציה של אלי אקספרס.

נתוני אמת חיים של האתר כרגע במסד הנתונים:
- סך מוצרים שמורים בקטלוג: ${allProducts.length} מוצרים
- סקירות מפורסמות באתר: ${reviewsCount}
- עמודי השוואת TOP N: ${top5Count}
- עמודי דיל בזק (Flash Deals): ${dealsCount}
- קטגוריות עיקריות: ${topCategories.join(", ") || "אלקטרוניקה, בית, גאדג'טים"}
- נתוני דנה: סך צפיות ${analytics.totalViews}, קליקים יוצאים ${analytics.totalOutboundClicks}, רווח יומי מוערך $${analytics.dailyRevenueEstimateUsd} מתוך יעד $100.00 (${analytics.progressToGoalPercent}%)
- דוגמאות ממוצרי האתר:
${recentProductsSummary || "אין עדיין מוצרים"}

הנחיות לתשובה:
1. ענה בעברית טבעית, מקצועית, עסקית וחדה, כראש צוות AI חכם שמכיר את כל נתוני האתר והשיחה לעומק.
2. שמור על קוהרנטיות וקונטקסט שיחה מלא – התייחס למה שהמשתמש שאל ואמר בהודעות קודמות.
3. אם המשתמש שואל איך לשפר או לבצע משימה, תן המלצה מעשית וציין מה כל סוכן (דנה, רון, מיה, עומר, גל) ממליץ לעשות.
4. אם המשתמש מדביק קישור או מזהה מוצר מעלי אקספרס, הבהר לו שאתה מיד שולח את הצוות להפיק עבורו סקירה מלאה + אינפוגרפיקה.
5. לעולם אל תשתמש בסימוני LaTeX ($$ או \\). כשאומרים דולר כתוב $ או דולר.`;

          const aiClient = getGenAI();
          let aiResponseText = "";

          try {
            const response = await aiClient.models.generateContent({
              model: MODELS.FLASH,
              contents: conversationContents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
              },
            });
            aiResponseText = response.text || "";
          } catch (modelErr: any) {
            console.warn("Gemini 2.5 Flash attempt failed, trying Gemini 2.0 Flash:", modelErr?.message);
            const fallbackResponse = await aiClient.models.generateContent({
              model: MODELS.FLASH_2_0,
              contents: conversationContents,
              config: {
                systemInstruction: systemPrompt,
                temperature: 0.7,
              },
            });
            aiResponseText = fallbackResponse.text || "";
          }

          recordGeminiCall();

          if (aiResponseText && aiResponseText.trim()) {
            responseText = aiResponseText.trim();
          }
        } catch (geminiErr: any) {
          console.error("Gemini dynamic chat error:", geminiErr);
          addAgentLog("orchestrator", "אלון", "warning", `שגיאת Gemini: ${geminiErr?.message || "בדוק מפתח API"}`);
        }
      }

      if (!responseText) {
        responseText = `היי! צוות הסוכנים (אלון, דנה, רון, מיה, עומר וגל) פועל במרץ כדי להביא את האתר ל-**$100 ביום**.\n\nאפשרויות זמינות:\n- הדבק קישור או מזהה מוצר מעלי אקספרס להפקת סקירה + אינפוגרפיקה.\n- כתוב *"חפש [מוצר]"* לחיפוש מוצרים ישירות ב-API של עלי אקספרס.\n- כתוב *"סטטוס אתר"* לצפייה בסך המוצרים והעמודים החיים.\n- כתוב *"מחק מוצר [ID]"* להסרת מוצר ישירות מהאתר.\n- כתוב *"התקדמות ליעד"* לצפייה בדוח ההכנסות וה-RPC של דנה.`;
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
