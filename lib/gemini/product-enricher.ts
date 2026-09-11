import { getGenAI, generateWithFallback, MODELS } from "./client";
import { recordGeminiCall } from "../agent/cadence-manager";

export interface EnrichedProductSeo {
  titleHe: string;
  descriptionHe: string;
  metaTitle: string;
  metaDescription: string;
  tags: string[];
  suggestedCategory: string;
  keyHighlightsHe: string[];
}

export interface RawProductInput {
  originalTitle: string;
  priceUsd?: number;
  priceIls?: number;
  category?: string;
  storeName?: string;
  specifications?: Record<string, any> | string;
  reviewsSummary?: any;
}

/**
 * Clean spam keywords commonly found in raw AliExpress titles
 */
function cleanAliExpressTitle(rawTitle: string): string {
  if (!rawTitle) return "מוצר מומלץ מאלי אקספרס";
  return rawTitle
    .replace(/\b(original|hot sale|hot|new arrival|new|2024|2025|2026|top|best quality|free shipping|drop shipping|dropshipping|wholesale|for xiaomi|for apple|for iphone|global version|official)\b/gi, "")
    .replace(/[|/[\]()+\-_]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Heuristic fallback when Gemini API is unavailable or rate-limited
 */
export function generateHebrewSeoFallback(product: RawProductInput): EnrichedProductSeo {
  const cleanTitle = cleanAliExpressTitle(product.originalTitle);
  const priceUsd = product.priceUsd || 25;
  const priceIls = product.priceIls || Math.round(priceUsd * 3.65);
  const isTaxFree = priceUsd < 75;

  const titleHe = cleanTitle.length > 5 ? cleanTitle : "מוצר מומלץ מאלי אקספרס";
  const metaTitle = `${titleHe.slice(0, 42)} - מחיר מבצע ומשלוח לישראל`;
  const metaDescription = `סקירה מלאה על ${titleHe.slice(0, 50)}: ביקורות קונים מישראל, מפרט טכני, ${isTaxFree ? "פטור מלא ממכס" : "מחיר יבוא משתלם"} וקישור ישיר למבצע באלי אקספרס.`;

  const highlights = [
    isTaxFree ? "פטור מלא ממכס ומע\"מ (מתחת לתקרת ה-75$)" : "תמורה מעולה למחיר בהשוואה לחנויות בישראל",
    "משלוח מבוטח ומהיר לישראל (AliExpress Standard Shipping)",
    "מתאים לתקן ישראלי 220V (שקע אירופאי EU)",
    `מחיר מבצע שווה של כ-₪${priceIls} ($${priceUsd.toFixed(2)})`,
  ];

  const descriptionHe = `${titleHe} הוא אחד המוצרים המבוקשים והמשתלמים ביותר בקטגוריה שלו באלי אקספרס. המוצר מציע שילוב מנצח של איכות בנייה גבוהה, אמינות לאורך זמן ותמורה מעולה למחיר שקשה למצוא בחנויות המקומיות בישראל.

רוכשים ישראלים רבים שכבר הזמינו את המוצר מציינים לשבח את קלות השימוש, העיצוב המוקפד והעמידות שלו בשימוש יומיומי. המוצר מגיע באריזה מאובטחת וכולל תאימות מלאה לדרישות החשמל והתקנים בארץ.

ברמת המחיר הנוכחית של כ-₪${priceIls} ($${priceUsd.toFixed(2)})${isTaxFree ? " הוא נהנה מפטור מלא ממכס ומע\"מ" : ""}, מה שהופך את הקנייה לעסקה כדאית במיוחד לכל מי שמחפש איכות ללא פשרות במחיר הוגן.`;

  const tags = [
    "אלי אקספרס מבצעים",
    "קניות באלי אקספרס",
    "מוצרים מומלצים",
    "משלוח לישראל",
    "פטור ממכס",
  ];

  return {
    titleHe,
    descriptionHe,
    metaTitle: metaTitle.slice(0, 60),
    metaDescription: metaDescription.slice(0, 155),
    tags,
    suggestedCategory: product.category || "אלקטרוניקה וגאדג'טים",
    keyHighlightsHe: highlights,
  };
}

/**
 * Enriches any AliExpress product with native Hebrew SEO Title, Description, and Meta tags.
 * Employs Ron (Copywriter & SEO specialist) via Gemini with automatic heuristic fallback.
 */
export async function enrichProductWithHebrewSeo(
  product: RawProductInput
): Promise<EnrichedProductSeo> {
  const cleanTitle = cleanAliExpressTitle(product.originalTitle);

  try {
    const prompt = `אתה רון, קופירייטר ישראלי מומחה ומוביל בתחום קידום אתרים (SEO) ומסחר אלקטרוני באפיליאציה לישראלים.
המטרה שלך: לקבל פרטי מוצר גולמיים מאלי אקספרס (הכוללים לעיתים כותרות ארוכות מדי ומבולגנות באנגלית) ולייצר עבורו תוכן שיווקי ו-SEO בעברית טבעית, מדויקת, מושכת וממירה.

פרטי המוצר הגולמיים:
- כותרת גולמית באנגלית: "${product.originalTitle}"
- כותרת מנוקה: "${cleanTitle}"
- מחיר בדולרים: $${product.priceUsd || 25}
- מחיר בשקלים: ₪${product.priceIls || 90}
- חנות/מותג: ${product.storeName || "AliExpress"}
- קטגוריה נוכחית: ${product.category || "כללי"}

הנחיות קריטיות:
1. titleHe: כותרת עברית טבעית ומפתה של המוצר (30-65 תווים). שמור על שם המותג באנגלית/עברית ואחריו תיאור בהיר ומדויק של המוצר. אסור מילות ספאם כמו "חינם", "100%", "מקורי 2026".
2. descriptionHe: 2-3 פסקאות שיווקיות רהוטות בעברית שמסבירות למה המוצר שווה, מה יתרונותיו ומידע חשוב לקונה הישראלי (שקע EU 220V אם מוצר חשמלי, פטור ממכס אם מתחת ל-75$, זמני הגעה).
3. metaTitle: כותרת SEO לגוגל באורך עד 60 תווים שתגדיל את שיעור ההקלקה (CTR).
4. metaDescription: תיאור SEO לגוגל באורך 120-155 תווים עם קריאה לפעולה (CTA).
5. tags: מערך של 5-7 תגיות חיפוש מבוקשות בעברית.
6. suggestedCategory: קטגוריה מדויקת בעברית מתוך קטגוריות נפוצות (אלקטרוניקה, בית ומטבח, כלי עבודה, טיפוח, אופנה, ילדים).
7. keyHighlightsHe: מערך של 3-4 יתרונות מרכזיים קצרים לקונה הישראלי.

החזר אך ורק אובייקט JSON תקין ללא שום טקסט נלווה וללא markdown codeblocks, במבנה הבא:
{
  "titleHe": "...",
  "descriptionHe": "...",
  "metaTitle": "...",
  "metaDescription": "...",
  "tags": ["..."],
  "suggestedCategory": "...",
  "keyHighlightsHe": ["..."]
}`;

    const client = getGenAI();
    const response = await generateWithFallback(client, {
      contents: prompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
      preferredModel: MODELS.FLASH,
    });

    recordGeminiCall();
    const responseText = response?.text || "";
    const cleanedJson = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    if (parsed && parsed.titleHe && parsed.descriptionHe) {
      return {
        titleHe: String(parsed.titleHe).trim(),
        descriptionHe: String(parsed.descriptionHe).trim(),
        metaTitle: String(parsed.metaTitle || parsed.titleHe).slice(0, 60).trim(),
        metaDescription: String(parsed.metaDescription || "").slice(0, 155).trim(),
        tags: Array.isArray(parsed.tags) ? parsed.tags : [cleanTitle, "אלי אקספרס"],
        suggestedCategory: String(parsed.suggestedCategory || product.category || "אלקטרוניקה וגאדג'טים"),
        keyHighlightsHe: Array.isArray(parsed.keyHighlightsHe) ? parsed.keyHighlightsHe : [],
      };
    }
  } catch (err: any) {
    console.warn("Gemini SEO enrichment failed or not configured, using smart Hebrew heuristic fallback:", err?.message);
  }

  return generateHebrewSeoFallback(product);
}
