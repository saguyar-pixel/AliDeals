import crypto from "crypto";
import { AliExpressProduct } from "./types";
import { analyticsDb } from "@/lib/db/analytics-db";

const ALIEXPRESS_API_URL = "https://api-sg.aliexpress.com/sync"; // Official Open Platform Singapore gateway

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

/**
 * Format current timestamp in AliExpress format: YYYY-MM-DD HH:mm:ss
 */
function getTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(
    now.getMinutes()
  )}:${pad(now.getSeconds())}`;
}

export class AliExpressApiClient {
  private appKey: string;
  private appSecret: string;
  private trackingId: string;

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
   * Generic AliExpress API request executor
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

    const query = new URLSearchParams(allParams).toString();
    const response = await fetch(`${ALIEXPRESS_API_URL}?${query}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
    });

    if (!response.ok) {
      throw new Error(`AliExpress API request failed with status: ${response.status}`);
    }

    const json = (await response.json()) as Record<string, unknown>;

    // Check if AliExpress returned an API-level error
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
      const response = await this.execute("aliexpress.affiliate.productdetail.get", {
        product_ids: productId,
        target_currency: "USD",
        target_language: "EN",
        tracking_id: this.trackingId,
      });

      const root = response?.aliexpress_affiliate_productdetail_get_response as Record<string, unknown>;
      const respResult = root?.resp_result as Record<string, unknown>;
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

      // If productdetail.get returns empty, try fallback to product.query with product_ids
      if (rawList.length === 0) {
        try {
          const queryRes = await this.searchProducts({
            keywords: productId,
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

      return {
        aliId: String(item.product_id || productId),
        originalTitle: String(item.product_title || ""),
        priceUsd,
        priceIls: Math.round(priceUsd * 3.65 * 10) / 10,
        originalPriceUsd,
        discountPercent,
        rating: parseFloat(String(item.evaluate_rate || "4.8")) || 4.8,
        ordersCount: parseInt(String(item.lastest_volume || item.volume || "100"), 10),
        mainImage: String(item.product_main_image_url || gallery[0] || ""),
        galleryImages: gallery,
        storeName: String(item.shop_name || item.shop_title || "Official AliExpress Store"),
        sellerPositiveRate: item.shop_rate ? String(item.shop_rate) : "98.5%",
        commissionRate: parseFloat(String(item.commission_rate || "7.0")),
        aliUrl: cleanAliUrl,
        affiliateUrl: String(item.promotion_link || cleanAliUrl),
      };
    } catch (err) {
      console.error("AliExpress API getProductDetail failed:", err);
      // Try search query fallback
      try {
        const queryRes = await this.searchProducts({
          keywords: productId,
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

      const subIdCombined = [subIds?.subId1, subIds?.subId2, subIds?.subId3].filter(Boolean).join("_");
      const params: Record<string, string> = {
        promotion_link_type: "0",
        source_values: productUrl,
        tracking_id: this.trackingId,
      };

      if (subIdCombined) {
        params.sub_id = subIdCombined.slice(0, 50);
      }

      const response = await this.execute("aliexpress.affiliate.link.generate", params);
      const root = response?.aliexpress_affiliate_link_generate_response as Record<string, unknown>;
      const respResult = root?.resp_result as Record<string, unknown>;
      const result = respResult?.result as Record<string, unknown>;
      const promotionLinks = result?.promotion_links as Record<string, unknown>;
      const links = promotionLinks?.promotion_link as Array<Record<string, unknown>>;

      if (links && links.length > 0 && links[0].promotion_link) {
        return String(links[0].promotion_link);
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
    keywords: string;
    categoryId?: string;
    maxPrice?: number;
    minPrice?: number;
    sortBy?: "LAST_VOLUME_DESC" | "EVALUATE_RATE_DESC" | "SALE_PRICE_ASC" | "SALE_PRICE_DESC";
    pageNo?: number;
    pageSize?: number;
  }): Promise<{ products: Partial<AliExpressProduct>[]; errorDetails?: string }> {
    try {
      const params: Record<string, string> = {
        keywords: options.keywords,
        target_currency: "USD",
        target_language: "EN",
        tracking_id: this.trackingId,
        ship_to_country: "IL",
        page_no: String(options.pageNo || 1),
        page_size: String(options.pageSize || 15),
        sort: options.sortBy || "LAST_VOLUME_DESC",
      };

      if (options.categoryId && options.categoryId !== "all") {
        params.category_ids = options.categoryId;
      }
      if (options.maxPrice !== undefined) {
        params.max_sale_price = options.maxPrice.toFixed(2);
      }
      if (options.minPrice !== undefined) {
        params.min_sale_price = options.minPrice.toFixed(2);
      }

      const response = await this.execute("aliexpress.affiliate.product.query", params);
      const root = response?.aliexpress_affiliate_product_query_response as Record<string, unknown>;
      const respResult = root?.resp_result as Record<string, unknown>;
      const result = respResult?.result as Record<string, unknown>;
      const productsWrap = result?.products as Record<string, unknown> | Array<Record<string, unknown>>;

      let rawList: Array<Record<string, unknown>> = [];
      if (Array.isArray(productsWrap)) {
        rawList = productsWrap;
      } else if (productsWrap && Array.isArray((productsWrap as any).product)) {
        rawList = (productsWrap as any).product;
      }

      const products = rawList.map((item) => {
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

        // Clean title (strip HTML highlight font tags, unescape HTML entities)
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
        const rating = parseFloat(String(item.evaluate_rate || "4.8").replace(/[^0-9.]/g, "")) || 4.8;
        const ordersCount = parseInt(String(item.lastest_volume || item.volume || "100").replace(/[^0-9]/g, ""), 10) || 100;
        const storeName = String(item.shop_name || item.shop_title || item.store_name || "Official AliExpress Store");
        const sellerPositiveRate = item.shop_rate ? String(item.shop_rate) : (item.evaluate_rate ? `${item.evaluate_rate}%` : "98.5%");
        const commissionRate = parseFloat(String(item.commission_rate || "7.0").replace(/[^0-9.]/g, "")) || 7.0;

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

      return { products };
    } catch (err: any) {
      console.warn("AliExpress API searchProducts notice:", err.message);
      return { products: [], errorDetails: err.message || "שגיאת תקשורת עם ה-API של AliExpress" };
    }
  }
}

export const aliExpressApi = new AliExpressApiClient();
