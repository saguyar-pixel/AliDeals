/**
 * Google Analytics 4 (GA4) & GTM Behavioral Analytics Engine
 * Comprehensive Event Registry with Automatic Time & Scroll Context Enrichment.
 */

// Initialize page load timestamp in memory
let pageLoadTimestamp = typeof window !== "undefined" ? Date.now() : 0;

export function resetPageSessionTimer() {
  pageLoadTimestamp = Date.now();
}

/**
 * Returns seconds elapsed since the current page was loaded.
 */
export function getTimeOnPageSeconds(): number {
  if (typeof window === "undefined" || !pageLoadTimestamp) return 0;
  return Math.max(0, Math.round((Date.now() - pageLoadTimestamp) / 1000));
}

/**
 * Calculates current scroll depth percentage (0 to 100).
 */
export function getCurrentScrollDepth(): number {
  if (typeof window === "undefined" || typeof document === "undefined") return 0;
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  const docHeight = (document.documentElement.scrollHeight || 0) - (window.innerHeight || 0);
  if (docHeight <= 0) return 100;
  return Math.min(100, Math.max(0, Math.round((scrollTop / docHeight) * 100)));
}

/**
 * Infers page type from pathname.
 */
export function inferPageType(pathname: string): "review" | "top5" | "article" | "home" | "search" | "tools" | "other" {
  if (!pathname || pathname === "/") return "home";
  if (pathname.startsWith("/reviews")) return "review";
  if (pathname.startsWith("/top5")) return "top5";
  if (pathname.startsWith("/articles")) return "article";
  if (pathname.startsWith("/search")) return "search";
  if (pathname.startsWith("/tools")) return "tools";
  return "other";
}

/**
 * Universal contextual parameters appended to every event
 */
export function getContextualParams(): {
  page_path: string;
  page_type: string;
  time_to_action_seconds: number;
  scroll_depth_at_action: number;
  device_category: "mobile" | "tablet" | "desktop";
} {
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";
  const width = typeof window !== "undefined" ? window.innerWidth : 1024;
  const deviceCategory = width < 640 ? "mobile" : width < 1024 ? "tablet" : "desktop";

  return {
    page_path: pathname,
    page_type: inferPageType(pathname),
    time_to_action_seconds: getTimeOnPageSeconds(),
    scroll_depth_at_action: getCurrentScrollDepth(),
    device_category: deviceCategory,
  };
}

/**
 * Universal safe GA4 event dispatcher with dataLayer backup
 */
export function trackGA4Event(eventName: string, params: Record<string, any>) {
  if (typeof window === "undefined") return;

  const enrichedParams = {
    ...getContextualParams(),
    ...params,
  };

  try {
    if (window.gtag) {
      window.gtag("event", eventName, enrichedParams);
    } else if (Array.isArray((window as any).dataLayer)) {
      (window as any).dataLayer.push({
        event: eventName,
        ...enrichedParams,
      });
    }
  } catch (err) {
    console.warn(`[GA4] Failed to emit event '${eventName}':`, err);
  }
}

// ==========================================
// SPECIFIC CRO & BEHAVIORAL EVENT INTERFACES
// ==========================================

export interface AffiliateClickoutParams {
  product_id: string;
  product_title: string;
  price_usd: number;
  sub_id: string;
  placement: string;
  destination_url?: string;
}

export interface CouponCopiedParams {
  coupon_code: string;
  discount_value?: string;
  min_spend?: string;
  placement: "review_inline_box" | "exit_modal" | "deal_card" | "header_promo" | "unknown";
  product_id?: string;
  product_title?: string;
}

export interface DealShareClickParams {
  platform: "whatsapp" | "telegram" | "copy_link" | "native_share";
  content_type: "review" | "deal" | "top5" | "article" | "calculator";
  item_id?: string;
  title: string;
  price_ils?: number;
  price_usd?: number;
  is_tax_exempt?: boolean;
  variant?: "inline" | "compact" | "card";
}

export interface CalculatorUsedParams {
  calculator_name: "israel_customs_vat" | "clothing_size" | "shoe_size" | "currency_converter";
  input_amount?: number;
  currency?: "USD" | "ILS";
  is_tax_exempt?: boolean;
  buffer_warning_triggered?: boolean;
  estimated_vat_ils?: number;
}

export interface ReviewEngagementParams {
  section_name: "direct_answer" | "pros_cons" | "faq_accordion" | "ugc_badges" | "infographic";
  page_slug: string;
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

// ==========================================
// EXPORTED EVENT TRIGGER FUNCTIONS
// ==========================================

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
 * 2. coupon_copied (העתקת קוד קופון עם מיקום, זמן ועומק גלילה)
 */
export function trackCouponCopied(params: CouponCopiedParams) {
  trackGA4Event("coupon_copied", {
    coupon_code: params.coupon_code,
    discount_value: params.discount_value || "",
    min_spend: params.min_spend || "",
    placement: params.placement,
    product_id: params.product_id || "",
    product_title: params.product_title || "",
  });
}

/**
 * 3. deal_share_click (שיתוף ויראלי בוואטסאפ / טלגרם / קישור)
 */
export function trackDealShareClick(params: DealShareClickParams) {
  trackGA4Event("deal_share_click", {
    platform: params.platform,
    content_type: params.content_type,
    item_id: params.item_id || "",
    title: params.title,
    price_ils: params.price_ils || 0,
    price_usd: params.price_usd || 0,
    is_tax_exempt: Boolean(params.is_tax_exempt),
    variant: params.variant || "inline",
  });
}

/**
 * 4. calculator_used (שימוש במחשבון מכס או מידות)
 */
export function trackCalculatorUsed(params: CalculatorUsedParams) {
  trackGA4Event("calculator_used", {
    calculator_name: params.calculator_name,
    input_amount: params.input_amount || 0,
    currency: params.currency || "USD",
    is_tax_exempt: params.is_tax_exempt !== undefined ? params.is_tax_exempt : null,
    buffer_warning_triggered: Boolean(params.buffer_warning_triggered),
    estimated_vat_ils: params.estimated_vat_ils || 0,
  });
}

/**
 * 5. review_engagement (מעורבות קריאה בסקציה ספציפית בסקירה)
 */
export function trackReviewEngagement(params: ReviewEngagementParams) {
  trackGA4Event("review_engagement", {
    section_name: params.section_name,
    page_slug: params.page_slug,
  });
}

/**
 * 6. exit_modal_search (חיפוש בתוך פופ-אפ היציאה)
 */
export function trackExitModalSearch(params: ExitModalSearchParams) {
  trackGA4Event("exit_modal_search", {
    search_term: params.search_term,
    results_count: params.results_count,
  });
}

/**
 * 7. customs_bundle_split_action (פיצול חבילה מעל $75)
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
 * 8. ugc_vote_submitted (הזנת פידבק ישראלי מהיר)
 */
export function trackUgcVoteSubmitted(params: UgcVoteSubmittedParams) {
  trackGA4Event("ugc_vote_submitted", {
    product_id: params.product_id,
    is_eu_plug: params.is_eu_plug,
    delivery_days: params.delivery_days,
  });
}

/**
 * 9. newsletter_signup (הרשמה לדיוור)
 */
export function trackNewsletterSignup(params: NewsletterSignupParams) {
  trackGA4Event("newsletter_signup", {
    source: params.source,
  });
}

/**
 * 10. ugc_drawer_opened (פתיחת משוב קהילה)
 */
export function trackUgcDrawerOpened(productId: string) {
  trackGA4Event("ugc_drawer_opened", {
    product_id: productId,
  });
}
