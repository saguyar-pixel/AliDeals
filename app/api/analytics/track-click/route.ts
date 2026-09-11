import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const productId = String(body.productId || body.aliId || "general");
    const productTitle = String(body.productTitle || body.title || "AliExpress Item").slice(0, 200);
    const priceUsd = typeof body.priceUsd === "number" ? body.priceUsd : parseFloat(String(body.priceUsd || 0)) || 0;
    const priceIls = typeof body.priceIls === "number" ? body.priceIls : parseFloat(String(body.priceIls || (priceUsd * 3.65))) || 0;
    const pageSlug = String(body.pageSlug || "home").slice(0, 100);
    const linkType = body.linkType || "cta_button";
    const destinationUrl = String(body.destinationUrl || body.affiliateUrl || body.aliUrl || "").slice(0, 500);

    const record = await supabaseDb.recordClick({
      productId,
      productTitle,
      priceUsd,
      priceIls,
      pageSlug,
      linkType,
      destinationUrl,
      referrer: req.headers.get("referer") || undefined,
    });

    return NextResponse.json({ success: true, id: record.id });
  } catch (err: any) {
    console.error("Track click error:", err);
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 });
  }
}
