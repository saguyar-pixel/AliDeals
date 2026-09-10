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
    const maxPrice = searchParams.get("maxPrice") ? parseFloat(searchParams.get("maxPrice")!) : 74.99;
    const minPrice = searchParams.get("minPrice") ? parseFloat(searchParams.get("minPrice")!) : undefined;
    const sortBy = (searchParams.get("sortBy") as any) || "LAST_VOLUME_DESC";

    if (!query) {
      return NextResponse.json({ error: "חובה להזין מילת חיפוש" }, { status: 400 });
    }

    if (!aliExpressApi.isConfigured()) {
      return NextResponse.json(
        { error: "מפתחות AliExpress API אינם מוגדרים ב-.env.local" },
        { status: 500 }
      );
    }

    const results = await aliExpressApi.searchProducts({
      keywords: query,
      maxPrice,
      minPrice,
      sortBy,
      pageSize: 15,
    });

    return NextResponse.json({ success: true, count: results.length, results });
  } catch (err: any) {
    console.error("Search API route error:", err);
    return NextResponse.json({ error: err.message || "שגיאה בחיפוש מוצרים" }, { status: 500 });
  }
}
