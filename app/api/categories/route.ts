import { NextRequest, NextResponse } from "next/server";
import { jsonDb, CategoryRecord } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { safeGitCommitAndPush } from "@/lib/security/safe-git";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const categories = jsonDb.getCategories();
    const allTags = jsonDb.getAllTags();

    // Attach count of products and pages for each category
    const products = jsonDb.getProducts();
    const pages = jsonDb.getPages();

    const enriched = categories.map((cat) => {
      const prodCount = products.filter(
        (p) =>
          p.category === cat.nameHe ||
          p.category === cat.slug ||
          (p.originalTitle && p.originalTitle.toLowerCase().includes(cat.slug))
      ).length;

      const pageCount = pages.filter(
        (p) => p.targetCategory === cat.nameHe || p.targetCategory === cat.slug
      ).length;

      return {
        ...cat,
        productCount: prodCount,
        pageCount: pageCount,
      };
    });

    return NextResponse.json({
      success: true,
      categories: enriched,
      allTags,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const data = await req.json();
    if (!data.nameHe || !data.slug) {
      return NextResponse.json({ error: "חובה להזין שם קטגוריה בעברית ומזהה באנגלית (Slug)" }, { status: 400 });
    }

    const cleanSlug = String(data.slug)
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const now = new Date().toISOString();
    const id = data.id || `cat_${cleanSlug}_${Date.now()}`;

    const record: CategoryRecord = {
      id,
      nameHe: String(data.nameHe).trim(),
      slug: cleanSlug,
      icon: data.icon || "🏷️",
      aliCategoryId: data.aliCategoryId ? String(data.aliCategoryId).trim() : undefined,
      descriptionHe: data.descriptionHe ? String(data.descriptionHe).trim() : "",
      tags: Array.isArray(data.tags)
        ? data.tags.map((t: string) => String(t).trim()).filter(Boolean)
        : [],
      updatedAt: now,
      createdAt: data.createdAt || now,
    };

    jsonDb.upsertCategory(record);

    // Vercel Edge Cache Revalidation
    try {
      revalidatePath("/");
      revalidatePath("/categories");
      revalidatePath(`/categories/${cleanSlug}`);
    } catch {
      // ignore
    }

    // Git sync
    safeGitCommitAndPush(`CMS Category Upsert: ${record.nameHe}`).catch(() => {});

    return NextResponse.json({ success: true, category: record });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to save category" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const slug = searchParams.get("slug");

    if (!id && !slug) {
      return NextResponse.json({ error: "חסר מזהה למחיקה" }, { status: 400 });
    }

    jsonDb.deleteCategory(id || slug!);

    try {
      revalidatePath("/");
      revalidatePath("/categories");
    } catch {
      // ignore
    }

    safeGitCommitAndPush(`CMS Category Delete: ${id || slug}`).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to delete category" }, { status: 500 });
  }
}
