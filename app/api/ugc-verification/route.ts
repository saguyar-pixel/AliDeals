import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { checkRateLimit, getClientIp, sanitizePromptText, verifyAdminAccess } from "@/lib/security/firewall";

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

    // Only authenticated admins can view unapproved moderation queue items
    const isAdmin = verifyAdminAccess(req);
    const verifications = await supabaseDb.getUgcVerifications(productId, !isAdmin);
    const summary = productId ? await supabaseDb.getUgcSummary(productId) : null;

    return NextResponse.json({
      success: true,
      count: verifications.length,
      verifications,
      summary,
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to load verifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rate = checkRateLimit(`ugc_submit:${ip}`, 6, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { success: false, error: "נשלחו יותר מדי דיווחים בזמן קצר. אנא נסה שוב בעוד דקה." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const productId = String(body.productId || "").trim().slice(0, 80);

    if (!productId) {
      return NextResponse.json({ success: false, error: "חובה לציין מזהה מוצר" }, { status: 400 });
    }

    const rawDays =
      typeof body.deliveryDays === "number"
        ? body.deliveryDays
        : parseInt(String(body.deliveryDays || 11), 10) || 11;
    const safeDeliveryDays = Math.min(Math.max(rawDays, 1), 90);

    const safeComment = body.buyerComment
      ? sanitizePromptText(String(body.buyerComment)).replace(/[<>]/g, "").trim().slice(0, 300)
      : undefined;

    const record = await supabaseDb.submitUgcVerification({
      productId,
      isEuPlug: body.isEuPlug !== undefined ? Boolean(body.isEuPlug) : true,
      deliveryDays: safeDeliveryDays,
      voltage220vCompatible: body.voltage220vCompatible !== undefined ? Boolean(body.voltage220vCompatible) : true,
      isRecommended: body.isRecommended !== undefined ? Boolean(body.isRecommended) : true,
      buyerComment: safeComment,
    });

    const updatedSummary = await supabaseDb.getUgcSummary(productId);

    return NextResponse.json({
      success: true,
      record,
      summary: updatedSummary,
      message: "תודה! חוות הדעת נשלחה ותתפרסם לאחר אימות מהיר של המערכת.",
    });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to submit verification" }, { status: 500 });
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

    const ok = await supabaseDb.approveUgcVerification(String(id), isApproved ?? true);
    return NextResponse.json({ success: ok });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to update verification" }, { status: 500 });
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
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete verification" }, { status: 500 });
  }
}
