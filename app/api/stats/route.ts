import { NextResponse } from "next/server";
import { jsonDb } from "@/lib/db";

export async function GET() {
  try {
    const allPages = jsonDb.getPages();
    const allProducts = jsonDb.getProducts();

    return NextResponse.json({
      totalPagesCount: allPages.length,
      totalProductsCount: allProducts.length,
      totalClicksCount: 0,
      recentClicks: [],
      recentPages: allPages.slice(0, 5),
    });
  } catch (error) {
    console.error("Stats fetch error:", error);
    return NextResponse.json({
      totalPagesCount: 0,
      totalProductsCount: 0,
      totalClicksCount: 0,
      recentClicks: [],
      recentPages: [],
    });
  }
}
