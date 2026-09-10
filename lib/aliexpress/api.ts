import crypto from "crypto";
import { AliExpressProduct } from "./types";

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
    this.appKey = appKey || process.env.ALIEXPRESS_APP_KEY || "";
    this.appSecret = appSecret || process.env.ALIEXPRESS_APP_SECRET || "";
    this.trackingId = trackingId || process.env.ALIEXPRESS_TRACKING_ID || "alideals_il";
  }

  public isConfigured(): boolean {
    return Boolean(this.appKey && this.appSecret);
  }

  /**
   * Generic AliExpress API request executor
   */
  private async execute(method: string, apiParams: Record<string, string>): Promise<Record<string, unknown>> {
    if (!this.isConfigured()) {
      throw new Error("AliExpress API keys (APP_KEY / APP_SECRET) are not configured");
    }

    const publicParams: Record<string, string> = {
      app_key: this.appKey,
      timestamp: getTimestamp(),
      format: "json",
      v: "2.0",
      sign_method: "md5",
      method: method,
    };

    const allParams: Record<string, string> = { ...publicParams, ...apiParams };
    const sign = generateSignature(allParams, this.appSecret);
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
      throw new Error(`שגיאת AliExpress API: ${msg} (קוד: ${err.code})`);
    }

    return json;
  }

  /**
   * Health Check: Test connection to AliExpress API
   */
  async testConnection(): Promise<{ success: boolean; message: string; details?: any }> {
    try {
      if (!this.isConfigured()) {
        return {
          success: false,
          message: "מפתחות API אינם מוגדרים. נא להגדיר ALIEXPRESS_APP_KEY ו-ALIEXPRESS_APP_SECRET ב-Vercel.",
        };
      }

      // Quick test query
      const result = await this.execute("aliexpress.affiliate.product.query", {
        keywords: "projector",
        page_size: "1",
        tracking_id: this.trackingId,
      });

      return {
        success: true,
        message: "חיבור מוצלח ל-AliExpress API! המפתחות תקינים ומאומתים מול שרתי סינגפור.",
        details: result,
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
      const productsList = result?.products as Array<Record<string, unknown>>;

      if (!productsList || productsList.length === 0) {
        return null;
      }

      const item = productsList[0];
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

      return {
        aliId: String(item.product_id),
        originalTitle: String(item.product_title || ""),
        priceUsd,
        priceIls: Math.round(priceUsd * 3.65 * 10) / 10,
        originalPriceUsd,
        discountPercent,
        rating: parseFloat(String(item.evaluate_rate || "4.8")) || 4.8,
        ordersCount: parseInt(String(item.lastest_volume || item.volume || "100"), 10),
        mainImage: String(item.product_main_image_url || gallery[0] || ""),
        galleryImages: gallery,
        storeName: String(item.shop_name || item.shop_title || "Official Store"),
        sellerPositiveRate: String(item.shop_rate || item.evaluate_rate || "97.5%"),
        commissionRate: parseFloat(String(item.commission_rate || "7.0")),
        aliUrl: String(item.product_detail_url || `https://www.aliexpress.com/item/${productId}.html`),
        affiliateUrl: String(item.promotion_link || ""),
      };
    } catch (err) {
      console.error("AliExpress API getProductDetail failed:", err);
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

        return {
          aliId: String(item.product_id),
          originalTitle: String(item.product_title || ""),
          priceUsd,
          priceIls: Math.round(priceUsd * 3.65 * 10) / 10,
          originalPriceUsd,
          discountPercent,
          rating: parseFloat(String(item.evaluate_rate || "4.8")) || 4.8,
          ordersCount: parseInt(String(item.lastest_volume || item.volume || "100"), 10),
          mainImage: String(item.product_main_image_url || gallery[0] || ""),
          galleryImages: gallery,
          storeName: String(item.shop_name || item.shop_title || "AliExpress Store"),
          sellerPositiveRate: String(item.shop_rate || item.evaluate_rate ? `${item.evaluate_rate}%` : "98.2%"),
          shopId: String(item.shop_id || ""),
          commissionRate: parseFloat(String(item.commission_rate || "7.0")),
          aliUrl: String(item.product_detail_url || `https://www.aliexpress.com/item/${item.product_id}.html`),
          affiliateUrl: String(item.promotion_link || ""),
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
