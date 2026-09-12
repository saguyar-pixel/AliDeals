import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { verifyAdminAccess, sanitizeSlug } from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const pages = await supabaseDb.getPages();
    return NextResponse.json({
      success: true,
      count: pages.length,
      pages,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load pages" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל" }, { status: 403 });
    }

    const data = await req.json();

    if (!data.title && !data.slug) {
      return NextResponse.json({ error: "חובה לציין כותרת או slug עבור העמוד" }, { status: 400 });
    }

    const safeSlug = sanitizeSlug(data.slug || data.title);
    const now = new Date().toISOString();

    const pageRecord = {
      id: data.id || `page_${Date.now()}`,
      slug: safeSlug,
      type: data.type || "review",
      title: String(data.title || data.slug || "עמוד חדש").trim().slice(0, 150),
      metaTitle: String(data.metaTitle || data.title || data.slug || "").trim().slice(0, 150),
      metaDescription: String(data.metaDescription || "").trim().slice(0, 300),
      directAnswerGeo: String(data.directAnswerGeo || "").trim().slice(0, 500),
      contentMarkdown: String(data.contentMarkdown || ""),
      structuredDataJson: data.structuredDataJson || null,
      featuredImage: data.featuredImage || null,
      infographicImage: data.infographicImage || data.infographicSvg || null,
      targetCategory: data.targetCategory || "אלקטרוניקה וגאדג'טים",
      tags: Array.isArray(data.tags) ? data.tags : [],
      productIds: typeof data.productIds === "string" ? data.productIds : JSON.stringify(data.productIds || []),
      status: data.status || "published",
      viewsCount: Number(data.viewsCount) || 0,
      boughtTogetherIds: Array.isArray(data.boughtTogetherIds) ? data.boughtTogetherIds : [],
      crossSellReason: data.crossSellReason ? String(data.crossSellReason) : undefined,
      createdAt: data.createdAt || now,
      updatedAt: now,
    };

    const saved = await supabaseDb.upsertPage(pageRecord);

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

    const publicUrl = getPageRoute(pageRecord.type, safeSlug);

    try {
      revalidatePath("/");
      revalidatePath("/admin/pages");
      revalidatePath(publicUrl);
    } catch {}

    return NextResponse.json({
      success: true,
      page: saved || pageRecord,
      slug: safeSlug,
      publicUrl,
      message: "העמוד נשמר בהצלחה בענן Supabase וזמין לצפייה!",
    });
  } catch (err: any) {
    console.error("POST /api/pages exception:", err);
    return NextResponse.json({ error: err.message || "שגיאה ביצירת העמוד בענן" }, { status: 500 });
  }
}
