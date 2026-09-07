import { extractAliExpressId, scrapeAliExpressProduct } from "./scraper";
import { aliExpressApi } from "./api";
import { AliExpressProduct } from "./types";

export * from "./types";
export * from "./scraper";
export * from "./api";

/**
 * Unified AliExpress data ingestion pipeline
 * Blends official API data (pricing, affiliate link, commission) with Scraper data (reviews, specs)
 */
export async function fetchAliExpressProduct(urlOrId: string): Promise<AliExpressProduct> {
  const { aliId, normalizedUrl } = await extractAliExpressId(urlOrId);

  // 1. Fetch scraped rich details (specs, reviews, gallery)
  const scrapedData = await scrapeAliExpressProduct(normalizedUrl);

  // 2. Check if official API is configured
  if (aliExpressApi.isConfigured()) {
    try {
      const apiData = await aliExpressApi.getProductDetail(aliId);
      if (apiData) {
        return {
          ...scrapedData,
          aliId,
          originalTitle: apiData.originalTitle || scrapedData.originalTitle,
          priceUsd: apiData.priceUsd || scrapedData.priceUsd,
          priceIls: apiData.priceIls || scrapedData.priceIls,
          originalPriceUsd: apiData.originalPriceUsd || scrapedData.originalPriceUsd,
          discountPercent: apiData.discountPercent ?? scrapedData.discountPercent,
          commissionRate: apiData.commissionRate ?? scrapedData.commissionRate,
          affiliateUrl: apiData.affiliateUrl || scrapedData.affiliateUrl,
          mainImage: apiData.mainImage || scrapedData.mainImage,
          galleryImages:
            apiData.galleryImages && apiData.galleryImages.length > 0
              ? Array.from(new Set([...apiData.galleryImages, ...scrapedData.galleryImages]))
              : scrapedData.galleryImages,
        };
      }
    } catch (apiErr) {
      console.warn("AliExpress API fetch failed, using scraped fallback data", apiErr);
    }
  }

  return scrapedData;
}

/**
 * Generate tracked affiliate URL
 */
export async function createTrackedAffiliateLink(
  originalUrl: string,
  subIds?: { subId1?: string; subId2?: string; subId3?: string }
): Promise<string> {
  if (aliExpressApi.isConfigured()) {
    return aliExpressApi.generateAffiliateLink(originalUrl, subIds);
  }

  // Fallback: append tracking params if default tracking ID is set
  const trackingId = process.env.ALIEXPRESS_TRACKING_ID || "alideals_il";
  const subParam = [subIds?.subId1, subIds?.subId2, subIds?.subId3].filter(Boolean).join("_");

  const url = new URL(originalUrl);
  url.searchParams.set("aff_platform", "portals-tool");
  url.searchParams.set("sk", trackingId);
  if (subParam) {
    url.searchParams.set("sub_id", subParam);
  }

  return url.toString();
}
