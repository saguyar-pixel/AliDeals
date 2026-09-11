import { NextRequest, NextResponse } from "next/server";
import { logAffiliateClick } from "@/lib/tracking/subid";
import { jsonDb, supabaseDb } from "@/lib/db";
import { createTrackedAffiliateLink } from "@/lib/aliexpress";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId") || "";
  const pageId = searchParams.get("pageId") || "";
  const utmSource = searchParams.get("utm_source") || "direct";
  const utmMedium = searchParams.get("utm_medium") || "referral";
  const utmCampaign = searchParams.get("utm_campaign") || "organic";
  const gclid = searchParams.get("gclid") || undefined;
  const fbclid = searchParams.get("fbclid") || undefined;

  // 1. Record click in DB
  const { subId1, subId2, subId3 } = await logAffiliateClick({
    productId,
    pageId,
    utmSource,
    utmMedium,
    utmCampaign,
    gclid,
    fbclid,
  });

  // 2. Lookup product across supabase and json db
  let targetUrl = "https://www.aliexpress.com";
  if (productId) {
    const prod =
      (await supabaseDb.getProductByAliId(productId)) ||
      (await supabaseDb.getProductById(productId)) ||
      jsonDb.getProductByAliId(productId) ||
      jsonDb.getProductById(productId);

    if (prod) {
      targetUrl = prod.affiliateUrl || prod.aliUrl;
    } else {
      targetUrl = `https://www.aliexpress.com/item/${productId}.html`;
    }
  }

  // 3. Inject dynamic SubIDs into affiliate URL
  const trackedUrl = await createTrackedAffiliateLink(targetUrl, {
    subId1,
    subId2,
    subId3,
  });

  // 302 Redirect to AliExpress
  return NextResponse.redirect(trackedUrl, 302);
}
