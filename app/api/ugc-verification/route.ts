import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId") || undefined;
    const summaryOnly = searchParams.get("summaryOnly") === "true";

    if (productId && summaryOnly) {
      const summary = await supabaseDb.getUgcSummary(productId);
      return NextResponse.json({ success: true, summary });
    }

    const verifications = await supabaseDb.getUgcVerifications(productId, false);
    const summary = productId ? await supabaseDb.getUgcSummary(productId) : null;

    return NextResponse.json({
      success: true,
      count: verifications.length,
      verifications,
      summary,
    });
  } catch (err: any) {
    console.error("GET /api/ugc-verification error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const productId = String(body.productId || "").trim();

    if (!productId) {
      return NextResponse.json({ success: false, error: "חובה לציין מזהה מוצר" }, { status: 400 });
    }

    const record = await supabaseDb.submitUgcVerification({
      productId,
      isEuPlug: body.isEuPlug !== undefined ? Boolean(body.isEuPlug) : true,
      deliveryDays: typeof body.deliveryDays === "number" ? body.deliveryDays : parseInt(String(body.deliveryDays || 11), 10) || 11,
      voltage220vCompatible: body.voltage220vCompatible !== undefined ? Boolean(body.voltage220vCompatible) : true,
      isRecommended: body.isRecommended !== undefined ? Boolean(body.isRecommended) : true,
      buyerComment: body.buyerComment ? String(body.buyerComment).slice(0, 300) : undefined,
    });

    const updatedSummary = await supabaseDb.getUgcSummary(productId);

    return NextResponse.json({
      success: true,
      record,
      summary: updatedSummary,
      message: "תודה! חוות הדעת שלך אומתה ונוספה למאגר הקהילה הישראלית.",
    });
  } catch (err: any) {
    console.error("POST /api/ugc-verification error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ success: false, error: "אין הרשאת מנהל" }, { status: 403 });
    }

    const body = await req.json();
    const { id, isApproved } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "חסר מזהה" }, { status: 400 });
    }

    const ok = await supabaseDb.approveUgcVerification(id, isApproved ?? true);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ success: false, error: "אין הרשאת מנהל" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "חסר מזהה למחיקה" }, { status: 400 });
    }

    const ok = await supabaseDb.deleteUgcVerification(id);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
