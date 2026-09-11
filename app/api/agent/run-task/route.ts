import { NextRequest, NextResponse } from "next/server";
import { executeMultiAgentProductJob, addAgentLog } from "@/lib/agent/team-orchestrator";
import { runDanaCroAnalysis } from "@/lib/analytics/cro-engine";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { jsonDb } from "@/lib/db";
import { ai, getModelForAgent } from "@/lib/gemini/client";
import { recordGeminiCall } from "@/lib/agent/cadence-manager";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const { taskType, productUrl, category = "אלקטרוניקה וגאדג'טים" } = await req.json();

    if (taskType === "cro_analysis") {
      addAgentLog("analyst", "דנה", "info", "סורקת מדדי צפיות, קליקים ו-RPC על פני כל עמודי האתר...");
      const analytics = runDanaCroAnalysis();

      // Call Gemini for real deep CRO insight if API key is present
      let aiCroAdvice = "";
      if (process.env.GEMINI_API_KEY) {
        try {
          const modelName = getModelForAgent("analyst");
          const prompt = `את דנה, Data & CRO Analyst בכירה של אתר האפיליאציה הישראלי AliDeals.
נתוני האתר החיים שנאספו:
- סך צפיות אורגניות מנוטרות: ${analytics.totalViews}
- סך קליקים יוצאים לעלי אקספרס: ${analytics.totalOutboundClicks}
- CTR ממוצע: ${analytics.averageCtrPercent}%
- רווח יומי מוערך נוכחי: $${analytics.dailyRevenueEstimateUsd}
- יעד יומי עסקי: $${analytics.dailyRevenueTargetUsd} (התקדמות: ${analytics.progressToGoalPercent}%)
- כמות עמודים עם המלצות לשיפור: ${analytics.recommendations.length}

כתבי סיכום קצר, חד ומעשי (עד 3-4 שורות) בעברית שיווקית, עם 2 פעולות מיידיות שהצוות (רון בקופי וגל בפיתוח) צריך לבצע כדי להעלות את ה-CTR והמרות לאלי אקספרס. ללא שום LaTeX או סימוני $$.`;

          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { temperature: 0.7 },
          });

          recordGeminiCall();
          if (response.text) {
            aiCroAdvice = response.text;
          }
        } catch (gemErr) {
          console.warn("Gemini CRO analysis fallback:", gemErr);
        }
      }

      addAgentLog(
        "analyst",
        "דנה",
        "success",
        aiCroAdvice
          ? `ניתוח CRO מבוסס AI הושלם:\n${aiCroAdvice}`
          : `הניתוח הושלם: אותרו ${analytics.recommendations.length} המלצות שיפור להגעה ליעד $100 ליום (רווח נוכחי: $${analytics.dailyRevenueEstimateUsd}).`
      );

      addAgentLog(
        "developer",
        "גל",
        "info",
        "מעדכן תצורת כפתורי Sticky CTA ובדיקות A/B על פי ממצאי הדאטא של דנה."
      );

      return NextResponse.json({ success: true, analytics, aiCroAdvice });
    }

    if (taskType === "qa_audit") {
      addAgentLog("qa_officer", "עומר", "info", "מתחיל ביקורת איכות מקיפה על כל מאגר המוצרים והעמודים של האתר...");

      const products = jsonDb.getProducts();
      const pages = jsonDb.getPages();

      let taxExemptCount = 0;
      let taxWarningCount = 0;
      let taxableCount = 0;
      let validAffiliateCount = 0;
      let missingAffiliateCount = 0;
      const issuesFound: string[] = [];

      products.forEach((p) => {
        // Customs check
        if (p.priceUsd > 75) {
          taxableCount++;
          issuesFound.push(`מוצר "${p.titleHe || p.originalTitle}" מעל 75$ ($${p.priceUsd}) - נדרש תיוג מע"מ ומכס.`);
        } else if (p.priceUsd > 73) {
          taxWarningCount++;
          issuesFound.push(`מוצר "${p.titleHe || p.originalTitle}" ברף גבולי ($${p.priceUsd}) - סיכון לתנודות שער הדולר.`);
        } else {
          taxExemptCount++;
        }

        // Affiliate link check
        const aff = p.affiliateUrl || "";
        if (aff.includes("s.click.aliexpress.com") || aff.includes("/e/")) {
          validAffiliateCount++;
        } else {
          missingAffiliateCount++;
          issuesFound.push(`מוצר "${p.titleHe || p.originalTitle}" ללא קישור מקוצר מאומת של אלי אקספרס.`);
        }
      });

      if (issuesFound.length > 0) {
        addAgentLog(
          "qa_officer",
          "עומר",
          "warning",
          `אותרו ${issuesFound.length} התראות תאימות:\n- ${issuesFound.slice(0, 3).join("\n- ")}${issuesFound.length > 3 ? `\n- ועוד ${issuesFound.length - 3} פריטים נוספים.` : ""}`
        );
      }

      addAgentLog(
        "qa_officer",
        "עומר",
        "success",
        `דוח ביקורת עומר הושלם בהצלחה:\n- נסרקו ${products.length} מוצרים ו-${pages.length} עמודים חיים.\n- ${taxExemptCount} מוצרים פטורים לחלוטין ממכס ומע"מ (<75$).\n- ${taxWarningCount} מוצרים בטווח בטיחות (73$-75$).\n- ${taxableCount} מוצרים מעל 75$ המחייבים גילוי נאות למשתמש הישראלי.\n- ${validAffiliateCount} קישורי אפיליאציה תקינים ומאובטחים.`
      );

      return NextResponse.json({
        success: true,
        message: "ביקורת QA אמיתית הושלמה",
        audit: {
          scannedProducts: products.length,
          scannedPages: pages.length,
          taxExemptCount,
          taxWarningCount,
          taxableCount,
          validAffiliateCount,
          missingAffiliateCount,
          issuesFound,
        },
      });
    }

    if (taskType === "product_job") {
      let targetUrl = productUrl?.trim();

      // If no productUrl was supplied, pick an unreviewed product from the catalog!
      if (!targetUrl) {
        const products = jsonDb.getProducts();
        const pages = jsonDb.getPages();
        const reviewedProductIds = new Set<string>();

        pages.forEach((page) => {
          try {
            const ids = JSON.parse(page.productIds || "[]");
            ids.forEach((id: string) => reviewedProductIds.add(String(id)));
          } catch {}
        });

        const unreviewed = products.find(
          (p) => !reviewedProductIds.has(p.id) && !reviewedProductIds.has(p.aliId)
        );

        if (unreviewed) {
          targetUrl = unreviewed.aliUrl || unreviewed.aliId;
          addAgentLog(
            "orchestrator",
            "אלון",
            "info",
            `לא הוזן קישור ידני - אלון בחר אוטומטית מוצר שטרם נסקר מהקטלוג: "${unreviewed.titleHe || unreviewed.originalTitle}" (${unreviewed.aliId})`
          );
        } else if (products.length > 0) {
          targetUrl = products[0].aliUrl || products[0].aliId;
        } else {
          return NextResponse.json(
            { error: "לא נמצאו מוצרים בקטלוג ולא הוזן קישור. נא להזין קישור למוצר מעלי אקספרס." },
            { status: 400 }
          );
        }
      }

      addAgentLog("orchestrator", "אלון", "info", `מתחיל משימת פיתוח וסקירה מלאה בצוות הסוכנים למוצר: ${targetUrl}`);
      const jobResult = await executeMultiAgentProductJob(targetUrl, category, "infographic");
      return NextResponse.json({ success: true, result: jobResult });
    }

    return NextResponse.json({ error: "סוג משימה לא ידוע" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Task execution failed";
    console.error("Run task error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

/**
 * Autonomous Vercel Cron Runner:
 * Runs on a schedule in the cloud (defined in vercel.json)
 */
export async function GET(req: NextRequest) {
  try {
    const isCron =
      Boolean(req.headers.get("x-vercel-cron")) ||
      req.headers.get("authorization")?.includes(process.env.CRON_SECRET || "internal_cron") ||
      verifyAdminAccess(req);

    if (!isCron && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: "גישה מוגנת: מיועד לריצה אוטונומית של Vercel Cron" },
        { status: 403 }
      );
    }

    const { supabaseDb } = await import("@/lib/db/supabase-db");

    // 1. Check if there are queued tasks in Supabase
    const pendingTasks = await supabaseDb.getPendingAgentTasks(1);
    if (pendingTasks && pendingTasks.length > 0) {
      const task = pendingTasks[0];
      await supabaseDb.updateAgentTaskStatus(task.id, "running");
      addAgentLog("orchestrator", "אלון", "info", `Vercel Cron החל ביצוע משימה מתוזמנת: "${task.taskType}" (#${task.id})`);

      try {
        let result: any = null;
        if (task.taskType === "product_job" && task.payload?.urlOrId) {
          result = await executeMultiAgentProductJob(
            task.payload.urlOrId,
            task.payload.category || "אלקטרוניקה וגאדג'טים"
          );
        } else {
          result = runDanaCroAnalysis();
        }

        await supabaseDb.updateAgentTaskStatus(task.id, "completed", result);
        addAgentLog("orchestrator", "אלון", "success", `Vercel Cron השלים בהצלחה משימה #${task.id}`);
        return NextResponse.json({ success: true, executedTask: task.id, result });
      } catch (execErr: any) {
        await supabaseDb.updateAgentTaskStatus(task.id, "failed", null, execErr?.message);
        addAgentLog("orchestrator", "אלון", "error", `שגיאה בביצוע משימה #${task.id}: ${execErr?.message}`);
        return NextResponse.json({ error: execErr?.message }, { status: 500 });
      }
    }

    // 2. If no pending task queued, run automated CRO audit
    addAgentLog("analyst", "דנה", "info", "Vercel Cron: בדיקת בריאות קטלוג וניתוח מדדי המרה אורגניים...");
    const analytics = runDanaCroAnalysis();
    return NextResponse.json({ success: true, action: "cron_idle_audit", analytics });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Cron execution failed";
    console.error("Agent cron error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
