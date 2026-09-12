import { NextRequest, NextResponse } from "next/server";
import { supabaseDb, jsonDb } from "@/lib/db";
import { analyticsDb } from "@/lib/db/analytics-db";
import { aliExpressApi } from "@/lib/aliexpress";
import { isGeminiConfigured } from "@/lib/gemini/client";
import { verifyAdminAccess } from "@/lib/security/firewall";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ success: false, error: "גישה נדחתה: אין הרשאת מנהל" }, { status: 403 });
    }

    // 1. Fetch live DB collections
    const [products, pages, redirects, coupons] = await Promise.all([
      supabaseDb.getProducts().catch(() => jsonDb.getProducts()),
      supabaseDb.getPages().catch(() => jsonDb.getPages()),
      supabaseDb.getRedirects().catch(() => jsonDb.getRedirects()),
      supabaseDb.getCoupons().catch(() => jsonDb.getCoupons()),
    ]);

    // 2. Compute Product Metrics
    const activeProducts = products.filter((p) => p.status !== "inactive");
    const inactiveProducts = products.filter((p) => p.status === "inactive");

    const reviewPages = pages.filter((p) => p.type === "review" && p.status === "published");
    const assignedProductIds = new Set<string>();
    reviewPages.forEach((p) => {
      let ids: string[] = [];
      if (typeof p.productIds === "string") {
        try {
          ids = JSON.parse(p.productIds);
        } catch {}
      } else if (Array.isArray(p.productIds)) {
        ids = p.productIds;
      }
      ids.forEach((id) => assignedProductIds.add(id));
    });

    const productsWithoutReview = activeProducts.filter(
      (p) => !assignedProductIds.has(p.id) && (!p.aliId || !assignedProductIds.has(p.aliId))
    );

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentlyUpdatedProducts = products.filter(
      (p) => p.updatedAt && new Date(p.updatedAt).getTime() > sevenDaysAgo
    );

    // 3. Compute Page Metrics
    const publishedPages = pages.filter((p) => p.status === "published");
    const draftPages = pages.filter((p) => p.status !== "published");
    const top5Pages = pages.filter((p) => p.type === "top5" && p.status === "published");
    const dealPages = pages.filter((p) => p.type === "deal" && p.status === "published");

    // 4. Compute Redirects & SEO Health
    const active301Count = redirects.filter((r) => r.statusCode === 301).length;

    // 5. Analytics Clickouts & SubIDs (100% Supabase Cloud)
    let clickoutStats: Record<string, number> = {
      top5_card: 0,
      popup_featured: 0,
      category_grid: 0,
      product_review_cta: 0,
      live_search_result: 0,
      cross_sell_item: 0,
      cross_sell_bundle: 0,
    };

    let totalRecordedClicks = 0;
    try {
      const summary = await supabaseDb.getClickSummary();
      totalRecordedClicks = summary?.clickoutsCount || 0;
      if (summary?.subIdBreakdown) {
        clickoutStats = { ...clickoutStats, ...summary.subIdBreakdown };
      }
    } catch {
      try {
        const summary = analyticsDb.getSummary();
        totalRecordedClicks = summary?.clickoutsCount || 0;
        if (summary?.subIdBreakdown) {
          clickoutStats = { ...clickoutStats, ...summary.subIdBreakdown };
        }
      } catch {
        // analytics fallback
      }
    }

    // 6. Coupons
    const activeCoupons = coupons.filter((c) => c.isActive);
    const totalCouponClicks = coupons.reduce((sum, c) => sum + (c.clickCount || 0), 0);

    // 7. System Health Statuses
    const geminiOk = await isGeminiConfigured();
    const aliOk = aliExpressApi.isConfigured();
    const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      products: {
        total: products.length,
        active: activeProducts.length,
        inactive: inactiveProducts.length,
        withoutReview: productsWithoutReview.length,
        recentlyUpdated: recentlyUpdatedProducts.length,
      },
      pages: {
        total: pages.length,
        published: publishedPages.length,
        draft: draftPages.length,
        reviews: reviewPages.length,
        top5: top5Pages.length,
        deals: dealPages.length,
      },
      redirects: {
        total: redirects.length,
        active301: active301Count,
        zero404Protected: true,
      },
      subIds: {
        totalClicks: totalRecordedClicks,
        breakdown: clickoutStats,
      },
      coupons: {
        total: coupons.length,
        active: activeCoupons.length,
        totalClicks: totalCouponClicks,
      },
      systemHealth: {
        aliExpressApi: aliOk,
        gemini: geminiOk,
        supabase: supabaseConfigured,
        databaseMode: supabaseConfigured ? "Supabase (Cloud)" : "JSON-DB (Local File)",
      },
    });
  } catch (err: any) {
    console.error("Live stats API failure:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
