import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { safeGitCommitAndPush } from "@/lib/security/safe-git";
import { sanitizeSlug } from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const data = await req.json();
    if (!data.id && !data.slug) {
      return NextResponse.json({ error: "חובה לציין מזהה או slug של העמוד" }, { status: 400 });
    }

    const pages = await supabaseDb.getPages();
    const existingIndex = pages.findIndex((p) => (data.id ? p.id === data.id : p.slug === data.slug));

    if (existingIndex < 0) {
      return NextResponse.json({ error: "העמוד המבוקש לעריכה לא נמצא" }, { status: 404 });
    }

    const current = pages[existingIndex];
    const safeSlug = sanitizeSlug(data.slug || current.slug);
    const now = new Date().toISOString();

    const updatedPage = {
      ...current,
      slug: safeSlug,
      title: String(data.title || current.title).slice(0, 150),
      metaTitle: String(data.metaTitle || data.title || current.metaTitle).slice(0, 150),
      metaDescription: String(data.metaDescription || current.metaDescription).slice(0, 300),
      directAnswerGeo: String(data.directAnswerGeo || current.directAnswerGeo || ""),
      contentMarkdown: String(data.contentMarkdown || current.contentMarkdown || ""),
      featuredImage: data.featuredImage || current.featuredImage,
      productIds: typeof data.productIds === "string" ? data.productIds : JSON.stringify(data.productIds || []),
      targetCategory: data.targetCategory || current.targetCategory,
      tags: Array.isArray(data.tags) ? data.tags : current.tags || [],
      status: data.status || current.status || "published",
      updatedAt: now,
    };

    pages[existingIndex] = updatedPage;

    await supabaseDb.upsertPage(updatedPage);

    // Vercel ISR Revalidation
    try {
      revalidatePath("/");
      revalidatePath("/admin/pages");
      revalidatePath(`/${updatedPage.type === "top5" ? "top5" : "reviews"}/${safeSlug}`);
      if (current.slug !== safeSlug) {
        revalidatePath(`/${current.type === "top5" ? "top5" : "reviews"}/${current.slug}`);
      }
    } catch {}

    if (!supabaseDb.isConfigured()) {
      safeGitCommitAndPush(`CMS Page Updated: ${safeSlug}`).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      slug: safeSlug,
      publicUrl: `/${updatedPage.type === "top5" ? "top5" : "reviews"}/${safeSlug}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update page" }, { status: 500 });
  }
}
