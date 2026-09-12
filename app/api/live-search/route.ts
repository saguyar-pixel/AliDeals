import { NextRequest, NextResponse } from "next/server";
import { aliExpressApi } from "@/lib/aliexpress";
import { translateHebrewSearch } from "@/lib/aliexpress/translator";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = searchParams.get("q") || "";
    const cleanQuery = rawQuery.trim().replace(/^[?&/ "'`]+/, "").replace(/["'`]+$/, "");
    const requestedSubId = searchParams.get("subId") || searchParams.get("sub_id") || "live_search_result";

    if (!cleanQuery) {
      return NextResponse.json({
        success: true,
        count: 0,
        results: [],
        message: "נא להזין מונח לחיפוש",
      });
    }

    if (!aliExpressApi.isConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: "מנוע החיפוש אינו מוגדר כעת (חסרים מפתחות API של אלי אקספרס)",
          results: [],
        },
        { status: 503 }
      );
    }

    // 1. Direct Item ID or AliExpress URL match
    const idMatch =
      cleanQuery.match(/\/item\/(\d+)\.html/) ||
      cleanQuery.match(/item\/(\d+)/) ||
      cleanQuery.match(/^(\d{10,20})$/);

    if (idMatch && idMatch[1]) {
      const extractedId = idMatch[1];
      const singleProduct = await aliExpressApi.getProductDetail(extractedId);
      if (singleProduct && singleProduct.aliId) {
        // Generate official affiliate link with dynamic SubID
        const directAffiliateUrl = await aliExpressApi.generateAffiliateLink(
          singleProduct.aliUrl || `https://www.aliexpress.com/item/${singleProduct.aliId}.html`,
          { subId1: requestedSubId }
        );

        return NextResponse.json({
          success: true,
          count: 1,
          results: [
            {
              ...singleProduct,
              affiliateUrl: directAffiliateUrl,
              underCustomsLimit: (singleProduct.priceUsd || 0) <= 75,
            },
          ],
          isDirectMatch: true,
        });
      }
    }

    // 2. Determine effective keywords:
    // If query is Hebrew, translate intelligently. If English, keep directly without alterations.
    const isHebrew = /[\u0590-\u05FF]/.test(cleanQuery);
    let searchKeywords = cleanQuery;
    let translatedQuery: string | undefined;

    if (isHebrew) {
      const translation = await translateHebrewSearch(cleanQuery);
      searchKeywords = translation.query || cleanQuery;
      translatedQuery = translation.query;
    }

    // 3. Search via official AliExpress API
    const searchResult = await aliExpressApi.searchProducts({
      keywords: searchKeywords,
      pageSize: 24,
      sortBy: "LAST_VOLUME_DESC",
    });

    const products = searchResult.products || [];

    // 4. Enrich products with requested SubID and customs status
    const enrichedResults = await Promise.all(
      products.map(async (p) => {
        const itemUrl = p.aliUrl || (p.aliId ? `https://www.aliexpress.com/item/${p.aliId}.html` : "https://www.aliexpress.com");
        
        let affiliateLink = p.affiliateUrl || itemUrl;
        if (affiliateLink.includes("s.click.aliexpress.com") || affiliateLink.includes("/e/")) {
          const separator = affiliateLink.includes("?") ? "&" : "?";
          if (!affiliateLink.includes("sub_id=")) {
            affiliateLink = `${affiliateLink}${separator}sub_id=${requestedSubId}`;
          }
        } else {
          try {
            affiliateLink = await aliExpressApi.generateAffiliateLink(itemUrl, {
              subId1: requestedSubId,
            });
          } catch {
            affiliateLink = itemUrl;
          }
        }

        const priceUsd = p.priceUsd || 0;
        const priceIls = p.priceIls || Math.round(priceUsd * 3.65 * 10) / 10;
        const underCustomsLimit = priceUsd <= 75;

        return {
          aliId: p.aliId || "",
          title: p.originalTitle || "מוצר אלי אקספרס",
          priceUsd,
          priceIls,
          originalPriceUsd: p.originalPriceUsd || (priceUsd > 0 ? Math.round(priceUsd * 1.3 * 100) / 100 : 0),
          discountPercent: p.discountPercent || 0,
          rating: p.rating || 4.8,
          ordersCount: p.ordersCount || 100,
          mainImage: p.mainImage || "",
          galleryImages: p.galleryImages || [],
          storeName: p.storeName || "AliExpress Store",
          aliUrl: itemUrl,
          affiliateUrl: affiliateLink,
          underCustomsLimit,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: enrichedResults.length,
      originalQuery: cleanQuery,
      translatedQuery,
      results: enrichedResults,
    });
  } catch (err: any) {
    console.error("Live search endpoint error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || "שגיאה בביצוע החיפוש",
        results: [],
      },
      { status: 500 }
    );
  }
}
