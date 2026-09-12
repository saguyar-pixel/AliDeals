/**
 * Google Analytics 4 (GA4) Custom Events Helper Module
 * Implements exact CRO, Data & Tracking event specification for AliDeals
 */

export interface AffiliateClickoutParams {
  product_id: string;
  product_title: string;
  price_usd: number;
  sub_id: string;
  placement: string;
  destination_url?: string;
}

export interface ExitModalSearchParams {
  search_term: string;
  results_count: number;
}

export interface CustomsBundleSplitParams {
  total_bundle_price: number;
  order_1_price: number;
  order_2_price: number;
  estimated_tax_saved: number;
}

export interface UgcVoteSubmittedParams {
  product_id: string;
  is_eu_plug: boolean;
  delivery_days: number;
}

export interface NewsletterSignupParams {
  source: string;
}

/**
 * Universal safe GA4 event dispatcher
 */
export function trackGA4Event(eventName: string, params: Record<string, any>) {
  if (typeof window === "undefined") return;

  try {
    if (window.gtag) {
      window.gtag("event", eventName, params);
    } else if (Array.isArray((window as any).dataLayer)) {
      (window as any).dataLayer.push({
        event: eventName,
        ...params,
      });
    }
  } catch (err) {
    console.warn(`[GA4] Failed to emit event '${eventName}':`, err);
  }
}

/**
 * 1. affiliate_clickout (בכל יציאה לאליאקספרס)
 */
export function trackAffiliateClickout(params: AffiliateClickoutParams) {
  trackGA4Event("affiliate_clickout", {
    product_id: params.product_id,
    product_title: params.product_title,
    price_usd: params.price_usd,
    sub_id: params.sub_id,
    placement: params.placement,
    destination_url: params.destination_url || "",
    currency: "USD",
    value: Math.round(params.price_usd * 0.08 * 100) / 100, // Estimated commission
  });
}

/**
 * 2. exit_modal_search (שימוש במנוע החיפוש בתוך פופ-אפ היציאה)
 */
export function trackExitModalSearch(params: ExitModalSearchParams) {
  trackGA4Event("exit_modal_search", {
    search_term: params.search_term,
    results_count: params.results_count,
  });
}

/**
 * 3. customs_bundle_split_action (הקלקת משתמש על פיצול חבילה מעל $75)
 */
export function trackCustomsBundleSplitAction(params: CustomsBundleSplitParams) {
  trackGA4Event("customs_bundle_split_action", {
    total_bundle_price: params.total_bundle_price,
    order_1_price: params.order_1_price,
    order_2_price: params.order_2_price,
    estimated_tax_saved: params.estimated_tax_saved,
  });
}

/**
 * 4. ugc_vote_submitted (הזנת פידבק ישראלי מהיר)
 */
export function trackUgcVoteSubmitted(params: UgcVoteSubmittedParams) {
  trackGA4Event("ugc_vote_submitted", {
    product_id: params.product_id,
    is_eu_plug: params.is_eu_plug,
    delivery_days: params.delivery_days,
  });
}

/**
 * 5. newsletter_signup (הרשמה לדיוור דרך Brevo)
 */
export function trackNewsletterSignup(params: NewsletterSignupParams) {
  trackGA4Event("newsletter_signup", {
    source: params.source,
  });
}
