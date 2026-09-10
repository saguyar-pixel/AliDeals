import { NextRequest, NextResponse } from "next/server";
import { jsonDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { safeGitCommitAndPush } from "@/lib/security/safe-git";
import { revalidatePath } from "next/cache";

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const products = jsonDb.getProducts();
    const pages = jsonDb.getPages();

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

    jsonDb.upsertProduct({
      id,
      aliId: String(data.aliId),
      originalTitle: String(data.originalTitle),
      titleHe: data.titleHe || data.originalTitle,
      descriptionHe: data.descriptionHe || "",
      category: data.category || "כללי",
      tags: Array.isArray(data.tags) ? data.tags : [],
      priceUsd: parseFloat(String(data.priceUsd || 0)),
      priceIls: parseFloat(String(data.priceIls || (data.priceUsd ? data.priceUsd * 3.65 : 0))),
      originalPriceUsd: data.originalPriceUsd ? parseFloat(String(data.originalPriceUsd)) : null,
      discountPercent: data.discountPercent ? parseInt(String(data.discountPercent), 10) : 0,
      rating: data.rating ? parseFloat(String(data.rating)) : 4.8,
      ordersCount: data.ordersCount ? parseInt(String(data.ordersCount), 10) : 100,
      storeName: data.storeName || "AliExpress Store",
      mainImage: data.mainImage || "",
      galleryImages: data.galleryImages || [],
      specifications: data.specifications || {},
      reviewsSummary: data.reviewsSummary || [],
      aliUrl: data.aliUrl || `https://www.aliexpress.com/item/${data.aliId}.html`,
      affiliateUrl: data.affiliateUrl || data.aliUrl,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    // Vercel Edge Cache Revalidation
    try {
      revalidatePath("/");
      revalidatePath("/admin/products");
    } catch {}

    // Auto push if in cloud
    safeGitCommitAndPush(`CMS Product Upsert: ${data.aliId}`).catch(() => {});

    return NextResponse.json({ success: true, id });
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

    const list = jsonDb.getProducts();
    const filtered = list.filter((p) => (id ? p.id !== id : p.aliId !== aliId));

    const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
    const { safeWriteJson } = await import("@/lib/agent/storage-helper");
    safeWriteJson("products.json", filtered);

    // Vercel Edge Cache Revalidation
    try {
      revalidatePath("/");
      revalidatePath("/admin/products");
    } catch {}

    safeGitCommitAndPush(`CMS Product Deleted: ${id || aliId}`).catch(() => {});

    return NextResponse.json({ success: true, message: "המוצר נמחק בהצלחה" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete product" }, { status: 500 });
  }
}
