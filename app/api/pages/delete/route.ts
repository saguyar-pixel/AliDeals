import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { safeGitCommitAndPush } from "@/lib/security/safe-git";
import { revalidatePath } from "next/cache";

export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id");
    const slugParam = searchParams.get("slug");
    const idsParam = searchParams.get("ids");

    let targets: { id?: string; slug?: string }[] = [];

    // 1. Batch ids from query params
    if (idsParam) {
      const list = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      targets = list.map((item) => ({ id: item, slug: item }));
    } else if (idParam || slugParam) {
      targets = [{ id: idParam || undefined, slug: slugParam || undefined }];
    } else {
      // 2. Try JSON body for batch or single payload
      try {
        const body = await req.json();
        if (Array.isArray(body.ids)) {
          targets = body.ids.map((item: string) => ({ id: item, slug: item }));
        } else if (body.id || body.slug) {
          targets = [{ id: body.id, slug: body.slug }];
        }
      } catch {
        // Body was empty or not json
      }
    }

    if (targets.length === 0) {
      return NextResponse.json(
        { error: "חובה לציין מזהה עמוד (id) או slug למחיקה" },
        { status: 400 }
      );
    }

    const deletedSlugs: string[] = [];
    const deletedTypes: string[] = [];

    for (const target of targets) {
      const key = target.id || target.slug || "";
      if (!key) continue;

      // Lookup page details prior to deletion for proper revalidation
      const page =
        (await supabaseDb.getPageBySlug(target.slug || key)) ||
        (target.id ? await supabaseDb.getPageById(target.id) : null);

      const slug = page?.slug || target.slug || key;
      const type = page?.type || "review";

      await supabaseDb.deletePage(key);
      deletedSlugs.push(slug);
      deletedTypes.push(type);

      // Revalidate individual dynamic page routes
      try {
        revalidatePath(`/top5/${slug}`);
        revalidatePath(`/reviews/${slug}`);
        revalidatePath(`/deals/${slug}`);
        revalidatePath(`/deal/${slug}`);
        revalidatePath(`/categories/${slug}`);
      } catch (e) {
        console.warn(`revalidatePath error for ${slug}:`, e);
      }
    }

    // Revalidate listing, hubs, and admin routes
    try {
      revalidatePath("/");
      revalidatePath("/admin/pages");
      revalidatePath("/top5");
      revalidatePath("/reviews");
      revalidatePath("/deals");
    } catch {}

    // Git sync for static data repository backup
    safeGitCommitAndPush(
      `CMS Pages Deleted (${targets.length}): ${deletedSlugs.slice(0, 3).join(", ")}`
    ).catch(() => {});

    return NextResponse.json({
      success: true,
      message:
        targets.length === 1
          ? `העמוד מסוג ${deletedTypes[0] || "עמוד"} נמחק בהצלחה`
          : `נמחקו בהצלחה ${targets.length} עמודים`,
      deletedCount: targets.length,
      deletedSlugs,
    });
  } catch (err: any) {
    console.error("Delete page exception:", err);
    return NextResponse.json(
      { error: err.message || "Failed to delete page" },
      { status: 500 }
    );
  }
}
