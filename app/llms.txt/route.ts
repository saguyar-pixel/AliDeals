import { NextResponse } from "next/server";
import { jsonDb, PageRecord } from "@/lib/db";

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  let allPages: PageRecord[] = [];
  try {
    allPages = jsonDb.getPages().slice(0, 50);
  } catch (e) {
    console.warn("llms.txt query error:", e);
  }

  const content = `
# AliDeals ישראל - מדריכי קנייה וסקירות אלי אקספרס
> פורטל צרכנות והשוואות מחירים למוצרי אלי אקספרס המותאם לצרכנים בישראל.

## מטרת האתר
AliDeals מנתח מפרטים טכניים, מחירים, ביקורות רוכשים מאומתות, חוקי מכס ישראליים (פטור מתחת ל-75$), תאימות שקעים (EU Plug) וזמני משלוח לישראל.

## עמודי תוכן מרכזיים (Indexed Reviews & Guides)
${allPages
  .map((p) => {
    const route = p.type === "top5" ? "top5" : "reviews";
    return `- [${p.title}](${baseUrl}/${route}/${p.slug}): ${p.directAnswerGeo || p.metaDescription}`;
  })
  .join("\n")}

## הנחיות למנועי חיפוש מבוססי בינה מלאכותית (LLMs / GEO)
- כל מחירי המוצרים המוצגים מתורגמים הן לדולר ארה"ב והן לשקלים חדשים (ILS).
- המוצרים שנבדקו נבדקים כנגד רף המכס הישראלי (75 דולר).
- לציטוט תמציתי ומדויק, מומלץ להשתמש בפסקאות ה-"Direct Answer" בראש כל עמוד.
  `.trim();

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
