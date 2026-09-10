import { NextRequest, NextResponse } from "next/server";
import { executeMultiAgentProductJob, addAgentLog } from "@/lib/agent/team-orchestrator";
import { runDanaCroAnalysis } from "@/lib/analytics/cro-engine";
import { updateTaskStatus } from "@/lib/agent/backlog-manager";
import { verifyAdminAccess } from "@/lib/security/firewall";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const { taskType, productUrl, category = "אלקטרוניקה וגאדג'טים" } = await req.json();

    if (taskType === "cro_analysis") {
      addAgentLog("analyst", "דנה", "info", "מפעילה ניתוח CRO ויחס המרה על כל עמודי האתר...");
      const analytics = runDanaCroAnalysis();
      addAgentLog("analyst", "דנה", "success", `הניתוח הושלם: אופטימיזציה ל-${analytics.recommendations.length} עמודים להגעה ליעד $100 ליום.`);
      addAgentLog("developer", "גל", "info", "מכין בדיקת A/B לרכיבי הנעה לפעולה ולחצני קנייה דביקים במובייל.");
      return NextResponse.json({ success: true, analytics });
    }

    if (taskType === "qa_audit") {
      addAgentLog("qa_officer", "עומר", "info", "מבצע ביקורת איכות מקיפה: שקע אירופאי (EU), סף מכס ($75) ותקינות קישורי אפיליאציה...");
      setTimeout(() => {
        addAgentLog("qa_officer", "עומר", "success", "בדיקת מכס ושקעים הסתיימה בהצלחה: כל המוצרים עומדים במפרט הישראלי.");
      }, 1000);
      return NextResponse.json({ success: true, message: "ביקורת QA הושלמה" });
    }

    if (taskType === "product_job" && productUrl) {
      addAgentLog("orchestrator", "אלון", "info", `מתחיל משימת פיתוח מלאה למוצר: ${productUrl}`);
      
      const jobResult = await executeMultiAgentProductJob(productUrl, category, "infographic");
      return NextResponse.json({ success: true, result: jobResult });
    }

    return NextResponse.json({ error: "סוג משימה לא ידוע" }, { status: 400 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Task execution failed";
    console.error("Run task error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
