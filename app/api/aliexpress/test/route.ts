import { NextRequest, NextResponse } from "next/server";
import { aliExpressApi } from "@/lib/aliexpress";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("type") === "search") {
      const q = searchParams.get("q") || "GaN charger";
      const searchRes = await aliExpressApi.searchProducts({
        keywords: q,
        pageSize: 10,
        sortBy: "LAST_VOLUME_DESC",
        maxPrice: 75,
        minOrders: 100,
        minRating: 4.5,
      });
      return NextResponse.json({
        success: true,
        count: searchRes.products.length,
        products: searchRes.products.map((p) => ({
          aliId: p.aliId,
          title: p.originalTitle,
          priceUsd: p.priceUsd,
          priceIls: p.priceIls,
          orders: p.ordersCount,
          rating: p.rating,
          affiliateUrl: p.affiliateUrl,
        })),
        errorDetails: searchRes.errorDetails,
      });
    }

    const result = await aliExpressApi.testConnection();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "שגיאה בבדיקת החיבור" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await aliExpressApi.testConnection(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "שגיאה בבדיקת החיבור" },
      { status: 500 }
    );
  }
}
