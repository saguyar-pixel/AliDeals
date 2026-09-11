import { NextRequest, NextResponse } from "next/server";
import { supabaseDb, CouponRecord } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const coupons = await supabaseDb.getCoupons();
    return NextResponse.json({
      success: true,
      count: coupons.length,
      coupons,
    });
  } catch (err: any) {
    console.error("GET /api/coupons failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ success: false, error: "גישה נדחתה: אין הרשאת מנהל" }, { status: 403 });
    }

    const body = await req.json();

    if (!body.code || !body.discountText) {
      return NextResponse.json(
        { success: false, error: "חובה לציין קוד קופון ותיאור הנחה" },
        { status: 400 }
      );
    }

    const cleanCode = body.code.trim().toUpperCase();
    const id = body.id || `cpn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    const coupon: CouponRecord = {
      id,
      code: cleanCode,
      title: body.title || `קופון ${cleanCode}`,
      discountText: body.discountText,
      discountPercent: body.discountPercent ? parseFloat(body.discountPercent) : undefined,
      minSpendUsd: body.minSpendUsd ? parseFloat(body.minSpendUsd) : undefined,
      placements: Array.isArray(body.placements) && body.placements.length > 0 ? body.placements : ["all"],
      targetCategoryIds: Array.isArray(body.targetCategoryIds) ? body.targetCategoryIds : [],
      targetProductIds: Array.isArray(body.targetProductIds) ? body.targetProductIds : [],
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : true,
      expiresAt: body.expiresAt || undefined,
      clickCount: body.clickCount || 0,
      createdAt: body.createdAt || new Date().toISOString(),
    };

    await supabaseDb.upsertCoupon(coupon);

    try {
      revalidatePath("/");
      revalidatePath("/reviews");
      revalidatePath("/deals");
    } catch {}

    return NextResponse.json({
      success: true,
      coupon,
      message: "הקופון נשמר בהצלחה",
    });
  } catch (err: any) {
    console.error("POST /api/coupons failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
