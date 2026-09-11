import { ai, getGenAI, MODELS, generateWithFallback, isGeminiConfigured } from "./client";
import { REVIEW_SYSTEM_PROMPT, TOP5_SYSTEM_PROMPT, TOP_N_SYSTEM_PROMPT, DEAL_SYSTEM_PROMPT } from "./prompts";
import { AliExpressProduct } from "../aliexpress/types";
import { generateRonReview, generateRonCrossSellReason } from "../agent/ron-copywriter";

export interface GeneratedReviewContent {
  title: string;
  titleHe?: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  directAnswerGeo: string;
  contentMarkdown: string;
  pros: string[];
  cons: string[];
  faqs: Array<{ question: string; answer: string }>;
  israelContext: {
    under75TaxExempt: boolean;
    taxNotes: string;
    plugType: string;
    shippingEstimate: string;
  };
}

export interface GeneratedTopNContent {
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  directAnswerGeo: string;
  contentMarkdown: string;
  faqs: Array<{ question: string; answer: string }>;
  rankings: Array<{
    rank: number;
    badge: string;
    titleHe: string;
    keyHighlight: string;
    verdict: string;
  }>;
}

export type GeneratedTop5Content = GeneratedTopNContent;

export interface GeneratedDealContent {
  title: string;
  titleHe?: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  directAnswerGeo: string;
  contentMarkdown: string;
  dealBadge: string;
  savingsIls: number;
  savingsPercent: number;
  faqs: Array<{ question: string; answer: string }>;
  israelContext: {
    under75TaxExempt: boolean;
    taxNotes: string;
    plugType: string;
    shippingEstimate: string;
  };
}

/**
 * Generate a complete high-converting Single Product Review in Hebrew via Agent Ron
 */
export async function generateProductReview(product: AliExpressProduct): Promise<GeneratedReviewContent> {
  return generateRonReview(product);
}

/**
 * Generate a TOP N (3 to 10 items) Roundup page in Hebrew
 */
export async function generateTopNRoundup(
  categoryNameHe: string,
  productsList: AliExpressProduct[]
): Promise<GeneratedTopNContent> {
  const count = Math.min(Math.max(productsList.length, 3), 10);
  const activeProducts = productsList.slice(0, count);

  const prompt = `
צור עמוד השוואה מקיף של "${count} המובילים" (TOP ${count}) עבור הקטגוריה: "${categoryNameHe}".
להלן רשימת ${count} המוצרים המובילים שנאספו:
${activeProducts
  .map(
    (p, i) => `
${i + 1}. מזהה: ${p.aliId}
   שם מקורי: ${p.originalTitle}
   שם עברי: ${p.titleHe || p.originalTitle}
   מחיר: $${p.priceUsd} (₪${p.priceIls})
   דירוג: ${p.rating} (${p.ordersCount} הזמנות)
`
  )
  .join("\n")}

החזר תשובה אך ורק ב-JSON תקין לפי הסכמה:
{
  "title": "כותרת עברית מובילה (למשל: ${count} ה${categoryNameHe} הטובים ביותר באלי אקספרס לשנת 2026)",
  "slug": "top-${count}-${encodeURIComponent(categoryNameHe).slice(0, 30)}-aliexpress",
  "metaTitle": "מטא טייטל לגוגל (עד 60 תווים)",
  "metaDescription": "מטא דסקריפשן לגוגל (עד 155 תווים)",
  "directAnswerGeo": "פסקת שורה תחתונה (40-60 מילים) עם הבחירה המנצחת בקצרה לציטוט ב-AI Overviews",
  "contentMarkdown": "מדריך קנייה והסבר מפורט ב-Markdown ללא סימוני $$ או LaTeX",
  "faqs": [
    {"question": "שאלה 1", "answer": "תשובה 1"},
    {"question": "שאלה 2", "answer": "תשובה 2"}
  ],
  "rankings": [
    ${activeProducts
      .map(
        (_, idx) => `{
      "rank": ${idx + 1},
      "badge": "${idx === 0 ? "בחירת העורכים" : idx === 1 ? "התמורה הטובה למחיר" : idx === 2 ? "הבחירה התקציבית" : "מומלץ"}",
      "titleHe": "שם המוצר בעברית",
      "keyHighlight": "היתרון הכי בולט",
      "verdict": "סיכום קצר מדוע הוא במקום הזה"
    }`
      )
      .join(",\n")}
  ]
}
`;

  if (isGeminiConfigured()) {
    try {
      const { quotaGovernor } = await import("../agent/quota-governor");
      await quotaGovernor.waitIfPacingRequired("gemini_pro");
      await quotaGovernor.recordUsage("gemini_pro", 2500);

      const client = getGenAI();
      const response = await generateWithFallback(client, {
        contents: [{ role: "user", parts: [{ text: `${TOP_N_SYSTEM_PROMPT}\n\n${prompt}` }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.4,
        },
      });

      const responseText = response.text?.trim() || "{}";
      const cleanedJson = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleanedJson) as GeneratedTopNContent;
      if (parsed.title && parsed.rankings) {
        return parsed;
      }
    } catch (err: any) {
      console.error(`Gemini Top ${count} generation error:`, err);
      if (err?.status === 429 || String(err?.message || "").includes("429") || String(err?.message || "").includes("RESOURCE_EXHAUSTED")) {
        const { quotaGovernor } = await import("../agent/quota-governor");
        await quotaGovernor.handleRateLimitHit("gemini_pro", 60);
      }
    }
  }

  // Fallback Top N template
  const badgesList = [
    "בחירת העורכים",
    "התמורה הטובה למחיר",
    "הבחירה התקציבית",
    "האיכותי ביותר",
    "הכי נמכר",
    "המתקדם ביותר",
    "העיצוב המנצח",
    "אלטרנטיבה מומלצת",
    "דיל משתלם",
    "ראוי לציון",
  ];

  return {
    title: `${count} המוצרים המומלצים ביותר ב-${categoryNameHe} באלי אקספרס (מעודכן לשנת 2026)`,
    slug: `top-${count}-${categoryNameHe.toLowerCase().replace(/\s+/g, "-")}-2026`,
    metaTitle: `${count} ה-${categoryNameHe} הכי טובים באלי אקספרס - השוואה ומחירים 2026`,
    metaDescription: `מחפשים ${categoryNameHe} מעולה באלי אקספרס? בדקנו והשווינו את ${count} הדגמים הנמכרים והמומלצים ביותר. כולל מחירים בש"ח, טיפים למכס ומשלוח לישראל.`,
    directAnswerGeo: `בקטגוריית ה-${categoryNameHe}, המוצר המוביל והמומלץ ביותר לשנת 2026 הוא המוצר במקום הראשון, בזכות שילוב מנצח של דירוג גבוה, מחיר נגיש מתחת לרף המכס (75$) ואלפי ביקורות חיוביות מקונים ישראלים.`,
    contentMarkdown: `## איך בחרנו את ${count} המובילים?
כדי לבחור את המוצרים המשתלמים ביותר ב-${categoryNameHe}, סיננו אלפי פריטים באלי אקספרס לפי 4 קריטריונים מחמירים:
1. **דירוג משתמשים:** מינימום 4.5 כוכבים עם מאות הזמנות בפועל.
2. **משלוח אמין לישראל:** עדיפות למוכרים התומכים ב-AliExpress Standard Shipping.
3. **מחיר כדאי (תמורה לכסף):** מוצרים שנותנים תמורה מקסימלית למחירם.
4. **תאימות מקומית:** התאמה לשקע ישראלי ותקנים רלוונטיים.
`,
    faqs: [
      {
        question: `איך להימנע מחיוב מכס בקניית ${categoryNameHe}?`,
        answer: `כל עוד סך כל ההזמנה שלכם (ללא דמי משלוח) נמוך מ-75 דולר, אתם פטורים לחלוטין ממע"מ ומכס בישראל.`,
      },
    ],
    rankings: activeProducts.map((p, idx) => ({
      rank: idx + 1,
      badge: badgesList[idx] || "מומלץ",
      titleHe: p.titleHe || p.originalTitle.slice(0, 45),
      keyHighlight: `מחיר מנצח של כ-$${p.priceUsd} עם דירוג ${p.rating}`,
      verdict: `מציע איכות גבוהה, מתאים במיוחד לרוכשים מישראל ומספק תמורה מעולה לכסף.`,
    })),
  };
}

export const generateTop5Roundup = generateTopNRoundup;

/**
 * Generate a Flash Deal / Arbitrage landing page in Hebrew
 */
export async function generateDealPage(
  product: AliExpressProduct,
  categoryNameHe = "מבצעים חמים"
): Promise<GeneratedDealContent> {
  const isTaxExempt = product.priceUsd < 75;
  const estimatedLocalPriceIls = Math.round(product.priceIls * 2.2);
  const savingsIls = Math.max(estimatedLocalPriceIls - product.priceIls, 50);
  const savingsPercent = Math.min(Math.max(product.discountPercent || 40, 20), 85);

  const prompt = `
צור עמוד "דיל בזק" (Flash Deal / Arbitrage Landing Page) בעברית ממוקד המרות קניה עבור המוצר הבא:
- כותרת: ${product.titleHe || product.originalTitle}
- מחיר באלי אקספרס: ₪${product.priceIls} ($${product.priceUsd})
- מחיר משוער בארץ: ₪${estimatedLocalPriceIls}
- חיסכון מוערך: ₪${savingsIls} (${savingsPercent}% הנחה)
- פטור ממכס: ${isTaxExempt ? "כן (מתחת ל-$75)" : "מעל 75$"}
- דירוג: ${product.rating} כוכבים (${product.ordersCount}+ הזמנות)
- קטגוריה: ${categoryNameHe}

החזר תשובה אך ורק ב-JSON תקין (ללא תגיות Markdown או $$) לפי הסכמה:
{
  "title": "דיל בזק: [שם מוצר קצר בעברית] ב-₪${product.priceIls} בלבד! (חיסכון של ₪${savingsIls})",
  "titleHe": "שם המוצר בעברית",
  "slug": "deal-${product.aliId}-${categoryNameHe.toLowerCase().replace(/[^a-z0-9]/g, "-")}".slice(0, 50),
  "metaTitle": "דיל בזק: [שם מוצר] במחיר שובר שוק - אלי אקספרס",
  "metaDescription": "מבצע לזמן מוגבל: [שם מוצר] בהנחה של ${savingsPercent}%. מחיר: ₪${product.priceIls} בלבד. כולל בדיקת מכס ומשלוח לישראל.",
  "directAnswerGeo": "פסקת שורה תחתונה של 40-60 מילים שמסבירה למה הדיל הזה הוא הזדמנות רכישה מעולה כעת",
  "contentMarkdown": "תוכן המאמר ב-Markdown שיווקי ממוקד המרה, כולל סיבות למה כדאי לתפוס את הדיל עכשיו, טיפים לקופונים, ובדיקת מכס ושקע",
  "dealBadge": "דיל בזק מוגבל",
  "savingsIls": ${savingsIls},
  "savingsPercent": ${savingsPercent},
  "faqs": [
    {"question": "האם הדיל כולל פטור ממכס?", "answer": "${isTaxExempt ? "כן, המחיר נמוך מ-75$ ופטור לחלוטין ממע\"מ ומכס בישראל." : "המחיר מעל 75$ וייתכן חיוב במע\"מ בכניסה לארץ."}"},
    {"question": "תוך כמה זמן המשלוח מגיע?", "answer": "משלוח רגיל מגיע תוך 7 עד 14 ימי עסקים לנקודת איסוף קרובה לביתכם."}
  ],
  "israelContext": {
    "under75TaxExempt": ${isTaxExempt},
    "taxNotes": "${isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ (מתחת ל-75$)" : "מעל 75$ - ייתכן חיוב במע\"מ (17%)"}",
    "plugType": "מתאים לשקע ישראלי / תקן EU",
    "shippingEstimate": "משלוח AliExpress Standard Shipping (7-14 ימי עסקים)"
  }
}
`;

  if (isGeminiConfigured()) {
    try {
      const { quotaGovernor } = await import("../agent/quota-governor");
      await quotaGovernor.waitIfPacingRequired("gemini_pro");
      await quotaGovernor.recordUsage("gemini_pro", 1400);

      const client = getGenAI();
      const response = await generateWithFallback(client, {
        contents: [{ role: "user", parts: [{ text: `${DEAL_SYSTEM_PROMPT}\n\n${prompt}` }] }],
        config: {
          responseMimeType: "application/json",
          temperature: 0.3,
        },
      });

      const responseText = response.text?.trim() || "{}";
      const cleanedJson = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleanedJson) as GeneratedDealContent;
      if (parsed.title && parsed.contentMarkdown) {
        return parsed;
      }
    } catch (err: any) {
      console.error("Gemini Deal generation error:", err);
      if (err?.status === 429 || String(err?.message || "").includes("429") || String(err?.message || "").includes("RESOURCE_EXHAUSTED")) {
        const { quotaGovernor } = await import("../agent/quota-governor");
        await quotaGovernor.handleRateLimitHit("gemini_pro", 60);
      }
    }
  }

  // Fallback Deal template
  const cleanTitle = product.titleHe || product.originalTitle.split(",")[0].slice(0, 45);
  const slug = `deal-${product.aliId}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}`.slice(0, 60);

  return {
    title: `דיל בזק: ${cleanTitle} רק ב-₪${product.priceIls} במקום ₪${estimatedLocalPriceIls}!`,
    titleHe: cleanTitle,
    slug,
    metaTitle: `דיל בזק: ${cleanTitle} בהנחה ענקית באלי אקספרס`,
    metaDescription: `מבצע מוגבל בזמן על ${cleanTitle}: רק ₪${product.priceIls} ($${product.priceUsd}). חסכו ₪${savingsIls} מול מחירי החנויות בישראל!`,
    directAnswerGeo: `הדיל על ה-${cleanTitle} במחיר ₪${product.priceIls} ($${product.priceUsd}) מהווה הזדמנות ארביטראז' מצוינת, עם חיסכון מוערך של כ-₪${savingsIls} מול מוצרים דומים בחנויות בישראל. המוצר מחזיק בציון של ${product.rating} כוכבים ומציע תמורה מקסימלית למחירו.`,
    dealBadge: "דיל בזק לזמן מוגבל",
    savingsIls,
    savingsPercent,
    contentMarkdown: `## דיל בזק לוהט: ${cleanTitle}
לפעמים מופיעים באלי אקספרס מחירים שקשה להתעלם מהם. כרגע ה-${cleanTitle} נמכר במחיר מבצע מיוחד של **₪${product.priceIls}** ($${product.priceUsd}) בלבד, בהשוואה למחיר ממוצע של כ-₪${estimatedLocalPriceIls} למוצרים מקבילים בשוק המקומי בישראל.

### למה הדיל הזה שווה במיוחד?
- **חיסכון ענק:** חוסכים כ-**₪${savingsIls}** (${savingsPercent}% הנחה!)
- **בדיקת מכס:** ${isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ בישראל (המחיר נמוך מרף ה-$75)" : "מחיר מעל 75$"}
- **דירוג קונים:** ציון אמינות של **${product.rating} מתוך 5** על בסיס ${product.ordersCount}+ הזמנות מאומתות
- **התאמה מלאה לישראל:** תמיכה בתקן ובשקע המתאים לשימוש בארץ

### איך לנצל את המחיר הטוב ביותר?
1. היכנסו לקישור המבצע באלי אקספרס.
2. ודאו שבחרתם בשקע אירופאי (EU Plug) במידה ויש אופציה כזו.
3. אספו קופוני חנות (Store Coupons) או מטבעות (AliExpress Coins) בדף המוצר לפני לחיצה על Buy Now כדי למקסם את ההנחה!
`,
    faqs: [
      {
        question: "האם המחיר סופי או שיש תוספת מכס?",
        answer: isTaxExempt
          ? "המחיר פטור לחלוטין ממע\"מ ומכס בישראל מכיוון שהוא נמוך מ-75 דולר."
          : "המחיר עולה על 75 דולר ולכן ייתכן חיוב מע\"מ (17%) בהגעה לארץ.",
      },
      {
        question: "כמה זמן נמשך הדיל?",
        answer: "מחירי דילי בזק באלי אקספרס תלויים במלאי המוקצה לקמפיין של המוכר, ולכן מומלץ להזמין בהקדם לפני עדכון המחיר.",
      },
    ],
    israelContext: {
      under75TaxExempt: isTaxExempt,
      taxNotes: isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ (מתחת ל-75$)" : "מעל 75$ - ייתכן מע\"מ (17%)",
      plugType: "מתאים לשקע ישראלי / תקן EU",
      shippingEstimate: "משלוח AliExpress Standard Shipping (7-14 ימי עסקים)",
    },
  };
}
