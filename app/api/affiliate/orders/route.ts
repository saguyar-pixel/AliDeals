import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db/supabase-db";

/**
 * Admin API for Live Orders, Approval Queue and Marketing Analytics
 * GET /api/affiliate/orders - Fetch orders with rich marketing stats (RPC, AOV, CR, SubID)
 * POST /api/affiliate/orders - 1-Click Publish or dismiss pending review
 */
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const timeRange = searchParams.get("timeRange") || "all"; // "24h" | "7d" | "30d" | "month" | "all" | "custom"
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "2000", 10);

    // Fetch up to maximum DB limit of orders
    const allOrders = await supabaseDb.getAffiliateOrders(limit);
    const allItems = await supabaseDb.getAffiliateOrderItems({ limit: limit * 2 });

    const now = new Date();
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;

    if (timeRange === "24h") {
      filterStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (timeRange === "7d") {
      filterStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "30d") {
      filterStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeRange === "month") {
      filterStart = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (timeRange === "custom" && startDateParam) {
      filterStart = new Date(startDateParam);
      if (endDateParam) filterEnd = new Date(endDateParam);
    }

    const filteredOrders = allOrders.filter((ord) => {
      if (!ord.orderTime) return true;
      const ot = new Date(ord.orderTime);
      if (filterStart && ot < filterStart) return false;
      if (filterEnd && ot > filterEnd) return false;
      return true;
    });

    // Calculate marketing metrics
    let totalSalesUsd = 0;
    let totalCommissionUsd = 0;
    const subIdStats: Record<string, { orders: number; salesUsd: number; commissionUsd: number }> = {};

    for (const ord of filteredOrders) {
      totalSalesUsd += ord.paidAmountUsd || 0;
      totalCommissionUsd += ord.commissionAmountUsd || 0;

      const subId = ord.subId || "direct";
      if (!subIdStats[subId]) {
        subIdStats[subId] = { orders: 0, salesUsd: 0, commissionUsd: 0 };
      }
      subIdStats[subId].orders += 1;
      subIdStats[subId].salesUsd += ord.paidAmountUsd || 0;
      subIdStats[subId].commissionUsd += ord.commissionAmountUsd || 0;
    }

    const totalOrders = filteredOrders.length;
    const aovUsd = totalOrders > 0 ? totalSalesUsd / totalOrders : 0;
    const totalCommissionIls = totalCommissionUsd * 3.65;

    // Fetch outbound click statistics for RPC & Conversion Rate calculation
    const clickSummary = await supabaseDb.getClickSummary();
    const outboundClicks = clickSummary.clickoutsCount || 1;
    const rpcUsd = outboundClicks > 0 ? totalCommissionUsd / outboundClicks : 0;
    const rpcIls = outboundClicks > 0 ? totalCommissionIls / outboundClicks : 0;
    const conversionRate = outboundClicks > 0 ? (totalOrders / outboundClicks) * 100 : 0;

    // Count pending approval and updated catalog items
    let pendingApprovalCount = 0;
    let existingCatalogUpdatedCount = 0;

    for (const it of allItems) {
      if (it.articleGenerationStatus === "completed" || it.articleGenerationStatus === "pending") {
        pendingApprovalCount++;
      } else if (it.articleGenerationStatus === "already_exists") {
        existingCatalogUpdatedCount++;
      }
    }

    // Fetch draft review pages
    const pages = await supabaseDb.getPages();
    const pendingPages = pages.filter((p) => p.status === "draft" && p.type === "review");

    return NextResponse.json({
      success: true,
      timeRange,
      stats: {
        totalOrders,
        totalSalesUsd: Math.round(totalSalesUsd * 100) / 100,
        totalCommissionUsd: Math.round(totalCommissionUsd * 100) / 100,
        totalCommissionIls: Math.round(totalCommissionIls * 10) / 10,
        aovUsd: Math.round(aovUsd * 100) / 100,
        outboundClicks,
        rpcUsd: Math.round(rpcUsd * 1000) / 1000,
        rpcIls: Math.round(rpcIls * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        pendingApprovalCount: pendingPages.length,
        existingCatalogUpdatedCount,
        subIdStats,
      },
      orders: filteredOrders,
      pendingPages,
    });
  } catch (error: any) {
    console.error("GET /api/affiliate/orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load orders" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, slug, orderItemId } = body;

    if (action === "publish" && slug) {
      // 1-Click Publish: Change status from draft to published
      const page = await supabaseDb.getPageBySlug(slug);
      if (!page) {
        return NextResponse.json({ success: false, error: "Page not found" }, { status: 404 });
      }

      const updatedPage = await supabaseDb.upsertPage({
        ...page,
        status: "published",
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `הכתבה "${updatedPage.title}" פורסמה בהצלחה באתר!`,
        page: updatedPage,
      });
    }

    if (action === "dismiss" && orderItemId) {
      await supabaseDb.updateOrderItemStatus(orderItemId, "already_exists");
      return NextResponse.json({ success: true, message: "ההזמנה סומנה כטופלה." });
    }

    return NextResponse.json({ success: false, error: "פעולה לא נתמכת" }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/affiliate/orders error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Action failed" },
      { status: 500 }
    );
  }
}
