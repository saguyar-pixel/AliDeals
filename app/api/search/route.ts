import { NextRequest, NextResponse } from "next/server";
import { aliExpressApi } from "@/lib/aliexpress";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { supabaseDb } from "@/lib/db/supabase-db";

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId") || undefined;
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : undefined;
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "LAST_VOLUME_DESC";

    const minOrders = searchParams.get("minOrders") ? parseInt(searchParams.get("minOrders")!, 10) : undefined;
    const minRating = searchParams.get("minRating") ? parseFloat(searchParams.get("minRating")!) : undefined;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : 50;
    const pageNo = searchParams.get("pageNo") ? parseInt(searchParams.get("pageNo")!, 10) : 1;
    const theme = searchParams.get("theme") || undefined;

    if (!query && !categoryId && !theme) {
      return NextResponse.json({ error: "חובה להזין מילת חיפוש, לבחור קטגוריה או ערכת נושא" }, { status: 400 });
    }

    if (!aliExpressApi.isConfigured()) {
      return NextResponse.json(
        { error: "מפתחות AliExpress API אינם מוגדרים ב-Environment Variables" },
        { status: 500 }
      );
    }

    // Smart Check: Did the user paste a direct AliExpress item URL or ID into the search box?
    const cleanQuery = query.trim().replace(/^[?&/ "'`]+/, "").replace(/["'`]+$/, "");
    const idMatch =
      cleanQuery.match(/\/item\/(\d+)\.html/) ||
      cleanQuery.match(/item\/(\d+)/) ||
      cleanQuery.match(/^(\d{10,20})$/);

    if (idMatch && idMatch[1]) {
      const extractedId = idMatch[1];
      const singleProduct = await aliExpressApi.getProductDetail(extractedId);
      if (singleProduct && singleProduct.aliId) {
        return NextResponse.json({
          success: true,
          count: 1,
          results: [singleProduct],
          isDirectMatch: true,
        });
      }

      // Check if product exists in Supabase DB
      const existingInDb = await supabaseDb.getProductByAliId(extractedId);
      if (existingInDb) {
        return NextResponse.json({
          success: true,
          count: 1,
          results: [existingInDb],
          isDirectMatch: true,
          fromCatalog: true,
        });
      }
    }

    let searchResult: { products: any[]; errorDetails?: string; translatedQuery?: string; totalFound?: number };

    if (theme === "hot_products" && !cleanQuery) {
      searchResult = await aliExpressApi.getHotProducts({
        categoryId,
        maxPrice,
        minPrice,
        minOrders,
        minRating,
        pageNo,
        pageSize,
      });
    } else {
      searchResult = await aliExpressApi.searchProducts({
        keywords: cleanQuery || "best deals",
        categoryId,
        maxPrice,
        minPrice,
        sortBy,
        minOrders,
        minRating,
        pageNo,
        pageSize,
        theme,
      });
    }

    let finalResults = searchResult.products || [];
    let fromCatalog = false;

    // Fallback: If AliExpress search returned 0 items, search local/Supabase catalog
    if (finalResults.length === 0 && cleanQuery) {
      try {
        const catalogProducts = await supabaseDb.getProducts();
        const lowerQ = cleanQuery.toLowerCase();
        const matched = catalogProducts.filter((p) => {
          return (
            (p.titleHe && p.titleHe.toLowerCase().includes(lowerQ)) ||
            (p.originalTitle && p.originalTitle.toLowerCase().includes(lowerQ)) ||
            (p.category && p.category.toLowerCase().includes(lowerQ)) ||
            (p.tags && p.tags.some((t) => t.toLowerCase().includes(lowerQ)))
          );
        });
        if (matched.length > 0) {
          finalResults = matched;
          fromCatalog = true;
        }
      } catch {}
    }

    return NextResponse.json({
      success: true,
      count: finalResults.length,
      totalFound: fromCatalog ? finalResults.length : (searchResult.totalFound ?? finalResults.length),
      results: finalResults,
      translatedQuery: searchResult.translatedQuery,
      originalQuery: cleanQuery,
      errorDetails: searchResult.errorDetails,
      fromCatalog,
    });
  } catch (err: any) {
    console.error("Search API route error:", err);
    return NextResponse.json({ error: err.message || "שגיאה בחיפוש מוצרים" }, { status: 500 });
  }
}
