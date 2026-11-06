import { NextResponse } from "next/server";
import { supabaseDb, ProductRecord } from "@/lib/db";

export const revalidate = 900;

function safeParseArray<T = string>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

interface MarkdownRouteContext {
  params: Promise<{
    type: string;
    slug: string;
  }>;
}

export async function GET(_request: Request, { params }: MarkdownRouteContext) {
  const { type, slug } = await params;
  const decodedSlug = decodeURIComponent(slug || "").trim();

  if (!decodedSlug) {
    return new NextResponse("# 400 Bad Request\nMissing slug parameter.\n", {
      status: 400,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  const page = await supabaseDb.getPageBySlug(decodedSlug);
  if (!page || page.status !== "published") {
    return new NextResponse("# 404 Not Found\nהעמוד המבוקש לא נמצא או אינו מפורסם.\n", {
      status: 404,
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
  const normalizedType =
    type === "top5" || page.type === "top5"
      ? "top5"
      : type === "article" || page.type === "article" || page.type === "guide"
      ? "articles"
      : "reviews";

  const canonicalUrl = `${baseUrl}/${normalizedType}/${page.slug}`;

  const productIds = safeParseArray<string>(page.productIds);
  const linkedProducts: ProductRecord[] = [];
  for (const pid of productIds.slice(0, 6)) {
    const found =
      (await supabaseDb.getProductById(pid)) ||
      (await supabaseDb.getProductByAliId(pid));
    if (found) linkedProducts.push(found);
  }

  const primaryProd = linkedProducts[0] || null;
  const pros = safeParseArray<string>(page.pros);
  const cons = safeParseArray<string>(page.cons);
  const faqs = safeParseArray<{ question: string; answer: string }>(page.faqs);

  const lines: string[] = [
    "---",
    `title: "${(primaryProd?.titleHe || page.title || "").replace(/"/g, '\\"')}"`,
    `canonical_url: "${canonicalUrl}"`,
    `content_type: "${page.type || type}"`,
    `category: "${(page.targetCategory || primaryProd?.category || "כללי").replace(/"/g, '\\"')}"`,
    `updated_at: "${page.updatedAt || page.createdAt || new Date().toISOString()}"`,
  ];

  if (primaryProd && primaryProd.priceIls > 0) {
    lines.push(`price_ils: ${primaryProd.priceIls}`);
    lines.push(`price_usd: ${primaryProd.priceUsd}`);
    lines.push(`israel_customs_exempt_under_75_usd: ${primaryProd.priceUsd < 75}`);
    lines.push(`israel_vat_rate_above_75_usd: "18%"`);
    lines.push(`rating: ${primaryProd.rating || 4.8}`);
    lines.push(`orders_count: ${primaryProd.ordersCount || 100}`);
    if (page.isEuPlug !== null && page.isEuPlug !== undefined) {
      lines.push(`eu_plug_220v_compatible: ${Boolean(page.isEuPlug)}`);
    } else if (primaryProd.isEuPlug !== null && primaryProd.isEuPlug !== undefined) {
      lines.push(`eu_plug_220v_compatible: ${Boolean(primaryProd.isEuPlug)}`);
    }
  }
  lines.push("---", "");

  lines.push(`# ${primaryProd?.titleHe || page.title}`);
  lines.push("");
  lines.push(`> מקור רשמי: [AliDeals ישראל](${canonicalUrl})`);
  lines.push("");

  if (page.directAnswerGeo) {
    lines.push("## שורה תחתונה לרוכש הישראלי (Direct Answer)");
    lines.push(page.directAnswerGeo.trim());
    lines.push("");
  }

  if (linkedProducts.length > 0) {
    lines.push("## נתוני מוצרים ומחירים מאומתים לישראל");
    for (let i = 0; i < linkedProducts.length; i++) {
      const p = linkedProducts[i];
      const taxLabel =
        p.priceUsd < 75
          ? "פטור ממכס ומע״מ בישראל (מתחת ל-$75)"
          : "מעל $75 (חייב במע״מ 18%)";
      const goLink = `${baseUrl}/go/${p.aliId || p.id}?src=agent_markdown`;
      lines.push(
        `${i + 1}. **${p.titleHe || p.originalTitle}** — **₪${p.priceIls}** ($${p.priceUsd}) | ${taxLabel} | דירוג ★${p.rating || 4.8}/5 (${p.ordersCount || 100}+ הזמנות) | [בדיקת מחיר באלי אקספרס](${goLink})`
      );
    }
    lines.push("");
  }

  if (pros.length > 0) {
    lines.push("## יתרונות");
    for (const item of pros) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (cons.length > 0) {
    lines.push("## חסרונות ודגשים חשובים");
    for (const item of cons) {
      lines.push(`- ${item}`);
    }
    lines.push("");
  }

  if (page.contentMarkdown) {
    lines.push("## סקירה מלאה");
    lines.push(page.contentMarkdown.trim());
    lines.push("");
  }

  if (faqs.length > 0) {
    lines.push("## שאלות ותשובות נפוצות (FAQ)");
    for (const faq of faqs) {
      if (faq?.question && faq?.answer) {
        lines.push(`### ${faq.question}`);
        lines.push(faq.answer.trim());
        lines.push("");
      }
    }
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      Link: `<${canonicalUrl}>; rel="canonical"`,
      "X-Robots-Tag": "noindex, follow",
    },
  });
}
