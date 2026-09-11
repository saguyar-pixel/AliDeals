import { NextResponse } from "next/server";
import { jsonDb, supabaseDb, PageRecord } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  let allPages: PageRecord[] = [];
  try {
    const pages = await supabaseDb.getPages();
    allPages = pages.slice(0, 50);
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

## מדיניות, אמינות ותקינה (Trust & Legal Compliance)
- [תנאי שימוש והגבלת אחריות](${baseUrl}/terms): פירוט מלא על מהות האתר כפורטל תוכן והשוואות, גילוי נאות תוכנית שותפים (Affiliate Disclosure), והגבלת אחריות לגבי מוכרי צד שלישי.
- [מדיניות פרטיות ואבטחת מידע](${baseUrl}/privacy): אפס איסוף נתוני אשראי או פרטים מזהים רגישים, עמידה בחוק הגנת הפרטיות התשמ"א-1981, ושימוש סטטיסטי אנונימי ב-GA4.
- [הצהרת נגישות](${baseUrl}/accessibility): תאימות לתקן ישראלי ת"י 5568 רמת AA והנחיות WCAG 2.1, ניווט מקלדת מלא, תמיכה בקוראי מסך ופרטי רכז נגישות.
  `.trim();

  return new NextResponse(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
