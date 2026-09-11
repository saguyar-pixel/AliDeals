import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ success: false, error: "גישה נדחתה: אין הרשאת מנהל" }, { status: 403 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ success: false, error: "חסר מזהה קופון" }, { status: 400 });
    }

    await supabaseDb.deleteCoupon(id);

    try {
      revalidatePath("/");
      revalidatePath("/reviews");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "הקופון נמחק בהצלחה",
    });
  } catch (err: any) {
    console.error("DELETE /api/coupons/[id] failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ success: false, error: "גישה נדחתה: אין הרשאת מנהל" }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await supabaseDb.getCouponById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "קופון לא נמצא" }, { status: 404 });
    }

    const updated = {
      ...existing,
      ...body,
      id,
    };

    await supabaseDb.upsertCoupon(updated);

    try {
      revalidatePath("/");
    } catch {}

    return NextResponse.json({
      success: true,
      coupon: updated,
      message: "הקופון עודכן בהצלחה",
    });
  } catch (err: any) {
    console.error("PUT /api/coupons/[id] failed:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
