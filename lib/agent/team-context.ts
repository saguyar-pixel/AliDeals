import { jsonDb, supabaseDb } from "../db";
import { analyticsDb } from "../db/analytics-db";
import { runDanaCroAnalysis, SiteAnalyticsSummary } from "../analytics/cro-engine";
import { loadCadenceBudget } from "./cadence-manager";
import { getPendingEditProposals } from "./proposal-engine";

export interface UnifiedTeamContext {
  catalog: {
    totalProducts: number;
    sampleProducts: Array<{ id: string; aliId: string; title: string; priceIls: number; commissionRate: number }>;
  };
  pages: {
    totalPages: number;
    reviewsCount: number;
    top5Count: number;
    samplePages: Array<{ id: string; slug: string; title: string; type: string; views: number }>;
  };
  analytics: {
    totalViews: number;
    totalClicks: number;
    averageCtrPercent: number;
    dailyRevenueEstimateUsd: number;
    dailyRevenueTargetUsd: number;
    progressPercent: number;
  };
  s2sConversions: {
    totalSalesCount: number;
    totalCommissionUsd: number;
    totalCommissionIls: number;
    recentConversions: Array<{ orderId: string; productTitle?: string; commissionIls: number; timestamp: string }>;
  };
  seoOpportunities: Array<{ query: string; impressions: number; position: number }>;
  pendingProposalsCount: number;
  cadenceBudget: ReturnType<typeof loadCadenceBudget>;
}

/**
 * Builds a unified, complete 360-degree context of the entire site, catalog,
 * real analytics, S2S affiliate sales, and pending actions for all 6 agents.
 */
export async function getUnifiedTeamContext(): Promise<UnifiedTeamContext> {
  const products = await supabaseDb.getProducts();
  const pages = await supabaseDb.getPages();
  const conversions = await supabaseDb.getConversions(50);
  const croSummary = runDanaCroAnalysis();
  const cadence = loadCadenceBudget();
  const pendingProposals = getPendingEditProposals();
  const gscQueries = await supabaseDb.getGscQueries();

  // Top striking distance GSC queries (rank 4-15)
  const seoOpportunities = gscQueries
    .filter((q) => q.position >= 4 && q.position <= 15 && q.impressions >= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5)
    .map((q) => ({ query: q.query, impressions: q.impressions, position: Math.round(q.position * 10) / 10 }));

  let totalApprovedUsd = 0;
  let totalApprovedIls = 0;
  conversions.forEach((c) => {
    if (c.status !== "rejected") {
      totalApprovedUsd += c.commissionUsd || 0;
      totalApprovedIls += c.commissionIls || 0;
    }
  });

  const reviewsCount = pages.filter((p) => p.type === "review").length;
  const top5Count = pages.filter((p) => p.type === "top5").length;

  return {
    catalog: {
      totalProducts: products.length,
      sampleProducts: products.slice(0, 5).map((p) => ({
        id: p.id,
        aliId: p.aliId,
        title: p.titleHe || p.originalTitle,
        priceIls: p.priceIls,
        commissionRate: p.commissionRate || 7,
      })),
    },
    pages: {
      totalPages: pages.length,
      reviewsCount,
      top5Count,
      samplePages: pages.slice(0, 5).map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        type: p.type,
        views: p.viewsCount || 0,
      })),
    },
    analytics: {
      totalViews: croSummary.totalViews,
      totalClicks: croSummary.totalOutboundClicks,
      averageCtrPercent: croSummary.averageCtrPercent,
      dailyRevenueEstimateUsd: croSummary.dailyRevenueEstimateUsd,
      dailyRevenueTargetUsd: croSummary.dailyRevenueTargetUsd,
      progressPercent: croSummary.progressToGoalPercent,
    },
    s2sConversions: {
      totalSalesCount: conversions.length,
      totalCommissionUsd: Math.round(totalApprovedUsd * 100) / 100,
      totalCommissionIls: Math.round(totalApprovedIls * 100) / 100,
      recentConversions: conversions.slice(0, 5).map((c) => ({
        orderId: c.orderId,
        productTitle: c.productTitle || `פריט #${c.productId || ""}`,
        commissionIls: Math.round(c.commissionIls * 100) / 100,
        timestamp: c.timestamp,
      })),
    },
    seoOpportunities,
    pendingProposalsCount: pendingProposals.length,
    cadenceBudget: cadence,
  };
}

/**
 * Formats the complete site data into a clear Hebrew context block
 * ready for injection into Alon's system prompt or any agent run.
 */
export function formatTeamContextForPrompt(ctx: UnifiedTeamContext): string {
  const productsSample = ctx.catalog.sampleProducts
    .map((p) => `  - [ID: ${p.aliId}] ${p.title.slice(0, 45)} (₪${p.priceIls}, עמלה: ${p.commissionRate}%)`)
    .join("\n");

  const pagesSample = ctx.pages.samplePages
    .map((p) => `  - [${p.type}] /${p.slug}: "${p.title.slice(0, 40)}" (${p.views} צפיות)`)
    .join("\n");

  const s2sSample = ctx.s2sConversions.recentConversions.length > 0
    ? ctx.s2sConversions.recentConversions.map((c) => `  - הזמנה ${c.orderId}: עמלה ₪${c.commissionIls} (${c.productTitle})`).join("\n")
    : "  - טרם נקלטו דיווחי S2S היום";

  const seoSample = ctx.seoOpportunities.length > 0
    ? ctx.seoOpportunities.map((s) => `  - "${s.query}": ${s.impressions} חשיפות בגוגל, מיקום ${s.position}`).join("\n")
    : "  - אין שאילתות בטווח 4-15 כרגע";

  return `
=== נתוני אמת מלאים של האתר (Full Live Site Context) ===
📊 קטלוג ותוכן:
- סך מוצרים בקטלוג: ${ctx.catalog.totalProducts}
- סך עמודי תוכן פעילים: ${ctx.pages.totalPages} (${ctx.pages.reviewsCount} סקירות, ${ctx.pages.top5Count} מדריכי Top-5)
דוגמאות מוצרים פעילים:
${productsSample || "  - אין מוצרים עדיין"}

דוגמאות עמודי תוכן:
${pagesSample || "  - אין עמודים עדיין"}

📈 ביצועי אנליטיקס ו-S2S:
- סך צפיות באתר: ${ctx.analytics.totalViews}
- סך קליקים יוצאים לאלי אקספרס: ${ctx.analytics.totalClicks} (CTR ממוצע: ${ctx.analytics.averageCtrPercent}%)
- מכירות S2S מאושרות: ${ctx.s2sConversions.totalSalesCount} הזמנות בסך $${ctx.s2sConversions.totalCommissionUsd} (₪${ctx.s2sConversions.totalCommissionIls})
- הערכת הכנסה יומית: $${ctx.analytics.dailyRevenueEstimateUsd} / יעד: $${ctx.analytics.dailyRevenueTargetUsd} (${ctx.analytics.progressPercent}%)
עסקאות S2S אחרונות:
${s2sSample}

🔍 הזדמנויות SEO מובילות (Striking Distance בגוגל):
${seoSample}

⚙️ סטטוס תפעולי:
- הצעות עריכה הממתינות לאישור המנהל: ${ctx.pendingProposalsCount}
- תקציב יומי (מוצרים היום: ${ctx.cadenceBudget.dailyProductsCount}/${ctx.cadenceBudget.dailyProductsTarget})
- קריאות Gemini היום: ${ctx.cadenceBudget.geminiApiCallsToday}/${ctx.cadenceBudget.geminiDailySafeLimit}
=========================================================`;
}
