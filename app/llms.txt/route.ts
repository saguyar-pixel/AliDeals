import { NextResponse } from "next/server";
import { supabaseDb, PageRecord, ProductRecord } from "@/lib/db";

export const revalidate = 900;

function safeParseIds(val: unknown): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed.map(String) : [];
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
    console.warn("[llms.txt] DB fetch warning:", err);
  }

  const published = pages.filter((p) => p.status === "published");
  const productById = new Map<string, ProductRecord>();
  for (const prod of products) {
    if (prod.id) productById.set(String(prod.id), prod);
    if (prod.aliId) productById.set(String(prod.aliId), prod);
  }

  const top5Pages = published.filter((p) => p.type === "top5");
  const articlePages = published.filter((p) => p.type === "article" || p.type === "guide");
  const reviewPages = published.filter((p) => p.type === "review" || (!p.type && p.slug));

  const lines: string[] = [
    "# AliDeals ישראל (ali-deals.co.il)",
    "",
    "> פורטל צרכנות, סקירות מוצרים והשוואות מחירים מאלי אקספרס (AliExpress) המותאם במיוחד לצרכן הישראלי: מחירים בשקלים (₪) ובדולר ($), בדיקת פטור ממכס ומע״מ עד $75 (ומע״מ 18% מעל $75), אימות תקע אירופאי EU 220V, משלוח Choice מהיר לישראל ודירוגי רוכשים מאומתים.",
    "",
    "## כללי יבוא וצרכנות לישראל (Israeli Buyer Ground Truth)",
    "- **סף פטור ממס יבוא אישי:** הזמנות מוצרים בשווי של עד **$75 USD** (ערך הטובין ללא משלוח נפרד) פטורות לחלוטין ממכס וממע״מ בישראל.",
    "- **מע״מ בישראל מעל $75:** הזמנות בשווי $75.01 עד $500 חייבות ב-**18% מע״מ** (נכון לשנת 2026) ובעמלות שחרור במקרה של משלוח אקספרס פרטי.",
    "- **תאימות חשמל בישראל:** רשת החשמל בישראל היא **220V-240V / 50Hz** עם תאימות לתקע אירופאי (**EU Plug Type C**). יש להימנע מתקע אמריקאי 110V ללא שנאי.",
    "- **משלוחים מומלצים:** AliExpress Choice ו-AliExpress Standard Shipping מגיעים לנקודות איסוף בישראל בתוך כ-7 עד 14 ימי עסקים.",
    "",
    "## ממשקי AI ו-Agentic Browsing (Machine-Readable Endpoints)",
    `- [קטלוג מלא לסוכני AI (llms-full.txt)](${baseUrl}/llms-full.txt): תקצירי GEO מלאים, יתרונות, חסרונות, מחירים בש״ח וסטטוס מכס לכל הסקירות והמדריכים באתר.`,
    `- [חיפוש מוצרים וסקירות](${baseUrl}/search?q={query}): מנוע חיפוש היברידי (סקירות מערכת + קטלוג AliExpress בזמן אמת לישראל).`,
    `- [ממשק JSON לחיפוש חי](${baseUrl}/api/live-search?q={query}): נקודת קצה מחזירת JSON עם מחירי ש״ח/דולר ודירוגים.`,
    `- [גרסת Markdown נקייה לכל עמוד](${baseUrl}/api/markdown/{review|top5|article}/{slug}): שליפת תוכן נקי מחסכוני בטוקנים לכל סקירה או מדריך.`,
    `- [WebMCP Browser Tools](${baseUrl}/): האתר חושף כלי \`navigator.modelContext\` (\`search_israeli_deals\`, \`calculate_israel_customs\`, \`get_current_page_verdict\`) וטפסים דקלרטיביים לדפדפנים סוכניים.`,
    "",
  ];

  if (top5Pages.length > 0) {
    lines.push("## השוואות Top 5 המומלצים לישראל");
    for (const page of top5Pages.slice(0, 40)) {
      const desc = (page.directAnswerGeo || page.metaDescription || "").replace(/\s+/g, " ").trim();
      lines.push(
        `- [${page.title}](${baseUrl}/top5/${page.slug}) ([Markdown](${baseUrl}/api/markdown/top5/${page.slug}))${desc ? `: ${desc.slice(0, 180)}` : ""}`
      );
    }
    lines.push("");
  }

  if (articlePages.length > 0) {
    lines.push("## מדריכי צרכנות וכתבות עומק");
    for (const page of articlePages.slice(0, 50)) {
      const desc = (page.directAnswerGeo || page.metaDescription || "").replace(/\s+/g, " ").trim();
      lines.push(
        `- [${page.title}](${baseUrl}/articles/${page.slug}) ([Markdown](${baseUrl}/api/markdown/article/${page.slug}))${desc ? `: ${desc.slice(0, 180)}` : ""}`
      );
    }
    lines.push("");
  }

  if (reviewPages.length > 0) {
    lines.push("## סקירות מוצרים נבחרות ומאומתות לישראל");
    for (const page of reviewPages.slice(0, 100)) {
      const ids = safeParseIds(page.productIds);
      const prod = ids.length > 0 ? productById.get(ids[0]) : undefined;
      const priceTag =
        prod && prod.priceIls > 0
          ? ` [₪${prod.priceIls} / $${prod.priceUsd} | ${prod.priceUsd < 75 ? "פטור ממכס" : "מעל $75"} | ★${prod.rating || 4.8}]`
          : "";
      const desc = (page.directAnswerGeo || page.metaDescription || "").replace(/\s+/g, " ").trim();
      lines.push(
        `- [${prod?.titleHe || page.title}](${baseUrl}/reviews/${page.slug})${priceTag} ([Markdown](${baseUrl}/api/markdown/review/${page.slug}))${desc ? `: ${desc.slice(0, 150)}` : ""}`
      );
    }
    lines.push("");
  }

  return new NextResponse(lines.join("\n"), {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      "X-Robots-Tag": "all",
    },
  });
}
