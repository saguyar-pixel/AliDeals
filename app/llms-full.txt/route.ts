import { NextResponse } from "next/server";
import { supabaseDb, PageRecord, ProductRecord } from "@/lib/db";

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

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  let pages: PageRecord[] = [];
  let products: ProductRecord[] = [];
  try {
    [pages, products] = await Promise.all([
      supabaseDb.getPages(),
      supabaseDb.getProducts(),
    ]);
  } catch (err) {
    console.warn("[llms-full.txt] DB fetch warning:", err);
  }

  const published = pages.filter((p) => p.status === "published");
  const productById = new Map<string, ProductRecord>();
  for (const prod of products) {
    if (prod.id) productById.set(String(prod.id), prod);
    if (prod.aliId) productById.set(String(prod.aliId), prod);
  }

  const sections: string[] = [
    "# AliDeals ישראל — מאגר ידע צרכני מלא לסוכני AI (llms-full.txt)",
    "",
    `> קובץ זה מרכז את כל פסקי הדין הצרכניים, המחירים בשקלים (₪) ובדולר ($), סטטוס פטור ממכס ($75 / מע״מ 18%), יתרונות וחסרונות של כל המוצרים והמדריכים הפעילים באתר ${baseUrl}.`,
    "",
    "---",
    "",
  ];

  for (const page of published) {
    const routeSegment =
      page.type === "top5"
        ? "top5"
        : page.type === "article" || page.type === "guide"
        ? "articles"
        : "reviews";
    const mdType =
      page.type === "top5"
        ? "top5"
        : page.type === "article" || page.type === "guide"
        ? "article"
        : "review";

    const canonicalUrl = `${baseUrl}/${routeSegment}/${page.slug}`;
    const markdownUrl = `${baseUrl}/api/markdown/${mdType}/${page.slug}`;
    const ids = safeParseArray<string>(page.productIds);
    const primaryProd = ids.length > 0 ? productById.get(String(ids[0])) : undefined;

    const pros = safeParseArray<string>(page.pros);
    const cons = safeParseArray<string>(page.cons);
    const faqs = safeParseArray<{ question: string; answer: string }>(page.faqs);

    sections.push(`## ${primaryProd?.titleHe || page.title}`);
    sections.push(`- **סוג תוכן:** ${mdType}`);
    sections.push(`- **קישור קנוני:** ${canonicalUrl}`);
    sections.push(`- **מקור Markdown מלא:** ${markdownUrl}`);
    if (page.targetCategory) {
      sections.push(`- **קטגוריה:** ${page.targetCategory}`);
    }
    if (primaryProd && primaryProd.priceIls > 0) {
      const taxStatus =
        primaryProd.priceUsd < 75
          ? "פטור מלא ממכס ומע״מ בישראל (מתחת ל-$75)"
          : "מעל $75 — חייב ב-18% מע״מ בישראל";
      sections.push(`- **מחיר משוער:** ₪${primaryProd.priceIls} ($${primaryProd.priceUsd} USD)`);
      sections.push(`- **סטטוס מכס ומע״מ:** ${taxStatus}`);
      sections.push(
        `- **דירוג והזמנות:** ★ ${primaryProd.rating || 4.8}/5 (${primaryProd.ordersCount || 100}+ הזמנות)`
      );
      if (primaryProd.isEuPlug || page.isEuPlug) {
        sections.push(`- **תאימות חשמל:** תקע אירופאי EU 220V מתאים לישראל`);
      }
    }

    if (page.directAnswerGeo) {
      sections.push("");
      sections.push(`### שורה תחתונה (Direct Answer)`);
      sections.push(page.directAnswerGeo.trim());
    }

    if (pros.length > 0) {
      sections.push("");
      sections.push("### יתרונות בולטים");
      for (const p of pros) {
        sections.push(`- ${p}`);
      }
    }

    if (cons.length > 0) {
      sections.push("");
      sections.push("### חסרונות ודגשים לפני הזמנה");
      for (const c of cons) {
        sections.push(`- ${c}`);
      }
    }

    if (faqs.length > 0) {
      sections.push("");
      sections.push("### שאלות נפוצות");
      for (const faq of faqs.slice(0, 4)) {
        if (faq?.question && faq?.answer) {
          sections.push(`- **ש: ${faq.question}** — ת: ${faq.answer}`);
        }
      }
    }

    sections.push("");
    sections.push("---");
    sections.push("");
  }

  return new NextResponse(sections.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      "X-Robots-Tag": "all",
    },
  });
}
