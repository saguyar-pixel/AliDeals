import { NextRequest, NextResponse } from "next/server";
import { fetchAliExpressProduct } from "@/lib/aliexpress";
import { jsonDb } from "@/lib/db";
import {
  validateAndSanitizeAliExpressUrl,
  checkRateLimit,
  verifyAdminAccess,
} from "@/lib/security/firewall";

export async function POST(req: NextRequest) {
  try {
    // 1. Security check: Authentication / Localhost origin
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל." }, { status: 403 });
    }

    // 2. Security check: Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "local_client";
    const rateCheck = checkRateLimit(ip, 20, 60000); // max 20 requests per minute
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "קצב בקשות גבוה מדי. נא להמתין דקה לפני הניסיון הבא." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { urlOrId } = body;

    if (!urlOrId) {
      return NextResponse.json({ error: "Missing urlOrId parameter" }, { status: 400 });
    }

    // 3. Security check: SSRF Guard & Whitelist validation
    const urlValidation = validateAndSanitizeAliExpressUrl(String(urlOrId));
    if (!urlValidation.isValid || !urlValidation.sanitizedUrl) {
      return NextResponse.json({ error: urlValidation.error || "קישור לא מורשה." }, { status: 400 });
    }

    // 4. Fetch product via Dual-Engine (API + Scraper)
    const productData = await fetchAliExpressProduct(urlValidation.sanitizedUrl);

    // 5. Save in local JSON database
    jsonDb.upsertProduct({
      id: `prod_${productData.aliId}`,
      aliId: productData.aliId,
      originalTitle: productData.originalTitle,
      titleHe: productData.titleHe || null,
      descriptionHe: productData.descriptionHe || null,
      priceUsd: productData.priceUsd,
      priceIls: productData.priceIls,
      originalPriceUsd: productData.originalPriceUsd || null,
      discountPercent: productData.discountPercent,
      rating: productData.rating,
      ordersCount: productData.ordersCount,
      storeName: productData.storeName || null,
      commissionRate: productData.commissionRate || 7.0,
      mainImage: productData.mainImage,
      galleryImages: JSON.stringify(productData.galleryImages),
      specifications: JSON.stringify(productData.specifications),
      reviewsSummary: JSON.stringify(productData.reviewsSummary),
      aliUrl: productData.aliUrl,
      affiliateUrl: productData.affiliateUrl || null,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      product: {
        ...productData,
        id: `prod_${productData.aliId}`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown ingestion error";
    console.error("Ingestion API Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
