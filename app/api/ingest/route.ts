import { NextRequest, NextResponse } from "next/server";
import { fetchAliExpressProduct, aliExpressApi } from "@/lib/aliexpress";
import { jsonDb, supabaseDb } from "@/lib/db";
import {
  validateAndSanitizeAliExpressUrl,
  checkRateLimit,
  verifyAdminAccess,
} from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

async function processSingleIngest(rawUrlOrId: string, category?: string) {
  // 1. Validate & Sanitize URL
  const urlValidation = validateAndSanitizeAliExpressUrl(String(rawUrlOrId));
  if (!urlValidation.isValid || !urlValidation.sanitizedUrl) {
    throw new Error(urlValidation.error || `קישור לא מורשה עבור ${rawUrlOrId}`);
  }

  // 2. Fetch product via Dual-Engine (API + Scraper)
  const productData = await fetchAliExpressProduct(urlValidation.sanitizedUrl);

  // 3. Guarantee Verified Affiliate Link
  let affiliateUrl = productData.affiliateUrl;
  if (!affiliateUrl || (!affiliateUrl.includes("s.click.aliexpress.com") && !affiliateUrl.includes("/e/"))) {
    try {
      const generated = await aliExpressApi.generateAffiliateLink(productData.aliUrl || urlValidation.sanitizedUrl);
      if (generated && (generated.includes("s.click.aliexpress.com") || generated.includes("/e/"))) {
        affiliateUrl = generated;
      }
    } catch {
      // fallback
    }
  }
  if (!affiliateUrl) {
    affiliateUrl = productData.aliUrl || urlValidation.sanitizedUrl;
  }

  const now = new Date().toISOString();
  const record = {
    id: `prod_${productData.aliId}`,
    aliId: productData.aliId,
    originalTitle: productData.originalTitle,
    titleHe: productData.titleHe || null,
    descriptionHe: productData.descriptionHe || null,
    metaTitle: productData.metaTitle || null,
    metaDescription: productData.metaDescription || null,
    tags: productData.tags || [],
    category: category || "אלקטרוניקה וגאדג'טים",
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
    affiliateUrl,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };

  await supabaseDb.upsertProduct(record);

  return {
    ...productData,
    affiliateUrl,
    id: `prod_${productData.aliId}`,
  };
}

export async function POST(req: NextRequest) {
  try {
    // 1. Security check: Admin Access Authorization
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל." }, { status: 403 });
    }

    // 2. Security check: Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "local_client";
    const rateCheck = checkRateLimit(ip, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "קצב בקשות גבוה מדי. נא להמתין דקה לפני הניסיון הבא." },
        { status: 429 }
      );
    }

    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "בקשה לא תקינה (JSON parsing failed)" }, { status: 400 });
    }

    const { urlOrId, urls, category } = body || {};

    // Case A: Bulk Ingestion (Array of URLs or Item IDs)
    if (Array.isArray(urls) && urls.length > 0) {
      const cleanUrls = urls
        .map((u: string) => String(u).trim())
        .filter(Boolean)
        .slice(0, 20); // Maximum 20 per batch

      const results: Array<{ success: boolean; product?: any; error?: string; input: string }> = [];

      for (const u of cleanUrls) {
        try {
          const prod = await processSingleIngest(u, category);
          results.push({ success: true, product: prod, input: u });
        } catch (err: any) {
          results.push({ success: false, error: err?.message || "שגיאה במשיכת מוצר", input: u });
        }
      }

      try {
        revalidatePath("/");
        revalidatePath("/admin/products");
      } catch {}

      return NextResponse.json({
        success: true,
        isBulk: true,
        count: results.filter((r) => r.success).length,
        total: cleanUrls.length,
        results,
      });
    }

    // Case B: Single Ingestion
    if (!urlOrId) {
      return NextResponse.json({ error: "חובה להזין פרמטר urlOrId או מערך urls" }, { status: 400 });
    }

    const product = await processSingleIngest(String(urlOrId), category);

    try {
      revalidatePath("/");
      revalidatePath("/admin/products");
    } catch {}

    return NextResponse.json({
      success: true,
      product,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "שגיאה במשיכת המוצר";
    console.error("Ingestion API Error:", error);

    let extractedAliId = "";
    let extractedUrl = "";
    try {
      const raw = String(body?.urlOrId || "");
      const match =
        raw.match(/\/item\/(\d+)\.html/) ||
        raw.match(/item\/(\d+)/) ||
        raw.match(/(\d{8,25})/);
      if (match) {
        extractedAliId = match[1];
        extractedUrl = raw.includes("http") ? raw : `https://www.aliexpress.com/item/${match[1]}.html`;
      } else if (raw.includes("http")) {
        extractedUrl = raw;
      }
    } catch {}

    return NextResponse.json({
      error: msg,
      aliId: extractedAliId,
      aliUrl: extractedUrl,
    }, { status: 500 });
  }
}
