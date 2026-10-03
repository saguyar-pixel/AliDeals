import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db/supabase-db";

/**
 * Admin API for Live Orders and Approval Queue
 * GET /api/affiliate/orders - Fetch orders and status statistics
 * POST /api/affiliate/orders - 1-Click Publish or dismiss pending review
 */
export async function GET(req: NextRequest) {
  try {
    const orders = await supabaseDb.getAffiliateOrders(150);
    const allItems = await supabaseDb.getAffiliateOrderItems({ limit: 300 });

    let totalSalesUsd = 0;
    let totalCommissionUsd = 0;
    let pendingApprovalCount = 0;
    let existingCatalogUpdatedCount = 0;

    for (const ord of orders) {
      totalSalesUsd += ord.paidAmountUsd || 0;
      totalCommissionUsd += ord.commissionAmountUsd || 0;
    }

    for (const it of allItems) {
      if (it.articleGenerationStatus === "completed" || it.articleGenerationStatus === "pending") {
        pendingApprovalCount++;
      } else if (it.articleGenerationStatus === "already_exists") {
        existingCatalogUpdatedCount++;
      }
    }

    // Fetch details for draft pages pending approval
    const pages = await supabaseDb.getPages();
    const pendingPages = pages.filter((p) => p.status === "draft" && p.type === "review");

    return NextResponse.json({
      success: true,
      stats: {
        totalOrders: orders.length,
        totalSalesUsd: Math.round(totalSalesUsd * 100) / 100,
        totalCommissionUsd: Math.round(totalCommissionUsd * 100) / 100,
        pendingApprovalCount: pendingPages.length,
        existingCatalogUpdatedCount,
      },
      orders,
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
