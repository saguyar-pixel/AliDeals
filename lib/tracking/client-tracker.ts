"use client";

/**
 * Extract UTM parameters and Click IDs from current window URL
 */
export function getUrlTrackingParams(): {
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  clickId: string;
} {
  if (typeof window === "undefined") {
    return { utmSource: "organic", utmMedium: "direct", utmCampaign: "general", clickId: "" };
  }

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get("utm_source") || "organic";
  const utmMedium = params.get("utm_medium") || "referral";
  const utmCampaign = params.get("utm_campaign") || "general";
  const clickId = params.get("gclid") || params.get("fbclid") || params.get("ttclid") || `c_${Date.now()}`;

  return { utmSource, utmMedium, utmCampaign, clickId };
}

/**
 * Format dynamic AliExpress affiliate link with SubIDs on the client side
 */
export function buildTrackedAliLink(originalUrl: string): string {
  if (!originalUrl) return "https://www.aliexpress.com";

  try {
    const { utmSource, utmCampaign, clickId } = getUrlTrackingParams();
    const subCombined = `${utmSource}_${utmCampaign}_${clickId.slice(0, 15)}`;

    const url = new URL(originalUrl);
    url.searchParams.set("sub_id", subCombined);
    return url.toString();
  } catch {
    return originalUrl;
  }
}

/**
 * Emit GA4 outbound affiliate click event
 */
export function trackAffiliateClick(productData: {
  productId: string;
  productName: string;
  priceUsd: number;
  priceIls: number;
  position?: string;
}) {
  if (typeof window !== "undefined" && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    const { utmSource, utmCampaign, clickId } = getUrlTrackingParams();

    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "affiliate_outbound_click", {
      product_id: productData.productId,
      product_name: productData.productName,
      price_usd: productData.priceUsd,
      price_ils: productData.priceIls,
      position: productData.position || "content_cta",
      sub_id1: utmSource,
      sub_id2: utmCampaign,
      sub_id3: clickId,
    });
  }
}
