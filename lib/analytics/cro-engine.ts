import { jsonDb } from "../db";
import { analyticsDb } from "../db/analytics-db";
import { CroRecommendation } from "../agent/types";

export interface ProductRpcMetrics {
  productId: string;
  productTitle: string;
  views: number;
  outboundClicks: number;
  ctrPercent: number;
  estimatedCommissionPerSaleUsd: number;
  conversionRateEstimate: number; // e.g. 8% of outbound clicks convert on AliExpress
  estimatedRpcUsd: number;        // Revenue Per Click
  totalEstimatedRevenueUsd: number;
  actualConversionsCount?: number;
  actualRevenueUsd?: number;
}

export interface SiteAnalyticsSummary {
  totalViews: number;
  totalOutboundClicks: number;
  averageCtrPercent: number;
  dailyRevenueEstimateUsd: number;
  dailyRevenueTargetUsd: number; // 100$
  progressToGoalPercent: number;
  topPerformingProducts: ProductRpcMetrics[];
  recommendations: CroRecommendation[];
  isRealData: boolean;
  gscQueriesCount: number;
  ga4PagesCount: number;
  lastImportedAt?: string;
  s2sConversionsCount: number;
  actualRevenueUsd: number;
  actualRevenueIls: number;
}

/**
 * Dana's Real Analytics & CRO Engine
 * Analyzes real GA4 page views, real Search Console impressions & queries,
 * and live recorded clicks_out_to_aliexpress to calculate true RPC.
 */
export function runDanaCroAnalysis(): SiteAnalyticsSummary {
  const pages = jsonDb.getPages();
  const products = jsonDb.getProducts();

  // 1. Fetch Real Data from Analytics DB
  const realClicks = analyticsDb.getClicks(1000);
  const realGscQueries = analyticsDb.getGscQueries();
  const realGa4Stats = analyticsDb.getGa4Stats();
  const realConversions = analyticsDb.getConversions(1000);

  const hasRealData =
    realClicks.length > 0 ||
    realGscQueries.length > 0 ||
    realGa4Stats.length > 0 ||
    realConversions.length > 0;

  // Map real S2S conversions by productId and subId/slug
  const convByProductMap = new Map<string, { count: number; commissionUsd: number; commissionIls: number }>();
  let totalApprovedCommissionUsd = 0;
  let totalApprovedCommissionIls = 0;

  realConversions.forEach((c) => {
    if (c.status === "rejected") return;
    totalApprovedCommissionUsd += c.commissionUsd || 0;
    totalApprovedCommissionIls += c.commissionIls || 0;

    const keys = [c.productId, c.subId].filter(Boolean) as string[];
    keys.forEach((k) => {
      const cur = convByProductMap.get(k.toLowerCase()) || { count: 0, commissionUsd: 0, commissionIls: 0 };
      cur.count += 1;
      cur.commissionUsd += c.commissionUsd || 0;
      cur.commissionIls += c.commissionIls || 0;
      convByProductMap.set(k.toLowerCase(), cur);
    });
  });

  // Map GA4 views by page path or slug
  const ga4ViewsMap = new Map<string, number>();
  realGa4Stats.forEach((s) => {
    const cleanPath = s.pagePath.replace(/^\//, "").replace(/\/$/, "");
    ga4ViewsMap.set(cleanPath, (ga4ViewsMap.get(cleanPath) || 0) + s.views);
  });

  // Map real clicks by page slug or product ID
  const clicksByPageMap = new Map<string, number>();
  const clicksByProductMap = new Map<string, number>();
  realClicks.forEach((c) => {
    const pSlug = (c.pageSlug || "").toLowerCase();
    clicksByPageMap.set(pSlug, (clicksByPageMap.get(pSlug) || 0) + 1);

    if (c.productId) {
      clicksByProductMap.set(c.productId, (clicksByProductMap.get(c.productId) || 0) + 1);
    }
  });

  let totalViews = 0;
  let totalClicks = realClicks.length;
  const metricsList: ProductRpcMetrics[] = [];

  pages.forEach((page) => {
    // Determine real views: from GA4 if imported, else from page counter
    const slugKey = page.slug.toLowerCase();
    const reviewsKey = `reviews/${slugKey}`;
    const top5Key = `top5/${slugKey}`;

    const realViewsForPage =
      ga4ViewsMap.get(slugKey) ||
      ga4ViewsMap.get(reviewsKey) ||
      ga4ViewsMap.get(top5Key) ||
      page.viewsCount ||
      (hasRealData ? 0 : 15);

    totalViews += realViewsForPage;

    // Real clicks for this page
    const pageClicks =
      clicksByPageMap.get(slugKey) ||
      clicksByPageMap.get(reviewsKey) ||
      clicksByPageMap.get(top5Key) ||
      0;

    let productIds: string[] = [];
    try {
      productIds = JSON.parse(page.productIds || "[]");
    } catch {}

    const firstAliId = productIds[0];
    const prod = firstAliId ? products.find((p) => p.aliId === firstAliId) : products[0];

    const priceUsd = prod?.priceUsd || 30.0;
    const commissionRate = (prod?.commissionRate || 7.5) / 100;
    const commissionPerSale = priceUsd * commissionRate;

    // Industry AliExpress benchmark: 8% of outbound clicks convert on AliExpress
    const conversionRate = 0.08;
    const estimatedRpc = Math.round(commissionPerSale * conversionRate * 100) / 100;

    // Check if there are real S2S conversions for this product/slug
    const prodKey = (prod?.aliId || "").toLowerCase();
    const slugKeyOnly = slugKey.toLowerCase();
    const actualConv = convByProductMap.get(prodKey) || convByProductMap.get(slugKeyOnly);

    const actualConversionsCount = actualConv?.count || 0;
    const actualRevenueUsd = actualConv ? Math.round(actualConv.commissionUsd * 100) / 100 : undefined;

    // If we have actual S2S sales, use real revenue, otherwise use estimated RPC
    const estimatedTotalRevenue = actualRevenueUsd !== undefined && actualRevenueUsd > 0
      ? actualRevenueUsd
      : Math.round(pageClicks * estimatedRpc * 10) / 10;

    const pageCtr = realViewsForPage > 0 ? Math.round((pageClicks / realViewsForPage) * 1000) / 10 : 0;
    const effectiveConvRate = actualConversionsCount > 0 && pageClicks > 0
      ? Math.round((actualConversionsCount / pageClicks) * 1000) / 10
      : 8.0;

    metricsList.push({
      productId: prod?.aliId || page.id,
      productTitle: page.title,
      views: realViewsForPage,
      outboundClicks: pageClicks,
      ctrPercent: pageCtr,
      estimatedCommissionPerSaleUsd: Math.round(commissionPerSale * 100) / 100,
      conversionRateEstimate: effectiveConvRate,
      estimatedRpcUsd: actualRevenueUsd && pageClicks > 0 ? Math.round((actualRevenueUsd / pageClicks) * 100) / 100 : estimatedRpc,
      totalEstimatedRevenueUsd: estimatedTotalRevenue,
      actualConversionsCount,
      actualRevenueUsd,
    });
  });

  const totalCalculatedRevenue = metricsList.reduce((acc, m) => acc + m.totalEstimatedRevenueUsd, 0);
  const totalRevenue = Math.max(totalCalculatedRevenue, totalApprovedCommissionUsd);
  const dailyTarget = 100.0;
  const progressPercent = Math.min(100, Math.round((totalRevenue / dailyTarget) * 100));

  // 2. Dynamic Real Recommendations Generation
  const recommendations: CroRecommendation[] = [];

  // A. Real S2S Conversion Wins (Highest Priority)
  if (totalApprovedCommissionUsd > 0) {
    recommendations.push({
      id: "rec_s2s_win",
      pageSlug: "conversions",
      pageTitle: "אימות מכירות S2S בפועל",
      issueHe: `נקלטו ${realConversions.length} מכירות S2S מאומתות ברשת השותפים בסך $${totalApprovedCommissionUsd.toFixed(2)} (₪${totalApprovedCommissionIls.toFixed(2)})!`,
      recommendationHe: "המוצרים שהניבו המרות בפועל הוכחו כמנצחים! מומלץ להקפיץ אותם לראש עמוד הבית, להוסיף סקירות השוואה משלימות ולהגדיל את התנועה מ-Google.",
      expectedRpmBoost: "+40% הכנסה מוכחת",
      status: "pending",
    });
  }

  // B. Search Console Low-Hanging Fruits (Position 4-15 with High Impressions)
  const lowHangingQueries = realGscQueries
    .filter((q) => q.position >= 3.5 && q.position <= 18 && q.impressions >= 30)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 3);

  lowHangingQueries.forEach((q, idx) => {
    recommendations.push({
      id: `rec_gsc_${idx}`,
      pageSlug: q.page || "search-console",
      pageTitle: `מילת חיפוש: "${q.query}"`,
      issueHe: `${q.impressions.toLocaleString()} חשיפות בגוגל אך מיקום ממוצע ${q.position.toFixed(1)} (CTR של ${q.ctr.toFixed(1)}%)`,
      recommendationHe: `לעדכן את כותרת ה-Meta Title וגוף הסקירה כך שיכללו את הביטוי המדויק "${q.query}". הקפצה לטופ 3 תכפיל את כמות הקליקים!`,
      expectedRpmBoost: "+30%-50% קליקים אורגניים",
      status: "pending",
    });
  });

  // C. High Views with Low Outbound Clicks (Conversion Leaks)
  const leakPages = metricsList
    .filter((m) => m.views >= 20 && m.ctrPercent < 3.0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 2);

  leakPages.forEach((lp, idx) => {
    recommendations.push({
      id: `rec_leak_${idx}`,
      pageSlug: lp.productId,
      pageTitle: lp.productTitle,
      issueHe: `העמוד זוכה ל-${lp.views} צפיות אך שיעור הקליקים לאלי אקספרס נמוך (${lp.ctrPercent}%)`,
      recommendationHe: `להוסיף סרגל רכישה דביק (Sticky Buy Bar) בולט יותר ולהדגיש באדג' "פטור ממכס ומע"מ (<$75)" בראש המאמר`,
      expectedRpmBoost: "+25% המרה לקליק",
      status: "pending",
    });
  });

  // D. Fallback Recommendations if data is brand new
  if (recommendations.length === 0) {
    if (!hasRealData) {
      recommendations.push({
        id: "rec_onboarding_1",
        pageSlug: "/admin/analytics",
        pageTitle: "חיבור דאטא ראשוני (Onboarding)",
        issueHe: "עדיין לא יובאו נתונים מ-Search Console או Google Analytics 4",
        recommendationHe: "היכנס ללשונית 'ייבוא נתונים' והעלה קובץ CSV של שאילתות מ-Search Console כדי שדנה ורון יסרקו את מילות המפתח שלך",
        expectedRpmBoost: "הפעלת מוח הסוכנים",
        status: "pending",
      });
      recommendations.push({
        id: "rec_onboarding_2",
        pageSlug: "/admin/settings",
        pageTitle: "הזנת מזהה GA4 ו-S2S Webhook",
        issueHe: "מעקב אירוע ההמרה ומכירות S2S מוכנים לקליטת אירועים",
        recommendationHe: "הזן את ה-Measurement ID של GA4 בהגדרות וחבר את כתובת ה-S2S Webhook ברשת השותפים שלך למעקב הכנסות אוטומטי",
        expectedRpmBoost: "מדידת RPC בזמן אמת",
        status: "pending",
      });
    } else {
      recommendations.push({
        id: "rec_growth_1",
        pageSlug: "general",
        pageTitle: "הרחבת קטלוג המוצרים",
        issueHe: "העמודים הקיימים ממירים היטב אך נדרש נפח תנועה נוסף להגעה ליעד 100$/יום",
        recommendationHe: "להפיק 3 סקירות מוצר חדשות בקטגוריות החמות (אלקטרוניקה, כלי עבודה, בית)",
        expectedRpmBoost: "+15$ ליום",
        status: "pending",
      });
    }
  }

  const averageCtr = totalViews > 0 ? Math.round((totalClicks / totalViews) * 1000) / 10 : 0;

  return {
    totalViews,
    totalOutboundClicks: totalClicks,
    averageCtrPercent: averageCtr,
    dailyRevenueEstimateUsd: Math.round(totalRevenue * 10) / 10,
    dailyRevenueTargetUsd: dailyTarget,
    progressToGoalPercent: progressPercent,
    topPerformingProducts: metricsList.sort((a, b) => b.totalEstimatedRevenueUsd - a.totalEstimatedRevenueUsd),
    recommendations,
    isRealData: hasRealData,
    gscQueriesCount: realGscQueries.length,
    ga4PagesCount: realGa4Stats.length,
    lastImportedAt: realGscQueries[0]?.importedAt || realGa4Stats[0]?.importedAt,
    s2sConversionsCount: realConversions.length,
    actualRevenueUsd: Math.round(totalApprovedCommissionUsd * 100) / 100,
    actualRevenueIls: Math.round(totalApprovedCommissionIls * 100) / 100,
  };
}
