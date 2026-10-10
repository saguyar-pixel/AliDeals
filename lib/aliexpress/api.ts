import crypto from "crypto";
import {
  AliExpressProduct,
  AffiliateOrder,
  AffiliateOrderItem,
  AffiliateOrderQueryOptions,
  AffiliateOrderQueryResult,
} from "./types";
import { analyticsDb } from "@/lib/db/analytics-db";
import { translateHebrewSearch } from "./translator";

const ALIEXPRESS_API_URL = "https://api-sg.aliexpress.com/rest"; // Official Open Platform Singapore gateway for Business & Affiliate APIs

/**
 * Format timestamp in AliExpress format (YYYY-MM-DD HH:mm:ss) in GMT+8 (Beijing/Singapore Time)
 */
export function formatAliExpressTime(date: Date): string {
  const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
  const gmt8Date = new Date(utcMs + 8 * 60 * 60 * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${gmt8Date.getFullYear()}-${pad(gmt8Date.getMonth() + 1)}-${pad(gmt8Date.getDate())} ${pad(
    gmt8Date.getHours()
  )}:${pad(gmt8Date.getMinutes())}:${pad(gmt8Date.getSeconds())}`;
}

/**
 * Format current timestamp in AliExpress format: YYYY-MM-DD HH:mm:ss (GMT+8)
 */
function getTimestamp(): string {
  return formatAliExpressTime(new Date());
}

/**
 * Calculate MD5 signature according to AliExpress Open Platform specification
 */
function generateSignature(params: Record<string, string>, appSecret: string): string {
  const sortedKeys = Object.keys(params).sort();
  let baseString = appSecret;
  for (const key of sortedKeys) {
    if (params[key] !== undefined && params[key] !== "") {
      baseString += key + params[key];
    }
  }
  baseString += appSecret;

  return crypto.createHash("md5").update(baseString, "utf8").digest("hex").toUpperCase();
}

function normalizeAliRating(raw: any): number {
  const parsed = parseFloat(String(raw || "4.8").replace(/[^0-9.]/g, "")) || 4.8;
  let normalized = parsed;
  if (normalized > 10) {
    // If e.g. 98.4 (meaning 98.4%), convert to 5-star scale: (98.4 / 100) * 5 = 4.92
    normalized = (normalized / 100) * 5;
  } else if (normalized > 5) {
    normalized = 5.0;
  }
  return Math.min(5.0, Math.max(1.0, Math.round(normalized * 100) / 100));
}

function normalizeCommissionRate(raw: any): number {
  const parsed = parseFloat(String(raw || "7.0").replace(/[^0-9.]/g, "")) || 7.0;
  return Math.min(99.99, Math.max(0.0, Math.round(parsed * 100) / 100));
}

/**
 * Safely converts AliExpress order monetary amounts (returned in integer cents) to USD dollars.
 * Examples:
 *   1058 -> 10.58 ($10.58)
 *   21 -> 0.21 ($0.21)
 *   "356" -> 3.56 ($3.56)
 *   "10.58" -> 10.58 (if already formatted with decimal point)
 */
export function parseAliExpressMonetary(rawVal: any): number {
  if (rawVal === undefined || rawVal === null || rawVal === "") return 0;
  const rawStr = String(rawVal).trim();
  // If it already contains a decimal point, parse directly as dollars
  if (rawStr.includes(".")) {
    const val = parseFloat(rawStr.replace(/[^0-9.]/g, "")) || 0;
    return Math.round(val * 100) / 100;
  }
  // Otherwise it's integer cents from AliExpress Open Platform
  const cents = parseInt(rawStr.replace(/[^0-9]/g, ""), 10) || 0;
  return Math.round((cents / 100) * 100) / 100;
}

export class AliExpressApiClient {
  private appKey: string;
  private appSecret: string;
  private trackingId: string;
  private lastRequestTime: number = 0;

  constructor(appKey?: string, appSecret?: string, trackingId?: string) {
    this.appKey = appKey || "";
    this.appSecret = appSecret || "";
    this.trackingId = trackingId || "";
  }

  public getEffectiveCredentials(): { appKey: string; appSecret: string; trackingId: string } {
    let dbSettings: any = {};
    try {
      dbSettings = analyticsDb.getSettings();
    } catch {
      // fallback
    }
    const appKey = this.appKey || process.env.ALIEXPRESS_APP_KEY || dbSettings?.aliexpressAppKey || "";
    const appSecret = this.appSecret || process.env.ALIEXPRESS_APP_SECRET || dbSettings?.aliexpressAppSecret || "";
    const trackingId =
      this.trackingId ||
      process.env.ALIEXPRESS_TRACKING_ID ||
      dbSettings?.aliexpressDefaultTrackingId ||
      "default";

    return { appKey, appSecret, trackingId };
  }

  public isConfigured(): boolean {
    const { appKey, appSecret } = this.getEffectiveCredentials();
    return Boolean(appKey && appSecret);
  }

  /**
   * Generic AliExpress API request executor with 1 QPS rate limit protection
   */
  private async execute(
    method: string,
    apiParams: Record<string, string>,
    credentialsOverride?: { appKey?: string; appSecret?: string }
  ): Promise<Record<string, unknown>> {
    const creds = this.getEffectiveCredentials();
    const appKey = credentialsOverride?.appKey || creds.appKey;
    const appSecret = credentialsOverride?.appSecret || creds.appSecret;

    if (!appKey || !appSecret) {
      throw new Error("מפתחות AliExpress API (APP_KEY / APP_SECRET) אינם מוגדרים במערכת");
    }

    // Strict 1 QPS Throttle Protection: Ensure requests are spaced at least 1000ms apart
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < 1050) {
      await new Promise((resolve) => setTimeout(resolve, 1050 - elapsed));
    }
    this.lastRequestTime = Date.now();

    const publicParams: Record<string, string> = {
      app_key: appKey,
      timestamp: getTimestamp(),
      format: "json",
      v: "2.0",
      sign_method: "md5",
      method: method,
    };

    const allParams: Record<string, string> = { ...publicParams, ...apiParams };
    const sign = generateSignature(allParams, appSecret);
    allParams.sign = sign;

    const bodyPayload = new URLSearchParams(allParams).toString();
    
    let response = await fetch(ALIEXPRESS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: bodyPayload,
    });

    if (!response.ok) {
      throw new Error(`AliExpress API request failed with status: ${response.status}`);
    }

    let json = (await response.json()) as Record<string, unknown>;

    // Handle Throttling (Error 15 / Throttling.Allocation) or InvalidApiPath
    if (json.error_response) {
      const err = json.error_response as Record<string, any>;
      if (err.code === 15 || String(err.sub_code || "").includes("Throttling")) {
        console.warn(`AliExpress QPS throttle hit for ${method}, waiting 1200ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, 1200));
        this.lastRequestTime = Date.now();

        const retryPublicParams: Record<string, string> = {
          app_key: appKey,
          timestamp: getTimestamp(),
          format: "json",
          v: "2.0",
          sign_method: "md5",
          method: method,
        };
        const retryAllParams: Record<string, string> = { ...retryPublicParams, ...apiParams };
        retryAllParams.sign = generateSignature(retryAllParams, appSecret);

        response = await fetch(ALIEXPRESS_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
          },
          body: new URLSearchParams(retryAllParams).toString(),
        });
        if (response.ok) {
          json = (await response.json()) as Record<string, unknown>;
        }
      } else if (
        err.sub_code === "InvalidApiPath" ||
        err.sub_code === "IncompleteSignature" ||
        err.msg === "The specified API Path is invalid"
      ) {
        const fallbackUrl = "https://eco.taobao.com/router/rest";
        console.warn(`Gateway notice for ${method} (${err.sub_code || err.msg}). Retrying on backup router ${fallbackUrl}...`);
        try {
          response = await fetch(fallbackUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
            },
            body: bodyPayload,
          });
          if (response.ok) {
            const fallbackJson = (await response.json()) as Record<string, unknown>;
            if (!fallbackJson.error_response) {
              json = fallbackJson;
            }
          }
        } catch (fbErr) {
          console.warn("Backup router retry attempt failed:", fbErr);
        }
      }
    }

    // Check if AliExpress returned an API-level error after retries
    if (json.error_response) {
      const err = json.error_response as Record<string, unknown>;
      const msg = err.sub_msg || err.msg || "AliExpress API error";
      console.warn("AliExpress API error response:", err);
      throw new Error(`שגיאת AliExpress API: ${msg} (קוד שגיאה: ${err.code || err.sub_code || 'N/A'})`);
    }

    return json;
  }

  /**
   * Health Check: Test connection to AliExpress API
   */
  async testConnection(customCredentials?: {
    appKey?: string;
    appSecret?: string;
    trackingId?: string;
  }): Promise<{ success: boolean; message: string; details?: any; effectiveTrackingId?: string }> {
    try {
      const creds = this.getEffectiveCredentials();
      const appKey = (customCredentials?.appKey || creds.appKey).trim();
      const appSecret = (customCredentials?.appSecret || creds.appSecret).trim();
      const trackingId = (customCredentials?.trackingId || creds.trackingId).trim() || "default";

      if (!appKey || !appSecret) {
        return {
          success: false,
          message: "מפתחות API אינם מוגדרים. יש להזין APP KEY ו-APP SECRET בהגדרות או ב-Vercel.",
        };
      }

      // Quick test query against official Singapore gateway
      const result = await this.execute(
        "aliexpress.affiliate.product.query",
        {
          keywords: "projector",
          page_size: "1",
          tracking_id: trackingId,
        },
        { appKey, appSecret }
      );

      return {
        success: true,
        message: "חיבור מוצלח ל-AliExpress API! המפתחות תקינים, מאומתים ומחזירים נתוני אמת משרתי סינגפור.",
        details: result,
        effectiveTrackingId: trackingId,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || "בדיקת החיבור נכשלה מול שרתי AliExpress",
      };
    }
  }

  /**
   * Fetch product details via aliexpress.affiliate.productdetail.get
   */
  async getProductDetail(productId: string): Promise<Partial<AliExpressProduct> | null> {
    try {
      const creds = this.getEffectiveCredentials();
      const response = await this.execute("aliexpress.affiliate.productdetail.get", {
        product_ids: productId,
        target_currency: "USD",
        target_language: "EN",
        tracking_id: creds.trackingId || "default",
        ship_to_country: "IL",
      });

      const root = response?.aliexpress_affiliate_productdetail_get_response as Record<string, unknown>;
      const respResult = root?.resp_result as Record<string, unknown>;
      const respCode = respResult?.resp_code;
      const respMsg = respResult?.resp_msg;
      if (respCode !== undefined && respCode !== 200) {
        console.warn(`[AliExpress API] productdetail.get notice: code=${respCode}, msg=${respMsg}`);
      }

      const result = respResult?.result as Record<string, unknown>;
      const productsWrap = result?.products as Record<string, unknown> | Array<Record<string, unknown>>;

      let rawList: Array<Record<string, unknown>> = [];
      if (Array.isArray(productsWrap)) {
        rawList = productsWrap;
      } else if (productsWrap && Array.isArray((productsWrap as any).product)) {
        rawList = (productsWrap as any).product;
      } else if (productsWrap && typeof (productsWrap as any).product === "object") {
        rawList = [(productsWrap as any).product];
      }

      // If productdetail.get returns empty, try fallback to product.query with productIds
      if (rawList.length === 0) {
        try {
          const queryRes = await this.searchProducts({
            productIds: productId,
            pageSize: 1,
          });
          if (queryRes.products && queryRes.products.length > 0) {
            return queryRes.products[0];
          }
        } catch {
          // ignore
        }
        return null;
      }

      const item = rawList[0];
      const priceUsd = parseFloat(String(item.target_sale_price || item.sale_price || "0")) || 25.0;
      const originalPriceUsd =
        parseFloat(String(item.target_original_price || item.original_price || "0")) || priceUsd * 1.3;
      const discountPercent =
        originalPriceUsd > priceUsd ? Math.round(((originalPriceUsd - priceUsd) / originalPriceUsd) * 100) : 0;

      const gallery: string[] = [];
      if (item.product_main_image_url) gallery.push(String(item.product_main_image_url));
      if (item.product_small_image_urls && typeof item.product_small_image_urls === "object") {
        const smallList = (item.product_small_image_urls as Record<string, unknown>).string as string[];
        if (Array.isArray(smallList)) {
          smallList.forEach((img) => {
            if (!gallery.includes(img)) gallery.push(img);
          });
        }
      }

      const cleanAliUrl = String(item.product_detail_url || `https://www.aliexpress.com/item/${productId}.html`);

      // Guarantee authentic affiliate link: If promotion_link is missing or equals cleanAliUrl, generate one now
      let affiliateUrl = String(item.promotion_link || "");
      if (
        !affiliateUrl ||
        affiliateUrl === cleanAliUrl ||
        (!affiliateUrl.includes("s.click.aliexpress.com") && !affiliateUrl.includes("/e/"))
      ) {
        try {
          const generated = await this.generateAffiliateLink(cleanAliUrl);
          if (generated && (generated.includes("s.click.aliexpress.com") || generated.includes("/e/"))) {
            affiliateUrl = generated;
          }
        } catch {
          // fallback
        }
      }
      if (!affiliateUrl) {
        affiliateUrl = cleanAliUrl;
      }

      return {
        aliId: String(item.product_id || productId),
        originalTitle: String(item.product_title || ""),
        priceUsd,
        priceIls: Math.round(priceUsd * 3.65 * 10) / 10,
        originalPriceUsd,
        discountPercent,
        rating: normalizeAliRating(item.evaluate_rate),
        ordersCount: parseInt(String(item.lastest_volume || item.volume || "100"), 10),
        mainImage: String(item.product_main_image_url || gallery[0] || ""),
        galleryImages: gallery,
        storeName: String(item.shop_name || item.shop_title || "Official AliExpress Store"),
        sellerPositiveRate: item.shop_rate ? String(item.shop_rate) : (item.evaluate_rate ? `${item.evaluate_rate}%` : "98.5%"),
        commissionRate: normalizeCommissionRate(item.commission_rate),
        aliUrl: cleanAliUrl,
        affiliateUrl,
      };
    } catch (err) {
      console.error("AliExpress API getProductDetail failed:", err);
      // Try product query fallback with productIds
      try {
        const queryRes = await this.searchProducts({
          productIds: productId,
          pageSize: 1,
        });
        if (queryRes.products && queryRes.products.length > 0) {
          return queryRes.products[0];
        }
      } catch {
        // ignore
      }
      return null;
    }
  }

  /**
   * Generate official affiliate link with SubIDs via aliexpress.affiliate.link.generate
   */
  async generateAffiliateLink(
    productUrl: string,
    subIds?: { subId1?: string; subId2?: string; subId3?: string }
  ): Promise<string> {
    try {
      if (!this.isConfigured()) {
        return productUrl;
      }

      // If already an official s.click or /e/ link, don't re-generate
      if (productUrl.includes("s.click.aliexpress.com/e/") || productUrl.includes("aliexpress.com/e/")) {
        return productUrl;
      }

      const creds = this.getEffectiveCredentials();
      const subIdCombined = [subIds?.subId1, subIds?.subId2, subIds?.subId3].filter(Boolean).join("_");
      const params: Record<string, string> = {
        promotion_link_type: "0",
        source_values: productUrl,
        tracking_id: creds.trackingId || "default",
      };

      if (subIdCombined) {
        params.sub_id = subIdCombined.slice(0, 50);
      }

      const response = await this.execute("aliexpress.affiliate.link.generate", params);
      const root = response?.aliexpress_affiliate_link_generate_response as Record<string, unknown>;
      const respResult = root?.resp_result as Record<string, unknown>;
      const result = respResult?.result as Record<string, unknown>;
      const promotionLinks = (result?.promotion_links || (result as any)?.promotion_link) as any;

      let linkItem: any = null;
      if (Array.isArray(promotionLinks)) {
        linkItem = promotionLinks[0];
      } else if (promotionLinks && Array.isArray(promotionLinks.promotion_link)) {
        linkItem = promotionLinks.promotion_link[0];
      } else if (promotionLinks && typeof promotionLinks.promotion_link === "object") {
        linkItem = promotionLinks.promotion_link;
      } else if (promotionLinks && typeof promotionLinks === "object") {
        linkItem = promotionLinks;
      }

      if (linkItem && linkItem.promotion_link) {
        return String(linkItem.promotion_link);
      }

      return productUrl;
    } catch (err) {
      console.error("AliExpress API generateAffiliateLink failed:", err);
      return productUrl;
    }
  }

  /**
   * Search and filter products across all categories via aliexpress.affiliate.product.query
   */
  async searchProducts(options: {
    keywords?: string;
    productIds?: string;
    categoryId?: string;
    maxPrice?: number;
    minPrice?: number;
    minOrders?: number;
    minRating?: number;
    sortBy?: "LAST_VOLUME_DESC" | "EVALUATE_RATE_DESC" | "SALE_PRICE_ASC" | "SALE_PRICE_DESC";
    pageNo?: number;
    pageSize?: number;
    theme?: string;
  }): Promise<{ products: Partial<AliExpressProduct>[]; errorDetails?: string; translatedQuery?: string; totalFound?: number }> {
    try {
      const creds = this.getEffectiveCredentials();

      // Theme Preset Adjustments
      let effectiveSortBy = options.sortBy || "LAST_VOLUME_DESC";
      let effectiveMinOrders = options.minOrders;
      let effectiveMinRating = options.minRating;
      let effectiveMaxPrice = options.maxPrice;

      if (options.theme === "top_sellers") {
        effectiveSortBy = "LAST_VOLUME_DESC";
        effectiveMinOrders = effectiveMinOrders ?? 100;
        effectiveMinRating = effectiveMinRating ?? 4.5;
      } else if (options.theme === "top_rated") {
        effectiveSortBy = "EVALUATE_RATE_DESC";
        effectiveMinRating = effectiveMinRating ?? 4.7;
        effectiveMinOrders = effectiveMinOrders ?? 50;
      } else if (options.theme === "tax_free") {
        effectiveMaxPrice = effectiveMaxPrice ? Math.min(effectiveMaxPrice, 74.99) : 74.99;
        effectiveMinOrders = effectiveMinOrders ?? 100;
        effectiveMinRating = effectiveMinRating ?? 4.5;
      } else if (options.theme === "budget_deals") {
        effectiveMaxPrice = 25.0;
        effectiveMinOrders = effectiveMinOrders ?? 100;
      }

      // Smart Hebrew Translation: Automatically converts Hebrew product terms (מקרן -> projector)
      const translation = await translateHebrewSearch(options.keywords || "");
      const effectiveKeywords = translation.query || "best deals";

      const targetPoolSize = Math.max(10, Math.min(100, options.pageSize || 50));
      const pageToFetch = options.pageNo || 1;

      // Base query params builder
      const buildParams = (pNo: number, pSize: number): Record<string, string> => {
        const p: Record<string, string> = {
          target_currency: "USD",
          target_language: "EN",
          tracking_id: creds.trackingId || "default",
          page_no: String(pNo),
          page_size: String(Math.min(50, pSize)),
          sort: effectiveSortBy,
        };

        if (options.productIds) {
          p.product_ids = options.productIds;
        } else {
          p.keywords = effectiveKeywords;
        }

        if (options.categoryId && options.categoryId !== "all" && /^\d+(,\d+)*$/.test(options.categoryId.trim())) {
          p.category_ids = options.categoryId.trim();
        }
        // NOTE: We intentionally DO NOT send max_sale_price / min_sale_price to the raw API!
        // AliExpress evaluates sale_price in CNY (Chinese Yuan), which treats $75 USD as 75 CNY (~$10 USD),
        // filtering out almost the entire catalog. Accurate USD/ILS price filtering is applied in-memory below.
        return p;
      };

      const extractProducts = (resp: any): Array<Record<string, unknown>> => {
        const root = resp?.aliexpress_affiliate_product_query_response as Record<string, unknown>;
        const respResult = root?.resp_result as Record<string, unknown>;
        const result = respResult?.result as Record<string, unknown>;
        const productsWrap = result?.products as any;
        if (Array.isArray(productsWrap)) return productsWrap;
        if (productsWrap && Array.isArray(productsWrap.product)) return productsWrap.product;
        if (productsWrap && typeof productsWrap.product === "object" && productsWrap.product !== null) {
          return [productsWrap.product];
        }
        return [];
      };

      let rawList: Array<Record<string, unknown>> = [];
      try {
        // Fetch first page (up to 50 items)
        const primaryRes = await this.execute(
          "aliexpress.affiliate.product.query",
          buildParams(pageToFetch, Math.min(50, targetPoolSize))
        );
        rawList.push(...extractProducts(primaryRes));

        // If targetPoolSize > 50 and first page had >= 30 items, fetch second page sequentially (our execute method respects 1 QPS)
        if (targetPoolSize > 50 && rawList.length >= 30) {
          try {
            const secondPageRes = await this.execute(
              "aliexpress.affiliate.product.query",
              buildParams(pageToFetch + 1, 50)
            );
            rawList.push(...extractProducts(secondPageRes));
          } catch (p2Err) {
            console.warn("Secondary page fetch failed, continuing with page 1 results:", p2Err);
          }
        }
      } catch (firstErr: any) {
        console.warn("Primary search query failed, retrying with clean keywords only:", firstErr?.message);
        try {
          const fallbackRes = await this.execute("aliexpress.affiliate.product.query", {
            keywords: effectiveKeywords,
            target_currency: "USD",
            target_language: "EN",
            tracking_id: creds.trackingId || "default",
            page_size: String(Math.min(50, targetPoolSize)),
          });
          rawList.push(...extractProducts(fallbackRes));
        } catch (fallbackErr: any) {
          console.warn("Fallback query also failed:", fallbackErr?.message);
        }
      }

      // Deduplicate by product ID
      const seenIds = new Set<string>();
      const uniqueRawList: Array<Record<string, unknown>> = [];
      for (const item of rawList) {
        const id = String(item.product_id || item.item_id || item.id || "");
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueRawList.push(item);
        }
      }

      const products = uniqueRawList.map((item) => {
        const rawPriceStr = String(
          item.target_sale_price ||
          item.sale_price ||
          item.app_sale_price ||
          item.target_app_sale_price ||
          "0"
        ).replace(/[^0-9.]/g, "");
        const priceUsd = parseFloat(rawPriceStr) || 25.0;

        const rawOrigStr = String(
          item.target_original_price ||
          item.original_price ||
          item.target_app_original_price ||
          "0"
        ).replace(/[^0-9.]/g, "");
        const originalPriceUsd =
          parseFloat(rawOrigStr) || (priceUsd > 0 ? Math.round(priceUsd * 1.3 * 100) / 100 : 35.0);
        const discountPercent =
          originalPriceUsd > priceUsd ? Math.round(((originalPriceUsd - priceUsd) / originalPriceUsd) * 100) : 0;

        // Clean main image
        let mainImg = String(item.product_main_image_url || "");
        if (mainImg.startsWith("//")) mainImg = `https:${mainImg}`;

        const gallery: string[] = [];
        if (mainImg) gallery.push(mainImg);
        if (item.product_small_image_urls && typeof item.product_small_image_urls === "object") {
          const smallList = (item.product_small_image_urls as Record<string, unknown>).string as string[];
          if (Array.isArray(smallList)) {
            smallList.forEach((img) => {
              let cleanImg = String(img);
              if (cleanImg.startsWith("//")) cleanImg = `https:${cleanImg}`;
              if (!gallery.includes(cleanImg)) gallery.push(cleanImg);
            });
          }
        }

        // Clean title
        const rawTitle =
          item.product_title ||
          item.title ||
          item.product_name ||
          item.item_title ||
          item.subject ||
          `מוצר אלי אקספרס #${item.product_id || ""}`;

        const originalTitle = String(rawTitle)
          .replace(/<[^>]*>/g, "")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .trim();

        const aliId = String(item.product_id || item.item_id || item.id || "");
        const aliUrl = String(item.product_detail_url || `https://www.aliexpress.com/item/${aliId}.html`);
        const affiliateUrl = String(item.promotion_link || aliUrl);
        const rawRating = item.evaluate_rate;
        const rating = normalizeAliRating(rawRating);
        const rawVol = item.lastest_volume ?? item.volume;
        const ordersCount =
          rawVol !== undefined && rawVol !== null && String(rawVol).trim() !== "" && String(rawVol) !== "0"
            ? parseInt(String(rawVol).replace(/[^0-9]/g, ""), 10) || (effectiveSortBy === "LAST_VOLUME_DESC" ? 150 : 100)
            : (effectiveSortBy === "LAST_VOLUME_DESC" ? 250 : 100);
        const storeName = String(item.shop_name || item.shop_title || item.store_name || "Official AliExpress Store");
        const sellerPositiveRate = item.shop_rate ? String(item.shop_rate) : (item.evaluate_rate ? `${item.evaluate_rate}%` : "98.5%");
        const commissionRate = normalizeCommissionRate(item.commission_rate);

        return {
          aliId,
          originalTitle,
          titleHe: originalTitle,
          priceUsd,
          priceIls: Math.round(priceUsd * 3.65 * 10) / 10,
          originalPriceUsd,
          discountPercent,
          rating,
          ordersCount,
          mainImage: mainImg || gallery[0] || "",
          galleryImages: gallery,
          storeName,
          sellerPositiveRate,
          shopId: String(item.shop_id || ""),
          commissionRate,
          aliUrl,
          affiliateUrl,
        };
      });

      // Apply User-Requested Quality Filters (e.g. Orders >= 100, Rating >= 4.5)
      let filteredProducts = products;

      if (effectiveMinOrders !== undefined && effectiveMinOrders > 0) {
        filteredProducts = filteredProducts.filter((p) => (p.ordersCount || 0) >= effectiveMinOrders!);
      }

      if (effectiveMinRating !== undefined && effectiveMinRating > 0) {
        filteredProducts = filteredProducts.filter((p) => (p.rating || 0) >= effectiveMinRating!);
      }

      if (effectiveMaxPrice !== undefined && effectiveMaxPrice > 0) {
        filteredProducts = filteredProducts.filter((p) => (p.priceUsd || 0) <= effectiveMaxPrice!);
      }

      if (options.minPrice !== undefined && options.minPrice > 0) {
        filteredProducts = filteredProducts.filter((p) => (p.priceUsd || 0) >= options.minPrice!);
      }

      // If strict filter removed everything, fallback smoothly to products with reasonable pricing
      if (filteredProducts.length === 0 && products.length > 0) {
        console.log("[AliExpress API] Strict filter returned 0 items, relaxing filter to preserve candidate pipeline");
        if (effectiveMaxPrice !== undefined && effectiveMaxPrice > 0) {
          filteredProducts = products.filter((p) => (p.priceUsd || 0) <= effectiveMaxPrice!);
        }
        if (filteredProducts.length === 0) {
          filteredProducts = products;
        }
      }

      // Sort according to requested order
      if (effectiveSortBy === "LAST_VOLUME_DESC") {
        filteredProducts.sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));
      } else if (effectiveSortBy === "EVALUATE_RATE_DESC") {
        filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (effectiveSortBy === "SALE_PRICE_ASC") {
        filteredProducts.sort((a, b) => (a.priceUsd || 0) - (b.priceUsd || 0));
      } else if (effectiveSortBy === "SALE_PRICE_DESC") {
        filteredProducts.sort((a, b) => (b.priceUsd || 0) - (a.priceUsd || 0));
      }

      return {
        products: filteredProducts.slice(0, targetPoolSize),
        translatedQuery: translation.wasTranslated ? translation.query : undefined,
        totalFound: filteredProducts.length,
      };
    } catch (err: any) {
      console.warn("AliExpress API searchProducts notice:", err.message);
      return { products: [], errorDetails: err.message || "שגיאת תקשורת עם ה-API של AliExpress" };
    }
  }

  /**
   * Fetch featured and top-performing products via aliexpress.affiliate.hotproduct.query
   */
  async getHotProducts(options: {
    categoryId?: string;
    keywords?: string;
    maxPrice?: number;
    minPrice?: number;
    minOrders?: number;
    minRating?: number;
    pageNo?: number;
    pageSize?: number;
  } = {}): Promise<{ products: Partial<AliExpressProduct>[]; errorDetails?: string }> {
    try {
      if (!this.isConfigured()) {
        return { products: [], errorDetails: "AliExpress API keys not configured" };
      }

      const creds = this.getEffectiveCredentials();
      const params: Record<string, string> = {
        target_currency: "USD",
        target_language: "EN",
        tracking_id: creds.trackingId || "default",
        page_no: String(options.pageNo || 1),
        page_size: String(Math.min(50, options.pageSize || 50)),
        sort: "LAST_VOLUME_DESC",
        ship_to_country: "IL",
      };

      if (options.keywords && options.keywords.trim()) {
        params.keywords = options.keywords.trim();
      }
      if (options.categoryId && options.categoryId !== "all" && /^\d+(,\d+)*$/.test(options.categoryId.trim())) {
        params.category_ids = options.categoryId.trim();
      }
      // Note: Price filtering is done in-memory below in USD to prevent CNY currency misinterpretations

      const response = await this.execute("aliexpress.affiliate.hotproduct.query", params);
      const root = response?.aliexpress_affiliate_hotproduct_query_response as Record<string, unknown>;
      const respResult = root?.resp_result as Record<string, unknown>;
      const result = respResult?.result as Record<string, unknown>;
      const productsWrap = result?.products as any;

      let rawList: Array<Record<string, unknown>> = [];
      if (Array.isArray(productsWrap)) {
        rawList = productsWrap;
      } else if (productsWrap && Array.isArray(productsWrap.product)) {
        rawList = productsWrap.product;
      } else if (productsWrap && typeof productsWrap.product === "object" && productsWrap.product !== null) {
        rawList = [productsWrap.product];
      }

      if (rawList.length === 0) {
        return this.searchProducts({
          ...options,
          keywords: options.keywords || "best deals",
          sortBy: "LAST_VOLUME_DESC",
        });
      }

      const mapped = rawList.map((item) => {
        const rawPriceStr = String(item.target_sale_price || item.sale_price || "0").replace(/[^0-9.]/g, "");
        const priceUsd = parseFloat(rawPriceStr) || 20.0;
        const rawOrigStr = String(item.target_original_price || item.original_price || "0").replace(/[^0-9.]/g, "");
        const originalPriceUsd = parseFloat(rawOrigStr) || Math.round(priceUsd * 1.3 * 100) / 100;
        const discountPercent = originalPriceUsd > priceUsd ? Math.round(((originalPriceUsd - priceUsd) / originalPriceUsd) * 100) : 0;
        const aliId = String(item.product_id || item.item_id || item.id || "");
        let mainImg = String(item.product_main_image_url || "");
        if (mainImg.startsWith("//")) mainImg = `https:${mainImg}`;
        const originalTitle = String(item.product_title || item.title || "").replace(/<[^>]*>/g, "").trim();

        return {
          aliId,
          originalTitle,
          titleHe: originalTitle,
          priceUsd,
          priceIls: Math.round(priceUsd * 3.65 * 10) / 10,
          originalPriceUsd,
          discountPercent,
          rating: normalizeAliRating(item.evaluate_rate),
          ordersCount: parseInt(String(item.volume || "100").replace(/[^0-9]/g, ""), 10) || 100,
          mainImage: mainImg,
          galleryImages: mainImg ? [mainImg] : [],
          storeName: String(item.shop_name || "Official AliExpress Store"),
          sellerPositiveRate: item.shop_rate ? `${item.shop_rate}%` : "98.0%",
          aliUrl: String(item.product_detail_url || `https://www.aliexpress.com/item/${aliId}.html`),
          affiliateUrl: String(item.promotion_link || item.product_detail_url || ""),
          commissionRate: normalizeCommissionRate(item.commission_rate),
        };
      });

      let filtered = mapped;
      if (options.minOrders && options.minOrders > 0) {
        filtered = filtered.filter((p) => (p.ordersCount || 0) >= options.minOrders!);
      }
      if (options.minRating && options.minRating > 0) {
        filtered = filtered.filter((p) => (p.rating || 0) >= options.minRating!);
      }
      if (options.maxPrice && options.maxPrice > 0) {
        filtered = filtered.filter((p) => (p.priceUsd || 0) <= options.maxPrice!);
      }
      if (options.minPrice && options.minPrice > 0) {
        filtered = filtered.filter((p) => (p.priceUsd || 0) >= options.minPrice!);
      }
      if (filtered.length === 0 && mapped.length > 0) {
        filtered = mapped;
      }

      return { products: filtered };
    } catch (err: any) {
      console.warn("Hot product query fallback to search:", err?.message);
      return this.searchProducts({
        ...options,
        keywords: options.keywords || "best sellers",
        sortBy: "LAST_VOLUME_DESC",
      });
    }
  }

  /**
   * Query Affiliate Live Orders via aliexpress.affiliate.order.listbyindex
   * Official AliExpress Open Platform order ingestion endpoint
   */
  async queryAffiliateOrders(options: AffiliateOrderQueryOptions = {}): Promise<AffiliateOrderQueryResult> {
    if (!this.isConfigured()) {
      console.warn("AliExpress API is not configured (missing APP_KEY or APP_SECRET)");
      return { orders: [], totalCount: 0 };
    }

    try {
      const now = new Date();
      // Default time window: past 7 days (or user specified) in GMT+8
      const endTime = options.endTime || formatAliExpressTime(new Date(now.getTime() + 60 * 60 * 1000));
      const startTime =
        options.startTime || formatAliExpressTime(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));

      // AliExpress listbyindex requires mandatory status:
      // "Payment Completed": newly placed and paid orders (where all real-time conversions start)
      // "Buyer Confirmed Receipt": completed delivery orders (where final settlement occurs)
      const statusesToQuery: string[] =
        options.status && options.status !== "all"
          ? [options.status]
          : ["Payment Completed", "Buyer Confirmed Receipt"];

      console.log(`[AliExpress Orders Sync] Querying orders between "${startTime}" and "${endTime}" for statuses:`, statusesToQuery);

      const aggregatedOrders = new Map<string, AffiliateOrder>();
      let totalCount = 0;
      const errors: string[] = [];

      for (const statusVal of statusesToQuery) {
        try {
          const params: Record<string, string> = {
            start_time: startTime,
            end_time: endTime,
            status: statusVal,
            fields:
              "commission_rate,order_id,sub_order_id,order_number,order_status,paid_amount,finished_amount,paid_time,product_id,product_title,product_main_image_url,product_count,sub_id,created_time,settled_time,estimated_paid_commission,estimated_finished_commission",
            page_size: String(Math.min(50, options.pageSize || 50)),
          };

          if (options.startQueryIndexId) {
            params.start_query_index_id = options.startQueryIndexId;
          }

          const response = await this.execute("aliexpress.affiliate.order.listbyindex", params);
          const root = response?.aliexpress_affiliate_order_listbyindex_response as Record<string, unknown>;
          const respResult = (root?.resp_result || root) as Record<string, unknown>;
          const result = (respResult?.result || respResult || {}) as Record<string, unknown>;
          const ordersWrap = result?.orders as any;

          let rawItems: any[] = [];
          if (Array.isArray(ordersWrap)) {
            rawItems = ordersWrap;
          } else if (ordersWrap && Array.isArray(ordersWrap.order)) {
            rawItems = ordersWrap.order;
          } else if (ordersWrap && typeof ordersWrap.order === "object" && ordersWrap.order !== null) {
            rawItems = [ordersWrap.order];
          }

          totalCount += Number(result?.total_record_count || rawItems.length) || 0;
          console.log(`[AliExpress Orders Sync] Status "${statusVal}" returned ${rawItems.length} items from AliExpress.`);

          for (const raw of rawItems) {
            const orderNumber = String(raw.order_id || raw.sub_order_id || raw.order_number || "").trim();
            if (!orderNumber) continue;

            const productId = String(raw.product_id || raw.item_id || "").trim();
            const productTitle = String(
              raw.product_title || raw.item_title || `מוצר אלי אקספרס #${productId}`
            )
              .replace(/<[^>]*>/g, "")
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/&amp;/g, "&")
              .trim();

            let productImageUrl = String(
              raw.product_main_image_url || raw.item_main_image_url || ""
            ).trim();
            if (productImageUrl.startsWith("//")) {
              productImageUrl = `https:${productImageUrl}`;
            }

            const productCount = parseInt(String(raw.product_count || raw.item_count || "1"), 10) || 1;
            const rawPaidAmount = raw.paid_amount ?? raw.finished_amount ?? raw.product_price ?? raw.item_price ?? 0;
            const salePriceUsd = parseAliExpressMonetary(rawPaidAmount);

            const commissionRate = normalizeCommissionRate(raw.commission_rate);
            const rawCommission = raw.estimated_paid_commission ?? raw.estimated_finished_commission ?? raw.commission;
            const commissionUsd = rawCommission !== undefined && rawCommission !== null && rawCommission !== ""
              ? parseAliExpressMonetary(rawCommission)
              : Math.round(salePriceUsd * (commissionRate / 100) * 100) / 100;

            const subId = String(raw.sub_id || raw.sub_id1 || raw.tracking_id || "").trim();
            const orderStatus = String(raw.order_status || raw.status || statusVal).trim();
            const orderTime = String(raw.paid_time || raw.created_time || raw.order_time || getTimestamp()).trim();

            const itemRecord: AffiliateOrderItem = {
              orderNumber,
              productId,
              productTitle,
              productImageUrl,
              productCount,
              salePriceUsd,
              commissionRate,
              commissionUsd,
              subId: subId || undefined,
              articleGenerationStatus: "pending",
            };

            if (!aggregatedOrders.has(orderNumber)) {
              aggregatedOrders.set(orderNumber, {
                orderNumber,
                orderStatus,
                paidAmountUsd: salePriceUsd,
                commissionAmountUsd: commissionUsd,
                subId: subId || undefined,
                orderTime,
                rawApiPayload: raw,
                items: [itemRecord],
              });
            } else {
              const existing = aggregatedOrders.get(orderNumber)!;
              existing.paidAmountUsd = Math.round((existing.paidAmountUsd + salePriceUsd) * 100) / 100;
              existing.commissionAmountUsd =
                Math.round((existing.commissionAmountUsd + commissionUsd) * 100) / 100;
              if (!existing.items.some((it) => it.productId === productId)) {
                existing.items.push(itemRecord);
              }
            }
          }
        } catch (statusErr: any) {
          console.warn(`[AliExpress Orders Sync] Notice: Status "${statusVal}" query threw:`, statusErr?.message);
          errors.push(`${statusVal}: ${statusErr?.message}`);
        }
      }

      if (aggregatedOrders.size === 0 && errors.length > 0 && errors.length === statusesToQuery.length) {
        throw new Error(`שגיאה במשיכת הזמנות מ-AliExpress: ${errors.join(" | ")}`);
      }

      return {
        orders: Array.from(aggregatedOrders.values()),
        totalCount,
      };
    } catch (err: any) {
      console.error("AliExpress API queryAffiliateOrders error:", err);
      throw new Error(`שגיאה במשיכת הזמנות מ-AliExpress API: ${err?.message || "תקלה לא ידועה"}`);
    }
  }

  /**
   * Fetch specific affiliate order details by order number via aliexpress.affiliate.order.get
   */
  async getAffiliateOrderDetail(orderNumber: string): Promise<AffiliateOrder | null> {
    if (!this.isConfigured() || !orderNumber) return null;

    try {
      const response = await this.execute("aliexpress.affiliate.order.get", {
        order_ids: orderNumber.trim(),
        fields:
          "commission_rate,order_number,order_status,paid_amount,product_id,product_title,product_main_image_url,product_count,sub_id,created_time,settled_time,estimated_paid_commission",
      });

      const root = response?.aliexpress_affiliate_order_get_response as Record<string, unknown>;
      const respResult = root?.resp_result as Record<string, unknown>;
      const result = (respResult?.result || respResult || {}) as Record<string, unknown>;
      const ordersWrap = result?.orders as any;

      let rawList: any[] = [];
      if (Array.isArray(ordersWrap)) {
        rawList = ordersWrap;
      } else if (ordersWrap && Array.isArray(ordersWrap.order)) {
        rawList = ordersWrap.order;
      } else if (ordersWrap && typeof ordersWrap.order === "object" && ordersWrap.order !== null) {
        rawList = [ordersWrap.order];
      }

      if (rawList.length === 0) return null;

      const items: AffiliateOrderItem[] = rawList.map((raw) => {
        const productId = String(raw.product_id || raw.item_id || "").trim();
        const salePriceUsd =
          parseFloat(
            String(raw.paid_amount || raw.product_price || raw.item_price || "0").replace(
              /[^0-9.]/g,
              ""
            )
          ) || 0;
        const commissionRate = normalizeCommissionRate(raw.commission_rate);
        const commissionUsd =
          parseFloat(
            String(raw.estimated_paid_commission || raw.commission || "0").replace(/[^0-9.]/g, "")
          ) || Math.round(salePriceUsd * (commissionRate / 100) * 100) / 100;

        return {
          orderNumber,
          productId,
          productTitle: String(raw.product_title || raw.item_title || `מוצר #${productId}`).trim(),
          productImageUrl: String(raw.product_main_image_url || raw.item_main_image_url || "").trim(),
          productCount: parseInt(String(raw.product_count || raw.item_count || "1"), 10) || 1,
          salePriceUsd,
          commissionRate,
          commissionUsd,
          subId: String(raw.sub_id || raw.sub_id1 || "").trim() || undefined,
          articleGenerationStatus: "pending",
        };
      });

      const totalPaid = items.reduce((acc, it) => acc + it.salePriceUsd, 0);
      const totalComm = items.reduce((acc, it) => acc + it.commissionUsd, 0);
      const first = rawList[0];

      return {
        orderNumber,
        orderStatus: String(first?.order_status || "Payment Completed"),
        paidAmountUsd: Math.round(totalPaid * 100) / 100,
        commissionAmountUsd: Math.round(totalComm * 100) / 100,
        subId: items[0]?.subId,
        orderTime: String(first?.created_time || getTimestamp()),
        rawApiPayload: first,
        items,
      };
    } catch (err: any) {
      console.warn("AliExpress API getAffiliateOrderDetail notice:", err.message);
      return null;
    }
  }
}

export const aliExpressApi = new AliExpressApiClient();
