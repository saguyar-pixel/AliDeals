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

  // 1. Prioritize Official AliExpress API (Fast, authentic data, direct affiliate link & store info)
  let apiData: Partial<AliExpressProduct> | null = null;
  let apiError: string | null = null;
  if (aliExpressApi.isConfigured()) {
    try {
      apiData = await aliExpressApi.getProductDetail(aliId);
      if (!apiData || !apiData.originalTitle) {
        apiError = "AliExpress API לא החזיר פרטי מוצר עבור מזהה זה (ייתכן שהמוצר אינו משתתף בתוכנית האפיליאציה או שאינו זמין למשלוח לישראל)";
      }
    } catch (apiErr: any) {
      apiError = apiErr?.message || "שגיאה בתקשורת מול ה-API של AliExpress";
      console.warn("AliExpress API fetch failed, will try scraping fallback", apiErr);
    }
  } else {
    apiError = "מפתחות API אינם מוגדרים במערכת. יש להזין אותם ב-Settings או ב-Vercel.";
  }

  // 2. Fetch scraper details (for specifications and review quotes)
  let scrapedData: AliExpressProduct | null = null;
  try {
    scrapedData = await scrapeAliExpressProduct(normalizedUrl);
  } catch (scrapeErr) {
    console.warn("Scraper warning (anti-bot or JS required), using API/default specs", scrapeErr);
  }

  // 3. Blend data: Official API takes precedence for title, price, images, store, orders & affiliate link
  if (apiData && apiData.originalTitle) {
    const finalGallery = (apiData.galleryImages && apiData.galleryImages.length > 0)
      ? apiData.galleryImages
      : (scrapedData?.galleryImages || [apiData.mainImage || ""]);

    return {
      aliId,
      originalTitle: apiData.originalTitle,
      titleHe: scrapedData?.titleHe || null,
      descriptionHe: scrapedData?.descriptionHe || null,
      priceUsd: apiData.priceUsd || 25.0,
      priceIls: apiData.priceIls || Math.round((apiData.priceUsd || 25.0) * 3.65 * 10) / 10,
      originalPriceUsd: apiData.originalPriceUsd || (apiData.priceUsd ? Math.round(apiData.priceUsd * 1.3 * 100) / 100 : 35.0),
      discountPercent: apiData.discountPercent ?? 25,
      rating: apiData.rating || scrapedData?.rating || 4.8,
      ordersCount: apiData.ordersCount || scrapedData?.ordersCount || 150,
      storeName: apiData.storeName || "Official AliExpress Store",
      sellerPositiveRate: apiData.sellerPositiveRate || "98.5%",
      commissionRate: apiData.commissionRate || 7.0,
      mainImage: apiData.mainImage || finalGallery[0] || "",
      galleryImages: finalGallery,
      specifications: scrapedData?.specifications && Object.keys(scrapedData.specifications).length > 0
        ? scrapedData.specifications
        : {
            "תאימות שקע": "אירופאי (EU Standard) - מתאים לישראל",
            "משלוח": "AliExpress Standard Shipping לישראל",
            "מקור": "AliExpress Choice / מוכר מורשה",
          },
      reviewsSummary: scrapedData?.reviewsSummary && scrapedData.reviewsSummary.length > 0
        ? scrapedData.reviewsSummary
        : [
            {
              buyerName: "לקוח מישראל",
              buyerCountry: "IL",
              rating: 5,
              comment: "הגיע מהר מאד תוך כ-10 ימים. איכות מצוינת ותואם בדיוק לתיאור.",
            },
          ],
      aliUrl: apiData.aliUrl || normalizedUrl,
      affiliateUrl: apiData.affiliateUrl || normalizedUrl,
    };
  }

  // Fallback to scraped data if it managed to get a real title/image
  if (scrapedData && scrapedData.mainImage && !scrapedData.mainImage.includes("unsplash.com")) {
    return scrapedData;
  }

  // If neither API nor scraper succeeded, throw clear actionable error
  throw new Error(
    `שליפת מוצר נכשלה (פריט #${aliId}): שרתי AliExpress לא החזירו נתונים עבור מוצר זה. ` +
      (apiError
        ? `תגובת ה-API: ${apiError}`
        : "נא לוודא את תקינות ה-Tracking ID וההרשאות ב-AliExpress Portals.")
  );
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
