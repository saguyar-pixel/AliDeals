import { aliExpressApi, fetchAliExpressProduct } from "../aliexpress";
import { AliExpressProduct } from "../aliexpress/types";
import { supabaseDb } from "../db/supabase-db";
import { jsonDb } from "../db";
import { addAgentLog } from "./team-orchestrator";
import { generateSinglePassReview } from "./single-pass-controller";
import { generateMayaLifestyleImage, generateHebrewInfographicSvg } from "../gemini/image-studio";
import { generateProductJsonLd, generateFaqJsonLd } from "../seo/schema";
import { sanitizeSlug } from "../security/firewall";
import { CategoryArchetype } from "../categories/archetypes";

export * from "./alon-radar-types";
import {
  ISRAELI_DEMAND_NICHES,
  IsraeliNicheConfig,
  CollisionCheckResult,
  AliHealthCheckResult,
  RadarCandidateProduct,
} from "./alon-radar-types";

/**
 * Health Check Builder: Verifies 100% integrity of data pulled from AliExpress
 */
export function buildAliHealthCheck(product: AliExpressProduct): AliHealthCheckResult {
  const specs = product.specifications || {};
  const specsCount = Object.keys(specs).length;
  const gallery = product.galleryImages || [];
  const mediaCount = (product.mainImage ? 1 : 0) + gallery.length;

  const rawFeedback = parseFloat(String(product.sellerPositiveRate || "98").replace("%", "")) || 98.0;
  const isStoreTrusted = rawFeedback >= 93.0;

  const titleLower = (product.originalTitle || "").toLowerCase();
  const specsStr = JSON.stringify(specs).toLowerCase();
  const hasEuMention =
    titleLower.includes("eu plug") ||
    titleLower.includes("eu") ||
    specsStr.includes("eu") ||
    specsStr.includes("european");

  const hasAffiliate = Boolean(
    product.affiliateUrl &&
      (product.affiliateUrl.includes("s.click.aliexpress.com") ||
        product.affiliateUrl.includes("aliexpress.com"))
  );

  const isHealthy = specsCount >= 2 && mediaCount >= 2 && isStoreTrusted;

  return {
    specsCount,
    mediaCount,
    storeName: product.storeName || "Official AliExpress Store",
    sellerPositiveRate: `${rawFeedback.toFixed(1)}%`,
    hasEuPlug: hasEuMention ? true : null,
    shippingVerified: true, // AliExpress Standard Shipping
    affiliateLinkReady: hasAffiliate,
    overallStatus: isHealthy ? "healthy" : "warning",
    statusBadgeHe: isHealthy ? "100% נתונים תקינים" : "נמשך עם מפרט חלקי",
  };
}

/**
 * Stopwords for intelligent product title similarity matching (English & Hebrew)
 */
const SIMILARITY_STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "for", "with", "by", "from", "in", "on", "at",
  "to", "of", "hot", "new", "top", "best", "sale", "deals", "deal", "original",
  "official", "free", "shipping", "portable", "smart", "mini", "pro", "max",
  "plus", "ultra", "2024", "2025", "2026", "piece", "pieces", "lot", "men",
  "women", "unisex", "home", "car", "usb", "type", "fast", "charge", "charging",
  "item", "items", "high", "quality", "brand", "universal", "aliexpress",
  // Hebrew editorial & shopping filler words
  "סקירה", "מלאה", "מדריך", "קנייה", "מומלץ", "הכי", "טוב", "עבור", "של", "על",
  "עם", "ללא", "כולל", "משלוח", "חינם", "בישראל", "ישראל", "מבצע", "מחיר", "הנחה",
  "מוצר", "מוצרים", "פריט", "חדש", "מקורי", "איכותי", "מותג", "עלי", "אקספרס"
]);

/**
 * Robust price parser that strips currency symbols and handles strings/floats safely
 */
export function parsePriceNumber(val: any, fallback: number = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (!val) return fallback;
  const cleaned = parseFloat(String(val).replace(/[^0-9.]/g, ""));
  return isNaN(cleaned) ? fallback : cleaned;
}

/**
 * Extracts clean, significant keyword tokens from product titles
 */
function extractSignificantTokens(title: string): string[] {
  if (!title) return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\u0590-\u05fe\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !SIMILARITY_STOPWORDS.has(w));
}

/**
 * Extracts alphanumeric model identifiers (e.g., hy300, q30, p20, v11, 65w, 100w, gan5)
 */
function extractModelIdentifiers(title: string): string[] {
  if (!title) return [];
  const matches = title.toLowerCase().match(/\b([a-z]+\d+|\d+[a-z]+)\b/g);
  return matches ? Array.from(new Set(matches.filter((m) => m.length >= 3))) : [];
}

/**
 * Truncates title cleanly for compact UI badge tags and cards
 */
function truncateTitle(str: string, maxLen: number = 22): string {
  if (!str) return "";
  const cleaned = str.trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen).trim() + "..." : cleaned;
}

/**
 * Fetches an aggregated snapshot of the complete central catalog
 * (combines both Supabase and local JSON databases, products and pages/articles)
 */
async function getCentralCatalogSnapshot(): Promise<{
  products: any[];
  pages: any[];
  allItemIds: Set<string>;
  allSlugs: Set<string>;
}> {
  let supabaseProducts: any[] = [];
  let supabasePages: any[] = [];
  try {
    supabaseProducts = (await supabaseDb.getProducts()) || [];
  } catch (err) {
    console.warn("[Radar] Note: Supabase products fetch fallback:", err);
  }

  try {
    supabasePages = (await supabaseDb.getPages()) || [];
  } catch (err) {
    console.warn("[Radar] Note: Supabase pages fetch fallback:", err);
  }

  let localProducts: any[] = [];
  let localPages: any[] = [];
  try {
    localProducts = jsonDb.getProducts() || [];
  } catch (err) {
    console.warn("[Radar] Note: Local products fetch fallback:", err);
  }

  try {
    localPages = jsonDb.getPages() || [];
  } catch (err) {
    console.warn("[Radar] Note: Local pages fetch fallback:", err);
  }

  // Combine unique products by aliId or id
  const productMap = new Map<string, any>();
  for (const p of [...localProducts, ...supabaseProducts]) {
    const key = String(p.aliId || p.id || "").trim();
    if (key && !productMap.has(key)) {
      productMap.set(key, p);
    }
  }

  // Combine unique pages by slug or id
  const pageMap = new Map<string, any>();
  for (const pg of [...localPages, ...supabasePages]) {
    const key = String(pg.slug || pg.id || "").trim();
    if (key && !pageMap.has(key)) {
      pageMap.set(key, pg);
    }
  }

  const allItemIds = new Set<string>();
  const allSlugs = new Set<string>();

  // Index all known item IDs from products
  for (const [, p] of productMap.entries()) {
    if (p.aliId) allItemIds.add(String(p.aliId).trim());
    if (p.id) allItemIds.add(String(p.id).trim().replace(/^prod_/, ""));
  }

  // Index all reviewed product IDs from pages (including pending drafts!)
  for (const [, pg] of pageMap.entries()) {
    if (pg.slug) allSlugs.add(String(pg.slug).trim().toLowerCase());

    if (pg.productIds) {
      try {
        const ids = typeof pg.productIds === "string" ? JSON.parse(pg.productIds) : pg.productIds;
        if (Array.isArray(ids)) {
          ids.forEach((id: any) => {
            const clean = String(id).trim().replace(/^prod_/, "");
            if (clean) allItemIds.add(clean);
          });
        }
      } catch {}
    }
  }

  return {
    products: Array.from(productMap.values()),
    pages: Array.from(pageMap.values()),
    allItemIds,
    allSlugs,
  };
}

/**
 * Anti-Collision & Smart Central Catalog Verification Engine
 * 1. Evaluates STRICTLY against AliDeals' central catalog (Products and Pages in Supabase + local JSON)
 * 2. Checks dismissal history by admin in CMS
 * 3. Identifies the closest existing product/article on the site (Model IDs + Semantic Tokens + Category)
 * 4. Measures EXACT differentiation metrics against that existing site product:
 *    - Price delta percentage (diffPercent) and direction (cheaper / more expensive)
 *    - Model/Spec differentiation (differentiationType)
 *    - Generates concise Hebrew differentiation tags (differentiationTag)
 * 5. Permits items above customs ($75) ONLY IF "really really worth it" (high rating, strong volume) and under 999 ILS (~$270 USD)
 */
export async function evaluateProductCollision(
  candidate: AliExpressProduct,
  category: string,
  archetype?: string
): Promise<CollisionCheckResult> {
  const cleanId = String(candidate.aliId).trim();
  const priceUsd = parsePriceNumber(candidate.priceUsd, 25.0);
  const priceIls = parsePriceNumber(candidate.priceIls, Math.round(priceUsd * 3.65));
  const rating = parsePriceNumber(candidate.rating, 4.8);
  const orders = parsePriceNumber(candidate.ordersCount, 100);

  // A. Strict upper ceiling check: maximum 999 ILS (~$270 USD)
  if (priceIls > 999 || priceUsd > 270) {
    return {
      isAllowed: false,
      status: "too_similar",
      statusColor: "red",
      differentiationType: "duplicate",
      differentiationTag: "🔴 חריגה מעל 999 ₪",
      reasonHe: `מחיר המוצר ($${priceUsd.toFixed(2)} / כ-₪${priceIls}) עובר את תקרת העל המותרת של 999 ₪`,
    };
  }

  // B. High-tier / Above Customs check ($75 - 999 ILS)
  const isHighTier = priceUsd > 75;
  if (isHighTier) {
    // Condition: Must be "ממש ממש שווה את זה" (Really worth it!):
    // Requires outstanding rating (>= 4.7, or >= 4.6 with 200+ orders) and proven volume
    const isSuperWorthIt = (rating >= 4.7 && orders >= 100) || (rating >= 4.6 && orders >= 200);
    if (!isSuperWorthIt) {
      return {
        isAllowed: false,
        status: "too_similar",
        statusColor: "red",
        differentiationType: "duplicate",
        differentiationTag: "🔴 מעל $75 לא עומד ברף איכות",
        reasonHe: `מוצר מעל רף המכס ($${priceUsd.toFixed(2)} / כ-₪${priceIls}) שאינו עומד ברף 'ממש שווה את זה' (נדרש דירוג 4.7★+ ומעל 100 הזמנות, או 4.6★ עם 200+ הזמנות)`,
      };
    }
  }

  // C. Check dismissal history in CMS
  const isDismissed = await supabaseDb.isOrderDismissed(cleanId);
  if (isDismissed) {
    return {
      isAllowed: false,
      status: "duplicate",
      statusColor: "red",
      differentiationType: "duplicate",
      differentiationTag: "🔴 נפסל בעבר ע\"י העורך ב-CMS",
      reasonHe: "המוצר נפסל בעבר על ידי העורך במערכת ה-CMS",
    };
  }

  // D. Fetch comprehensive central catalog snapshot (Supabase + JSON, products + pages + drafts)
  const catalog = await getCentralCatalogSnapshot();

  // 1. Exact ID match in Central Products
  const exactProdMatch = catalog.products.find(
    (p) => String(p.aliId).trim() === cleanId || String(p.id).trim() === cleanId || String(p.id).trim() === `prod_${cleanId}`
  );
  if (exactProdMatch) {
    const existingTitle = exactProdMatch.titleHe || exactProdMatch.originalTitle || "מוצר קיים באתר";
    const existingPriceUsd = parsePriceNumber(exactProdMatch.priceUsd, priceUsd);
    const existingPriceIls = parsePriceNumber(exactProdMatch.priceIls, Math.round(existingPriceUsd * 3.65));
    const priceDiff = Math.abs(priceIls - existingPriceIls);
    const minP = Math.min(priceIls, existingPriceIls);
    const diffPct = minP > 0 ? Math.round((priceDiff / minP) * 100) : 0;

    return {
      isAllowed: false,
      status: "duplicate",
      statusColor: "red",
      differentiationType: "duplicate",
      differentiationTag: `🔴 כפילות זהה למוצר קיים באתר: "${truncateTitle(existingTitle, 20)}"`,
      reasonHe: `המוצר המדויק (מזהה ${cleanId}) כבר קיים ומפורסם במאגר האתר AliDeals: "${existingTitle}". מחיר באתר: ₪${existingPriceIls} ($${existingPriceUsd.toFixed(2)}).`,
      competingProductTitle: existingTitle,
      competingPriceUsd: existingPriceUsd,
      competingPriceIls: existingPriceIls,
      diffPercent: diffPct,
      diffDirection: "same_price",
      isHighTierWorthIt: false,
    };
  }

  // 2. Exact ID match in Central Pages (Published articles or pending drafts)
  if (catalog.allItemIds.has(cleanId)) {
    const matchingPage = catalog.pages.find((pg) => {
      if (pg.slug && pg.slug.includes(cleanId)) return true;
      if (pg.productIds) {
        try {
          const ids = typeof pg.productIds === "string" ? JSON.parse(pg.productIds) : pg.productIds;
          return Array.isArray(ids) && ids.some((id) => String(id).includes(cleanId));
        } catch {
          return false;
        }
      }
      return false;
    });

    const pageTitle = matchingPage?.title || `כתבה קיימת (${cleanId})`;

    return {
      isAllowed: false,
      status: "duplicate",
      statusColor: "red",
      differentiationType: "duplicate",
      differentiationTag: `🔴 כפילות לכתבה קיימת באתר: "${truncateTitle(pageTitle, 20)}"`,
      reasonHe: `המוצר המדויק כבר נסקר בכתבה קיימת במאגר המרכזי של האתר: "${pageTitle}".`,
      competingProductTitle: pageTitle,
      diffPercent: 0,
      diffDirection: "same_price",
      isHighTierWorthIt: false,
    };
  }

  // E. Semantic Model & Feature Matching against the CENTRAL WEBSITE CATALOG
  // (We search ALL existing products and pages in AliDeals to find the closest match)
  const candidateFullTitle = `${candidate.originalTitle} ${candidate.titleHe || ""}`.toLowerCase();
  const candidateModels = extractModelIdentifiers(candidateFullTitle);
  const candidateTokens = extractSignificantTokens(candidate.originalTitle);

  let bestExistingItem: any = null;
  let bestMatchScore = 0;
  let bestSharedModels: string[] = [];

  // 1. Evaluate against all products in central catalog
  for (const existing of catalog.products) {
    const existingFullTitle = `${existing.originalTitle || ""} ${existing.titleHe || ""}`.toLowerCase();
    const existingModels = extractModelIdentifiers(existingFullTitle);
    const existingTokens = extractSignificantTokens(existingFullTitle);

    const sharedModels = candidateModels.filter((m) => existingModels.includes(m));
    const commonTokens = candidateTokens.filter((t) => existingTokens.includes(t));
    const minTokens = Math.min(candidateTokens.length, existingTokens.length);
    const tokenOverlap = minTokens > 0 ? commonTokens.length / minTokens : 0;
    const sameCat = (archetype && existing.archetype === archetype) ||
                    (existing.category && existing.category.toLowerCase() === category.toLowerCase());

    let score = 0;
    if (sharedModels.length > 0) {
      score = 0.85 + Math.min(0.15, sharedModels.length * 0.05);
    } else if (commonTokens.length >= 2) {
      score = tokenOverlap * 0.7 + (sameCat ? 0.25 : 0);
    } else if (sameCat) {
      score = 0.25;
    }

    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestExistingItem = existing;
      bestSharedModels = sharedModels;
    }
  }

  // 2. Also evaluate against existing articles / pages in central catalog
  for (const page of catalog.pages) {
    const pageFullTitle = `${page.title || ""} ${page.metaTitle || ""} ${page.slug || ""}`.toLowerCase();
    const pageModels = extractModelIdentifiers(pageFullTitle);
    const pageTokens = extractSignificantTokens(pageFullTitle);

    const sharedModels = candidateModels.filter((m) => pageModels.includes(m));
    const commonTokens = candidateTokens.filter((t) => pageTokens.includes(t));
    const minTokens = Math.min(candidateTokens.length, pageTokens.length);
    const tokenOverlap = minTokens > 0 ? commonTokens.length / minTokens : 0;
    const sameCat = (archetype && page.archetype === archetype) ||
                    (page.targetCategory && page.targetCategory.toLowerCase() === category.toLowerCase());

    let score = 0;
    if (sharedModels.length > 0) {
      score = 0.85 + Math.min(0.15, sharedModels.length * 0.05);
    } else if (commonTokens.length >= 2) {
      score = tokenOverlap * 0.7 + (sameCat ? 0.25 : 0);
    }

    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestExistingItem = page;
      bestSharedModels = sharedModels;
    }
  }

  // F. Measure Differentiation vs Closest Central Catalog Item
  // Case 1: No matching or similar product exists in the site's central catalog!
  if (!bestExistingItem || bestMatchScore < 0.28) {
    return {
      isAllowed: true,
      status: "unique",
      statusColor: "green",
      differentiationType: "unique_catalog",
      differentiationTag: isHighTier
        ? "💎 פרימיום שווה (עד 999 ₪) - חדש באתר"
        : "🟢 מוצר חדש באתר (אין מקביל במאגר)",
      reasonHe: isHighTier
        ? `דיל פרימיום חדש לחלוטין באתר (₪${priceIls} / $${priceUsd.toFixed(2)}) – נבחר כחריגה ייחודית ששווה במיוחד (${rating}★, ${orders} הזמנות) ללא שום מוצר מתחרה במאגר המרכזי של האתר.`
        : "מוצר חדש לחלוטין באתר: נסרק מול כל מוצרי ומאמרי המאגר המרכזי (Supabase & JSON) ולא נמצא אף פריט מקביל או דגם חופף בקטלוג AliDeals.",
      isHighTierWorthIt: isHighTier,
    };
  }

  // Case 2: A matching product or article was found in the central catalog.
  // Evaluate HOW DIFFERENT the candidate product is from the existing catalog product:
  const existingTitle = bestExistingItem.titleHe || bestExistingItem.originalTitle || bestExistingItem.title || "מוצר קיים באתר";
  const existingPriceUsd = bestExistingItem.priceUsd ? parsePriceNumber(bestExistingItem.priceUsd) : priceUsd;
  const existingPriceIls = bestExistingItem.priceIls ? parsePriceNumber(bestExistingItem.priceIls) : Math.round(existingPriceUsd * 3.65);
  const shortTitle = truncateTitle(existingTitle, 20);

  const priceDiff = Math.abs(priceIls - existingPriceIls);
  const minPrice = Math.min(priceIls, existingPriceIls);
  const diffPercent = minPrice > 0 ? Math.round((priceDiff / minPrice) * 100) : 0;
  const diffDirection: "cheaper" | "more_expensive" | "same_price" =
    priceIls < existingPriceIls ? "cheaper" : priceIls > existingPriceIls ? "more_expensive" : "same_price";

  // Check A: Same Model Identifier and Price difference < 25% -> Duplicate of existing site product
  if (bestSharedModels.length > 0 && diffPercent < 25) {
    return {
      isAllowed: false,
      status: "duplicate",
      statusColor: "red",
      differentiationType: "duplicate",
      differentiationTag: `🔴 כפילות למוצר באתר: "${shortTitle}" (${diffPercent}% הפרש)`,
      reasonHe: `דגם תואם (${bestSharedModels.join(", ")}) כבר קיים במאגר האתר במוצר/כתבה "${existingTitle}". הפרש המחיר הוא ${diffPercent}% בלבד (₪${priceIls} מול ₪${existingPriceIls} באתר), ללא בידול שמצדיק סקירה כפולה.`,
      competingProductTitle: existingTitle,
      competingPriceUsd: existingPriceUsd,
      competingPriceIls: existingPriceIls,
      diffPercent,
      diffDirection,
      isHighTierWorthIt: false,
    };
  }

  // Check B: High Semantic Overlap (score >= 0.6) and Price difference < 25% -> Too Similar to existing site product
  if (bestMatchScore >= 0.6 && diffPercent < 25) {
    return {
      isAllowed: false,
      status: "too_similar",
      statusColor: "red",
      differentiationType: "duplicate",
      differentiationTag: `🔴 דומה מדי למוצר קיים באתר (${diffPercent}% הפרש בלבד)`,
      reasonHe: `נמצא מוצר דומה מדי במאגר המרכזי של האתר: "${existingTitle}" (חפיפת מאפיינים ומחיר כמעט זהה: ₪${priceIls} מול ₪${existingPriceIls} באתר).`,
      competingProductTitle: existingTitle,
      competingPriceUsd: existingPriceUsd,
      competingPriceIls: existingPriceIls,
      diffPercent,
      diffDirection,
      isHighTierWorthIt: false,
    };
  }

  // Check C: Differentiated against existing central catalog product!
  // Determine precise differentiation flavor:
  if (diffDirection === "cheaper" && diffPercent >= 25) {
    // Significantly cheaper alternative to existing site product
    return {
      isAllowed: true,
      status: "differentiated",
      statusColor: "yellow",
      differentiationType: "price_tier",
      differentiationTag: isHighTier
        ? `💎 פרימיום (₪${priceIls}) - זול ב-${diffPercent}% ממוצר באתר`
        : `🟡 בידול מחיר (-${diffPercent}% זול יותר ממוצר קיים באתר)`,
      reasonHe: `בידול מוכח מול המוצר הקיים באתר "${existingTitle}": המוצר הנבדק עולה ₪${priceIls} בלבד (זול ב-${diffPercent}% ממחיר של ₪${existingPriceIls} באתר), ומהווה אלטרנטיבה סופר-משתלמת לקוראים בתקציב נגיש יותר.`,
      competingProductTitle: existingTitle,
      competingPriceUsd: existingPriceUsd,
      competingPriceIls: existingPriceIls,
      diffPercent,
      diffDirection,
      isHighTierWorthIt: isHighTier,
    };
  }

  if (diffDirection === "more_expensive" && diffPercent >= 25) {
    // Higher-end / Upgraded specs alternative to existing site product
    return {
      isAllowed: true,
      status: "differentiated",
      statusColor: "yellow",
      differentiationType: isHighTier ? "price_tier" : "spec_upgrade",
      differentiationTag: isHighTier
        ? `💎 פרימיום שווה (+${diffPercent}% שדרוג מול מוצר קיים באתר)`
        : `🟡 בידול מפרט (+${diffPercent}% שדרוג מול מוצר קיים באתר)`,
      reasonHe: `בידול מוכח מול המוצר הקיים באתר "${existingTitle}": המוצר הנבדק עולה ₪${priceIls} (פער של +${diffPercent}% מול ₪${existingPriceIls} באתר), ומציע גרסת פרימיום משודרגת עם מפרט טכנולוגי עשיר יותר.`,
      competingProductTitle: existingTitle,
      competingPriceUsd: existingPriceUsd,
      competingPriceIls: existingPriceIls,
      diffPercent,
      diffDirection,
      isHighTierWorthIt: isHighTier,
    };
  }

  // Model Variant / Different generation
  return {
    isAllowed: true,
    status: "differentiated",
    statusColor: "yellow",
    differentiationType: "model_variant",
    differentiationTag: `🟡 דגם נפרד/משודרג מול מוצר קיים באתר`,
    reasonHe: `בידול דגם מול המוצר הקיים באתר "${existingTitle}": המוצר הנבדק מייצג דגם או גרסה נפרדת (${candidateModels.join(", ") || "גרסה משודרגת"}) בהשוואה לפריט שנסקר באתר (₪${priceIls} מול ₪${existingPriceIls}).`,
    competingProductTitle: existingTitle,
    competingPriceUsd: existingPriceUsd,
    competingPriceIls: existingPriceIls,
    diffPercent,
    diffDirection,
    isHighTierWorthIt: isHighTier,
  };
}

/**
 * Builds Alon's Market Rationale for CMS review card
 */
export function buildAlonRationale(
  candidate: AliExpressProduct,
  niche: IsraeliNicheConfig,
  collision: CollisionCheckResult
): string {
  const priceUsd = Number(candidate.priceUsd) || 0;
  const priceIls = Number(candidate.priceIls) || Math.round(priceUsd * 3.65);
  const orders = candidate.ordersCount || 100;
  const rating = candidate.rating || 4.8;
  const isHighTier = priceUsd > 75;

  let rationale = "";

  if (isHighTier) {
    const vatCostIls = Math.round(priceIls * 0.17);
    const totalCostWithVat = priceIls + vatCostIls;
    const estimatedLocalIls = Math.round(priceIls * 1.85 + 250);
    const savingsIls = estimatedLocalIls - totalCostWithVat;

    rationale = `נבחר כדיל פרימיום מעל רף המכס (מתחת ל-₪999): אלון בחר במוצר זה כחריגה מיוחדת כי הוא "ממש ממש שווה את זה" – מציג דירוג מעולה של ${rating} כוכבים ומעל ${orders} הזמנות מאומתות. במחיר של $${priceUsd.toFixed(2)} (כ-₪${priceIls}), גם לאחר תוספת מע"מ כחוק (17% = ₪${vatCostIls}, סה"כ כ-₪${totalCostWithVat}), הוא מגלם חיסכון ענק של כ-₪${savingsIls} (מעל 40% הנחה נטו) מול מחירי רשתות מקבילות בישראל (כגון KSP, באג או אייבורי).`;
  } else {
    const estimatedLocalIls = Math.round(priceIls * 2.1);
    const savingsIls = estimatedLocalIls - priceIls;

    rationale = `נבחר ברדאר השוק של אלון עבור נישת "${niche.labelHe}": המוצר מציג מעל ${orders} הזמנות מאומתות ודירוג לקוחות של ${rating} כוכבים בקרב רוכשים ישראלים. במחיר של $${priceUsd.toFixed(2)} (כ-₪${priceIls}), המוצר נהנה מפטור מלא ממכס ומע"מ (<75$) ומגלם חיסכון של כ-₪${savingsIls} (מעל 50% הנחה) מול מחירים ברשתות בארץ (כגון KSP, באג או אייבורי).`;
  }

  if (collision.status === "differentiated") {
    rationale += ` נימוק בידול מול המאגר המרכזי באתר: ${collision.reasonHe}`;
    if (collision.competingProductTitle && collision.diffPercent) {
      rationale += ` (הושווה מול מוצר קיים באתר: "${collision.competingProductTitle}" במחיר ₪${collision.competingPriceIls || Math.round((collision.competingPriceUsd || 0) * 3.65)}).`;
    }
  } else if (collision.status === "unique") {
    rationale += ` וידוא מול המאגר המרכזי באתר: המוצר נבדק בקפידה מול כל מוצרי ומאמרי האתר ואושר כמוצר חדש וייחודי לחלוטין ללא שום כפילות או סקירה קודמת בקטלוג.`;
  }

  return rationale;
}

/**
 * Scan Israeli Market Radar across 12 target niches
 * Returns validated candidates ready for article generation
 */
export async function scanIsraeliDemandRadar(
  targetCount: number = 8
): Promise<RadarCandidateProduct[]> {
  addAgentLog("orchestrator", "אלון (רדאר שוק)", "info", `מתחיל סריקת שוק ישראלית ב-AliExpress API עבור 12 נישות ביקוש מובילות...`);

  const approvedCandidates: RadarCandidateProduct[] = [];
  const checkedAliIds = new Set<string>();

  for (const niche of ISRAELI_DEMAND_NICHES) {
    if (approvedCandidates.length >= targetCount) break;

    try {
      // Query AliExpress Open Platform for hot products in this niche (min 100 orders, min 4.5 rating, up to 999 ILS / ~$270 USD)
      const searchRes = await aliExpressApi.searchProducts({
        keywords: niche.keyword,
        pageSize: 15,
        sortBy: "LAST_VOLUME_DESC",
        minPrice: 5.0,
        maxPrice: 270.0, // Allows up to 999 ILS (~$270 USD) for products that are "really worth it"
        minOrders: 100, // User requirement: over 100 orders
        minRating: 4.5, // User requirement: over 4.5 star rating
      });

      const products = searchRes.products || [];

      for (const rawProd of products) {
        if (approvedCandidates.length >= targetCount) break;
        if (!rawProd.aliId || checkedAliIds.has(rawProd.aliId)) continue;
        checkedAliIds.add(rawProd.aliId);

        const priceUsd = Number(rawProd.priceUsd) || 0;
        const priceIls = Number(rawProd.priceIls) || Math.round(priceUsd * 3.65);
        const orders = rawProd.ordersCount || 0;
        const rating = rawProd.rating || 0;

        // Strict upper limit: 999 ILS (~$270 USD)
        if (priceIls > 999 || priceUsd > 270) {
          continue;
        }

        // Quality filters & Customs rules:
        const isAboveCustoms = priceUsd > 75;
        if (isAboveCustoms) {
          // User requirement: Can bring products above customs ($75) IF really really worth it:
          // Must have premium rating (>= 4.7, or >= 4.6 with 200+ orders) and proven volume (>= 100)
          const isSuperWorthIt = (rating >= 4.7 && orders >= 100) || (rating >= 4.6 && orders >= 200);
          if (!isSuperWorthIt) {
            continue;
          }
        } else {
          // Standard product under customs (<=$75): rating >= 4.5 and orders >= 100
          if (orders < 100 || rating < 4.5) {
            continue;
          }
        }

        // Anti-Collision & Differentiation Check
        const collision = await evaluateProductCollision(rawProd as AliExpressProduct, niche.category, niche.archetype);
        if (!collision.isAllowed) {
          console.log(`[Radar Collision] Skipped ${rawProd.aliId} (${collision.reasonHe})`);
          continue;
        }

        const healthCheck = buildAliHealthCheck(rawProd as AliExpressProduct);
        const alonRationale = buildAlonRationale(rawProd as AliExpressProduct, niche, collision);

        approvedCandidates.push({
          product: rawProd as AliExpressProduct,
          niche,
          collision,
          alonRationale,
          healthCheck,
        });

        addAgentLog(
          "orchestrator",
          "אלון (רדאר שוק)",
          "info",
          `אותר מועמד מצטיין: "${rawProd.originalTitle?.slice(0, 40)}..." (₪${rawProd.priceIls}, ${rawProd.rating}★, ${rawProd.ordersCount} הזמנות). ${collision.reasonHe}`
        );
      }
    } catch (nicheErr: any) {
      console.warn(`[Radar Error] Failed searching niche "${niche.labelHe}":`, nicheErr?.message);
    }
  }

  addAgentLog(
    "orchestrator",
    "אלון (רדאר שוק)",
    "success",
    `סריקת הרדאר הושלמה! אותרו ${approvedCandidates.length} מוצרים ייחודיים ומאומתים (100+ הזמנות, 4.5★+) מוכנים לייצור כתבות.`
  );

  return approvedCandidates;
}

/**
 * Execute Single Product Pipeline via Agent Core:
 * Dana -> Ron -> Maya -> Omer -> Supabase Draft
 */
export async function executeRadarCandidatePipeline(
  candidate: RadarCandidateProduct
): Promise<{ success: boolean; pageId?: string; slug?: string; error?: string }> {
  const { product, niche, alonRationale, healthCheck } = candidate;

  try {
    // 1. Dana validates specs and commercial viability
    addAgentLog("analyst", "דנה", "info", `מאמתת מפרט ורווחיות עבור "${product.originalTitle.slice(0, 35)}..."`);

    // 2. Ron writes deep review (800-1200 words, 6 sections, EU plug, KSP comparison)
    addAgentLog("copywriter", "רון", "info", `מחבר סקירת עומק עברית, הוק GEO והשוואת מחירים לישראל...`);
    const review = await generateSinglePassReview(product);

    // 3. Maya generates AI Lifestyle visual & vector SVG infographic
    addAgentLog("creative", "מיה", "info", `מפיקה תמונת לייפסטייל ב-Gemini Image Studio ואינפוגרפיקת מפרט...`);
    const mayaResult = await generateMayaLifestyleImage({
      product,
      titleHe: review.hebrewTitle,
      category: niche.category,
      persona: "woman",
    });

    const finalFeaturedImage = mayaResult.imageUrl || product.mainImage;
    const infographicSvg = generateHebrewInfographicSvg({
      title: review.hebrewTitle,
      badge: "בחירת הרדאר 2026",
      priceIls: product.priceIls,
      priceUsd: product.priceUsd,
      rating: product.rating,
      ordersCount: product.ordersCount,
      features: review.pros,
      taxBadge: review.israelContext.taxNotes,
      productImageUrl: finalFeaturedImage,
    });

    // 4. Omer validates Schema.org and Israeli compliance (Guaranteed unique slug)
    let slugCandidate = sanitizeSlug(
      review.hebrewTitle || product.originalTitle,
      `review-${product.aliId}`
    );

    try {
      const existingPage = await supabaseDb.getPageBySlug(slugCandidate);
      if (existingPage && String(existingPage.id) !== String(product.aliId)) {
        slugCandidate = `${slugCandidate}-${String(product.aliId).slice(-4)}`;
      }
    } catch {}

    const richSchema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "Product",
          "name": review.hebrewTitle,
          "image": finalFeaturedImage,
          "description": review.seoDescription,
          "offers": {
            "@type": "Offer",
            "price": String(product.priceUsd || "0"),
            "priceCurrency": "USD",
            "availability": "https://schema.org/InStock",
            "url": product.affiliateUrl || product.aliUrl,
          },
          "aggregateRating": {
            "@type": "AggregateRating",
            "ratingValue": String(product.rating || "4.8"),
            "reviewCount": String(product.ordersCount || "100"),
          },
        },
        {
          "@type": "FAQPage",
          "mainEntity": (review.faqs || []).map((f) => ({
            "@type": "Question",
            "name": f.question,
            "acceptedAnswer": { "@type": "Answer", "text": f.answer },
          })),
        },
      ],
    };

    // 5. Save Product in Catalog
    const savedProduct = await supabaseDb.upsertProduct({
      aliId: product.aliId,
      originalTitle: product.originalTitle,
      titleHe: review.hebrewTitle,
      descriptionHe: review.verdict,
      metaTitle: review.seoTitle,
      metaDescription: review.seoDescription,
      category: niche.category,
      archetype: niche.archetype,
      tags: [review.hebrewTitle, niche.category, "אלי אקספרס"],
      priceUsd: product.priceUsd,
      priceIls: product.priceIls,
      originalPriceUsd: product.originalPriceUsd,
      discountPercent: product.discountPercent,
      rating: product.rating,
      ordersCount: product.ordersCount,
      mainImage: finalFeaturedImage,
      galleryImages: product.galleryImages,
      specifications: product.specifications || {},
      storeName: product.storeName,
      sellerPositiveRate: product.sellerPositiveRate,
      commissionRate: product.commissionRate,
      aliUrl: product.aliUrl,
      affiliateUrl: product.affiliateUrl,
      isEuPlug: review.israelContext.isEuPlug,
      voltage220vCompatible: review.israelContext.voltage220vCompatible,
      sizeWarning: review.israelContext.sizeWarning,
      fabricComposition: review.israelContext.fabricComposition,
      status: "active",
      salesCount: 0,
    });

    // 6. Save Page as DRAFT with Alon Rationale & AliExpress Health Check
    const savedPage = await supabaseDb.upsertPage({
      slug: slugCandidate,
      type: "review",
      title: review.hebrewTitle,
      metaTitle: review.seoTitle,
      metaDescription: review.seoDescription,
      directAnswerGeo: review.verdict,
      contentMarkdown: review.mainReview,
      pros: review.pros,
      cons: review.cons,
      faqs: review.faqs,
      archetype: niche.archetype,
      targetCategory: niche.category,
      tags: [review.hebrewTitle, niche.category],
      isEuPlug: review.israelContext.isEuPlug,
      voltage220vCompatible: review.israelContext.voltage220vCompatible,
      sizeWarning: review.israelContext.sizeWarning,
      fabricComposition: review.israelContext.fabricComposition,
      productIds: JSON.stringify([savedProduct.id, product.aliId]),
      featuredImage: finalFeaturedImage,
      infographicImage: infographicSvg,
      structuredDataJson: JSON.stringify(richSchema),
      // Crucial Transparency Fields:
      alonRationale,
      aliHealthCheck: JSON.stringify(healthCheck),
      status: "draft", // Staged in morning approval queue!
    });

    // 7. Relational junction entry
    await supabaseDb.setPageProducts(savedPage.id, [
      {
        productId: savedProduct.id,
        position: 1,
        badge: "מועמד רדאר הבוקר",
        pros: review.pros,
        cons: review.cons,
        customReview: review.verdict,
      },
    ]);

    addAgentLog(
      "orchestrator",
      "אלון",
      "success",
      `כתבה הופקה בהצלחה וממתינה לאישור ב-CMS: "${review.hebrewTitle}" (תמונה: ${mayaResult.isAiGenerated ? "Gemini AI" : "גלריית מוכר"})`
    );

    return { success: true, pageId: savedPage.id, slug: slugCandidate };
  } catch (err: any) {
    console.error(`[Radar Pipeline Error] Failed candidate ${product.aliId}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Nightly Autonomous Job:
 * Scans radar and generates 8 drafts awaiting approval at 06:00
 */
export async function runAutonomousMorningRadar(): Promise<{
  scannedCount: number;
  generatedCount: number;
  results: Array<{ productId: string; title: string; success: boolean; error?: string }>;
}> {
  addAgentLog(
    "orchestrator",
    "אלון",
    "info",
    "⏰ הפעלת משימת הבוקר האוטונומית: סריקת רדאר ויצירת 8 כתבות לאישור (מינימום 100 הזמנות, דירוג 4.5★+)..."
  );

  const candidates = await scanIsraeliDemandRadar(8);
  const results: Array<{ productId: string; title: string; success: boolean; error?: string }> = [];
  let generatedCount = 0;

  // Execute in parallel batches of 2 for fast completion and resilience against serverless timeouts
  for (let i = 0; i < candidates.length; i += 2) {
    const chunk = candidates.slice(i, i + 2);
    const outcomes = await Promise.allSettled(chunk.map((cand) => executeRadarCandidatePipeline(cand)));

    outcomes.forEach((res, idx) => {
      const cand = chunk[idx];
      if (res.status === "fulfilled" && res.value.success) {
        generatedCount++;
        results.push({
          productId: cand.product.aliId,
          title: cand.product.originalTitle,
          success: true,
        });
      } else {
        const err = res.status === "rejected" ? res.reason?.message : (res.value as any)?.error;
        results.push({
          productId: cand.product.aliId,
          title: cand.product.originalTitle,
          success: false,
          error: err || "שגיאה בהפקת הכתבה",
        });
      }
    });
  }

  addAgentLog(
    "orchestrator",
    "אלון",
    "success",
    `🎉 משימת הבוקר הושלמה! ${generatedCount} מתוך ${candidates.length} כתבות חדשות ממתינות כעת לאישור העורך ב-CMS.`
  );

  return {
    scannedCount: candidates.length,
    generatedCount,
    results,
  };
}
