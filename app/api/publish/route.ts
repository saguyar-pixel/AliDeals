import { NextRequest, NextResponse } from "next/server";
import { jsonDb } from "@/lib/db";
import { safeGitCommitAndPush } from "@/lib/security/safe-git";
import { sanitizeSlug, checkRateLimit, verifyAdminAccess } from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    // 1. Security Check: Admin Access Authorization
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל." }, { status: 403 });
    }

    // 2. Security Check: Rate Limiting
    const ip = req.headers.get("x-forwarded-for") || "local_client";
    const rateCheck = checkRateLimit(`pub_${ip}`, 15, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "קצב פרסום גבוה מדי. נא להמתין דקה." },
        { status: 429 }
      );
    }

    const pageData = await req.json();

    if (!pageData.title) {
      return NextResponse.json({ error: "חסרה כותרת עמוד" }, { status: 400 });
    }

    // 3. Security Check: Sanitize Slug against Path Traversal & Injection
    const safeSlug = sanitizeSlug(pageData.slug || pageData.title);
    const now = new Date().toISOString();

    // 4. Save to Git-based JSON repository
    jsonDb.upsertPage({
      id: pageData.id || `page_${Date.now()}`,
      slug: safeSlug,
      type: pageData.type || "review",
      title: String(pageData.title).slice(0, 150),
      metaTitle: String(pageData.metaTitle || pageData.title).slice(0, 150),
      metaDescription: String(pageData.metaDescription || "").slice(0, 300),
      directAnswerGeo: String(pageData.directAnswerGeo || "").slice(0, 500),
      contentMarkdown: String(pageData.contentMarkdown || ""),
      structuredDataJson: pageData.structuredDataJson || null,
      featuredImage: pageData.featuredImage || null,
      infographicImage: pageData.infographicSvg || pageData.infographicImage || null,
      targetCategory: pageData.targetCategory || "כללי",
      tags: Array.isArray(pageData.tags) ? pageData.tags : [],
      productIds: JSON.stringify(pageData.productIds || []),
      status: "published",
      viewsCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 5. Vercel ISR Revalidation
    try {
      revalidatePath("/");
      revalidatePath("/admin/pages");
      revalidatePath(`/${pageData.type === "top5" ? "top5" : "reviews"}/${safeSlug}`);
    } catch {}

    // 6. Safe Git Commit and Push (No shell expansion, zero RCE risk)
    let gitPushSuccess = false;
    let gitMessage = "";

    if (pageData.autoPush !== false) {
      const commitMsg = `CMS Auto-Publish: ${safeSlug}`;
      const gitResult = await safeGitCommitAndPush(commitMsg);
      gitPushSuccess = gitResult.success;
      gitMessage = gitResult.success
        ? "השינויים נדחפו בהצלחה ל-GitHub והאתר יתעדכן תוך כ-40 שניות!"
        : `נשמר מקומית (${gitResult.output.slice(0, 80)})`;
    }

    return NextResponse.json({
      success: true,
      slug: safeSlug,
      gitPushSuccess,
      gitMessage,
      publicUrl: `/${pageData.type === "top5" ? "top5" : "reviews"}/${safeSlug}`,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Publish failed";
    console.error("Publish Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
