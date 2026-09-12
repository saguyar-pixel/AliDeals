"use client";

/**
 * GA4 Telemetry Schemas & Validator for AliDeals
 */
export const GA4_EVENT_SCHEMAS = {
  affiliate_clickout: {
    eventName: "affiliate_clickout",
    requiredFields: ["product_id", "product_title", "price_usd", "source_page", "affiliate_url", "is_preverified"],
    description: "Fired when user clicks any outbound affiliate link to AliExpress",
  },
  exit_modal_search: {
    eventName: "exit_modal_search",
    requiredFields: ["search_term", "source_url", "trigger_intent"],
    description: "Fired when user uses the exit-intent search modal",
  },
  customs_bundle_split_action: {
    eventName: "customs_bundle_split_action",
    requiredFields: ["total_cart_usd", "split_package_count", "tax_saved_estimated_ils"],
    description: "Fired when user splits a cart to stay under the 75$ customs threshold",
  },
  ugc_vote_submitted: {
    eventName: "ugc_vote_submitted",
    requiredFields: ["product_id", "vote_type", "user_trust_level"],
    description: "Fired when user submits an Israeli community UGC verification vote",
  },
  newsletter_signup: {
    eventName: "newsletter_signup",
    requiredFields: ["source_placement", "preferred_category"],
    description: "Fired when user registers for deal alerts / Telegram bot",
  },
} as const;

/**
 * Validate that an event payload conforms to schema
 */
export function validateTelemetryPayload(
  eventName: keyof typeof GA4_EVENT_SCHEMAS,
  payload: Record<string, any>
): { valid: boolean; missingFields: string[] } {
  const schema = GA4_EVENT_SCHEMAS[eventName];
  if (!schema) {
    return { valid: false, missingFields: [`Unknown event name: ${eventName}`] };
  }

  const missing = schema.requiredFields.filter(
    (field) => payload[field] === undefined || payload[field] === null || payload[field] === ""
  );

  return {
    valid: missing.length === 0,
    missingFields: missing,
  };
}

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

function emitGtagEvent(eventName: string, params: Record<string, any>) {
  if (typeof window !== "undefined" && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", eventName, params);
  }
}

// 1. GA4: affiliate_clickout
export function trackAffiliateClickout(data: {
  product_id: string;
  product_title: string;
  price_usd: number;
  source_page: string;
  affiliate_url: string;
  is_preverified: boolean;
}) {
  const { utmSource, utmCampaign, clickId } = getUrlTrackingParams();
  emitGtagEvent("affiliate_clickout", {
    ...data,
    sub_id1: utmSource,
    sub_id2: utmCampaign,
    sub_id3: clickId,
  });
}

// 2. GA4: exit_modal_search
export function trackExitModalSearch(data: {
  search_term: string;
  source_url: string;
  trigger_intent: string;
}) {
  emitGtagEvent("exit_modal_search", data);
}

// 3. GA4: customs_bundle_split_action
export function trackCustomsBundleSplit(data: {
  total_cart_usd: number;
  split_package_count: number;
  tax_saved_estimated_ils: number;
}) {
  emitGtagEvent("customs_bundle_split_action", data);
}

// 4. GA4: ugc_vote_submitted
export function trackUgcVoteSubmitted(data: {
  product_id: string;
  vote_type: "verified_safe" | "beware_tax" | "poor_quality";
  user_trust_level: string;
}) {
  emitGtagEvent("ugc_vote_submitted", data);
}

// 5. GA4: newsletter_signup
export function trackNewsletterSignup(data: {
  source_placement: string;
  preferred_category: string;
}) {
  emitGtagEvent("newsletter_signup", data);
}

// Legacy alias for backward compatibility
export function trackAffiliateClick(productData: {
  productId: string;
  productName: string;
  priceUsd: number;
  priceIls: number;
  position?: string;
  affiliateUrl?: string;
}) {
  trackAffiliateClickout({
    product_id: productData.productId,
    product_title: productData.productName,
    price_usd: productData.priceUsd,
    source_page: typeof window !== "undefined" ? window.location.pathname : "direct",
    affiliate_url: productData.affiliateUrl || "https://www.aliexpress.com",
    is_preverified: true,
  });
}
