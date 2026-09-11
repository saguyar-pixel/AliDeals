import { NextRequest, NextResponse } from "next/server";
import { jsonDb, supabaseDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { safeGitCommitAndPush } from "@/lib/security/safe-git";
import { revalidatePath } from "next/cache";
import { aliExpressApi } from "@/lib/aliexpress";
import { enrichProductWithHebrewSeo } from "@/lib/gemini/product-enricher";

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const products = await supabaseDb.getProducts();
    const pages = await supabaseDb.getPages();

    // Attach usage count for each product
    const enriched = products.map((prod) => {
      const matchingPages = pages.filter((page) => {
        try {
          const ids = JSON.parse(page.productIds || "[]");
          return ids.includes(prod.id) || ids.includes(prod.aliId);
        } catch {
          return false;
        }
      });

      return {
        ...prod,
        usedInPages: matchingPages.map((p) => ({ id: p.id, title: p.title, slug: p.slug, type: p.type })),
      };
    });

    return NextResponse.json({ success: true, count: enriched.length, products: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load products" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const data = await req.json();
    if (!data.aliId || !data.originalTitle) {
      return NextResponse.json({ error: "חסר מזהה מוצר או כותרת" }, { status: 400 });
    }

    const id = data.id || `prod_${Date.now()}`;
    const now = new Date().toISOString();

    let finalTitleHe = data.titleHe;
    let finalDescriptionHe = data.descriptionHe;
    let finalMetaTitle = data.metaTitle;
    let finalMetaDescription = data.metaDescription;
    let finalTags = Array.isArray(data.tags) ? data.tags : [];
    let finalCategory = data.category || "כללי";

    // Auto-enrich if Hebrew SEO copy is missing or title is still raw English
    const needsEnrichment =
      !finalTitleHe ||
      finalTitleHe === data.originalTitle ||
      !finalDescriptionHe ||
      !finalMetaTitle;

    if (needsEnrichment) {
      try {
        const enriched = await enrichProductWithHebrewSeo({
          originalTitle: String(data.originalTitle),
          priceUsd: parseFloat(String(data.priceUsd || 0)),
          priceIls: parseFloat(String(data.priceIls || 0)),
          category: data.category,
          storeName: data.storeName,
          specifications: data.specifications,
        });
        if (!finalTitleHe || finalTitleHe === data.originalTitle) finalTitleHe = enriched.titleHe;
        if (!finalDescriptionHe) finalDescriptionHe = enriched.descriptionHe;
        if (!finalMetaTitle) finalMetaTitle = enriched.metaTitle;
        if (!finalMetaDescription) finalMetaDescription = enriched.metaDescription;
        if (finalTags.length === 0) finalTags = enriched.tags;
        if (finalCategory === "כללי" && enriched.suggestedCategory) finalCategory = enriched.suggestedCategory;
      } catch (e) {
        console.warn("Auto SEO enrichment in products route failed:", e);
      }
    }

    const productRecord = {
      id,
      aliId: String(data.aliId),
      originalTitle: String(data.originalTitle),
      titleHe: finalTitleHe || data.originalTitle,
      descriptionHe: finalDescriptionHe || "",
      metaTitle: finalMetaTitle ? String(finalMetaTitle).slice(0, 150) : null,
      metaDescription: finalMetaDescription ? String(finalMetaDescription).slice(0, 300) : null,
      category: finalCategory,
      tags: finalTags,
      priceUsd: parseFloat(String(data.priceUsd || 0)),
      priceIls: parseFloat(String(data.priceIls || (data.priceUsd ? data.priceUsd * 3.65 : 0))),
      originalPriceUsd: data.originalPriceUsd ? parseFloat(String(data.originalPriceUsd)) : null,
      discountPercent: data.discountPercent ? parseInt(String(data.discountPercent), 10) : 0,
      rating: data.rating ? parseFloat(String(data.rating)) : 4.8,
      ordersCount: data.ordersCount ? parseInt(String(data.ordersCount), 10) : 100,
      storeName: data.storeName || "AliExpress Store",
      sellerPositiveRate: data.sellerPositiveRate || "98.5%",
      commissionRate: data.commissionRate ? parseFloat(String(data.commissionRate)) : 7.0,
      mainImage: data.mainImage || "",
      galleryImages: data.galleryImages || [],
      specifications: data.specifications || {},
      reviewsSummary: data.reviewsSummary || [],
      aliUrl: data.aliUrl || `https://www.aliexpress.com/item/${data.aliId}.html`,
      affiliateUrl:
        data.affiliateUrl && (data.affiliateUrl.includes("s.click.aliexpress.com") || data.affiliateUrl.includes("/e/"))
          ? data.affiliateUrl
          : await aliExpressApi.generateAffiliateLink(data.aliUrl || `https://www.aliexpress.com/item/${data.aliId}.html`),
      status: "active",
      createdAt: now,
      updatedAt: now,
    };

    await supabaseDb.upsertProduct(productRecord);

    // Cascade Dynamic Revalidation: find all pages using this product and revalidate edge cache
    const pages = await supabaseDb.getPages();
    const matchingPages = pages.filter((p) => {
      try {
        const ids = JSON.parse(p.productIds || "[]");
        return ids.includes(id) || ids.includes(String(data.aliId));
      } catch {
        return false;
      }
    });

    try {
      revalidatePath("/");
      revalidatePath("/admin/products");
      revalidatePath("/admin/pages");
      for (const p of matchingPages) {
        revalidatePath(`/${p.type === "top5" ? "top5" : "reviews"}/${p.slug}`);
      }
    } catch {}

    if (!supabaseDb.isConfigured()) {
      safeGitCommitAndPush(`CMS Product Upsert: ${data.aliId}`).catch(() => {});
    }

    return NextResponse.json({ success: true, id, updatedPagesCount: matchingPages.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save product" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const aliId = searchParams.get("aliId");

    if (!id && !aliId) {
      return NextResponse.json({ error: "חסר מזהה למחיקה" }, { status: 400 });
    }

    const targetAliId = aliId || id?.replace(/^prod_/, "") || "";
    await supabaseDb.deleteProduct(targetAliId);

    // CASCADE DEPENDENCY: Remove this product from all pages that reference it
    const pages = await supabaseDb.getPages();
    let affectedPagesCount = 0;
    const affectedPageSlugs: Array<{ type: string; slug: string }> = [];

    for (const page of pages) {
      try {
        const ids: string[] = JSON.parse(page.productIds || "[]");
        const containsProd = (id && ids.includes(id)) || (aliId && ids.includes(aliId));
        if (containsProd) {
          affectedPagesCount++;
          affectedPageSlugs.push({ type: page.type, slug: page.slug });
          const remainingIds = ids.filter((pid) => pid !== id && pid !== aliId);
          await supabaseDb.upsertPage({
            ...page,
            productIds: JSON.stringify(remainingIds),
            updatedAt: new Date().toISOString(),
          });
        }
      } catch {}
    }

    // Vercel Edge Cache Revalidation for all affected pages
    try {
      revalidatePath("/");
      revalidatePath("/admin/products");
      revalidatePath("/admin/pages");
      for (const p of affectedPageSlugs) {
        revalidatePath(`/${p.type === "top5" ? "top5" : "reviews"}/${p.slug}`);
      }
    } catch {}

    if (!supabaseDb.isConfigured()) {
      safeGitCommitAndPush(`CMS Cascade Delete: ${id || aliId} removed from ${affectedPagesCount} pages`).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      message: `המוצר נמחק בהצלחה והוסר מ-${affectedPagesCount} עמודים באתר!`,
      affectedPagesCount,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete product" }, { status: 500 });
  }
}
