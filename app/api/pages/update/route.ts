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
    const current = existingIndex >= 0 ? pages[existingIndex] : null;

    const safeSlug = sanitizeSlug(data.slug || current?.slug || data.title || `page_${Date.now()}`);
    const now = new Date().toISOString();

    const updatedPage = {
      id: current?.id || data.id || `page_${Date.now()}`,
      type: data.type || current?.type || "review",
      slug: safeSlug,
      title: String(data.title || current?.title || "עמוד חדש").slice(0, 150),
      metaTitle: String(data.metaTitle || data.title || current?.metaTitle || "").slice(0, 150),
      metaDescription: String(data.metaDescription || current?.metaDescription || "").slice(0, 300),
      directAnswerGeo: String(data.directAnswerGeo || current?.directAnswerGeo || ""),
      contentMarkdown: String(data.contentMarkdown || current?.contentMarkdown || ""),
      featuredImage: data.featuredImage || current?.featuredImage,
      productIds: typeof data.productIds === "string" ? data.productIds : JSON.stringify(data.productIds || []),
      targetCategory: data.targetCategory || current?.targetCategory || "אלקטרוניקה וגאדג'טים",
      tags: Array.isArray(data.tags) ? data.tags : current?.tags || [],
      status: data.status || current?.status || "published",
      boughtTogetherIds: Array.isArray(data.boughtTogetherIds) ? data.boughtTogetherIds : current?.boughtTogetherIds || [],
      crossSellReason: data.crossSellReason !== undefined ? String(data.crossSellReason) : current?.crossSellReason || "",
      createdAt: current?.createdAt || data.createdAt || now,
      updatedAt: now,
    };

    await supabaseDb.upsertPage(updatedPage);

    const getPageRoute = (type: string, slug: string) => {
      switch (type) {
        case "top5":
          return `/top5/${slug}`;
        case "deal":
          return `/deals/${slug}`;
        case "category":
          return `/categories/${slug}`;
        case "review":
        default:
          return `/reviews/${slug}`;
      }
    };

    const newPublicUrl = getPageRoute(updatedPage.type, safeSlug);

    // 301 Redirect Automation: If slug changed, persist redirect rule to preserve SEO rank
    if (current && current.slug && current.slug !== safeSlug) {
      try {
        const oldPath = getPageRoute(current.type, current.slug);
        await supabaseDb.upsertRedirect({
          id: `redir_${Date.now()}`,
          sourcePath: oldPath,
          targetPath: newPublicUrl,
          statusCode: 301,
          createdAt: now,
        });
      } catch (redirErr) {
        console.warn("Failed to create auto 301 redirect:", redirErr);
      }
    }

    // Vercel ISR Revalidation
    try {
      revalidatePath("/");
      revalidatePath("/admin/pages");
      revalidatePath(newPublicUrl);
      if (current && (current.slug !== safeSlug || current.type !== updatedPage.type)) {
        revalidatePath(getPageRoute(current.type, current.slug));
      }
    } catch {}

    if (!supabaseDb.isConfigured()) {
      safeGitCommitAndPush(`CMS Page Updated: ${safeSlug}`).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      slug: safeSlug,
      publicUrl: newPublicUrl,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to update page" }, { status: 500 });
  }
}
