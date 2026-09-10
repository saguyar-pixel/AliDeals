import { NextRequest, NextResponse } from "next/server";
import { aliExpressApi } from "@/lib/aliexpress";
import { verifyAdminAccess } from "@/lib/security/firewall";

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

    if (!query && !categoryId) {
      return NextResponse.json({ error: "חובה להזין מילת חיפוש או לבחור קטגוריה" }, { status: 400 });
    }

    if (!aliExpressApi.isConfigured()) {
      return NextResponse.json(
        { error: "מפתחות AliExpress API אינם מוגדרים ב-Environment Variables" },
        { status: 500 }
      );
    }

    const { products, errorDetails } = await aliExpressApi.searchProducts({
      keywords: query || "best deals",
      categoryId,
      maxPrice,
      minPrice,
      sortBy,
      pageSize: 20,
    });

    return NextResponse.json({
      success: true,
      count: products.length,
      results: products,
      errorDetails,
    });
  } catch (err: any) {
    console.error("Search API route error:", err);
    return NextResponse.json({ error: err.message || "שגיאה בחיפוש מוצרים" }, { status: 500 });
  }
}
