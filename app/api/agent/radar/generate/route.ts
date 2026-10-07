import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { executeRadarCandidatePipeline, RadarCandidateProduct } from "@/lib/agent/alon-radar";
import { addAgentLog } from "@/lib/agent/team-orchestrator";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const body = await req.json();
    const candidates: RadarCandidateProduct[] = body.candidates || [];

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: "לא נבחרו מוצרים להפקה. אנא בחר מוצר אחד לפחות." },
        { status: 400 }
      );
    }

    addAgentLog(
      "orchestrator",
      "אלון",
      "info",
      `העורך אישר הפקה נקודתית (HITL) עבור ${candidates.length} מוצרים נבחרים מהרדאר...`
    );

    const results: Array<{
      productId: string;
      title: string;
      success: boolean;
      pageId?: string;
      slug?: string;
      error?: string;
    }> = [];

    let successCount = 0;

    for (const cand of candidates) {
      addAgentLog(
        "orchestrator",
        "אלון",
        "info",
        `מתחיל הפקת תוכן, תמונת Gemini ובקרת איכות למוצר #${cand.product.aliId}: "${cand.product.originalTitle.slice(0, 40)}..."`
      );

      const outcome = await executeRadarCandidatePipeline(cand);

      results.push({
        productId: cand.product.aliId,
        title: cand.product.originalTitle,
        success: outcome.success,
        pageId: outcome.pageId,
        slug: outcome.slug,
        error: outcome.error,
      });

      if (outcome.success) {
        successCount++;
      }
    }

    addAgentLog(
      "orchestrator",
      "אלון",
      "success",
      `הפקת HITL הושלמה! ${successCount} מתוך ${candidates.length} כתבות נוצרו כטיוטות וממתינות לאישור סופי בתור הניהול.`
    );

    return NextResponse.json({
      success: true,
      totalRequested: candidates.length,
      successCount,
      results,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "HITL generation failed";
    console.error("[HITL Generate Route Error]:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
