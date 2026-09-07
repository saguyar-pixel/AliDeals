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

    return response.json();
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
        // Fallback: construct standard affiliate redirect parameter or direct URL
        return productUrl;
      }

      // Format sub_id param (combining subIds with separator if needed)
      const subIdCombined = [subIds?.subId1, subIds?.subId2, subIds?.subId3].filter(Boolean).join("_");

      const params: Record<string, string> = {
        promotion_link_type: "0",
        source_values: productUrl,
        tracking_id: this.trackingId,
      };

      if (subIdCombined) {
        params.sub_id = subIdCombined;
      }

      const response = await this.execute("aliexpress.affiliate.link.generate", params);
      const root = response?.aliexpress_affiliate_link_generate_response as Record<string, unknown>;
      const respResult = root?.resp_result as Record<string, unknown>;
      const result = respResult?.result as Record<string, unknown>;
      const links = (result?.promotion_links as Record<string, unknown>)?.promotion_link as Array<
        Record<string, unknown>
      >;

      if (links && links.length > 0 && links[0].promotion_link) {
        return String(links[0].promotion_link);
      }

      return productUrl;
    } catch (err) {
      console.error("Failed to generate affiliate link via API:", err);
      return productUrl;
    }
  }
}

export const aliExpressApi = new AliExpressApiClient();
