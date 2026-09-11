import { ai, getGenAI, MODELS } from "./client";
import { REVIEW_SYSTEM_PROMPT, TOP5_SYSTEM_PROMPT, TOP_N_SYSTEM_PROMPT, DEAL_SYSTEM_PROMPT } from "./prompts";
import { AliExpressProduct } from "../aliexpress/types";

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
 * Generate a complete high-converting Single Product Review in Hebrew
 */
export async function generateProductReview(product: AliExpressProduct): Promise<GeneratedReviewContent> {
  const isTaxExempt = product.priceUsd < 75;

  const prompt = `
נתוני המוצר מעלי אקספרס:
- מזהה פריט: ${product.aliId}
- כותרת מקורית: ${product.originalTitle}
- מחיר בדולר: $${product.priceUsd} (בש"ח: כ-₪${product.priceIls})
- מחיר מקורי: $${product.originalPriceUsd || product.priceUsd}
- הנחה נוכחית: ${product.discountPercent}%
- דירוג גולשים: ${product.rating} מתוך 5 (מבוסס על ${product.ordersCount} הזמנות)
- מפרט טכני שנאסף: ${JSON.stringify(product.specifications)}
- מדגם ביקורות קונים: ${JSON.stringify(product.reviewsSummary)}

החזר תשובה אך ורק במבנה JSON תקין (Strict JSON) ללא תגיות Markdown מסביב, לפי הסכמה הבאה:
{
  "title": "כותרת עברית מושכת קליקים לסריקה ו-SEO (למשל: סקירת מקרן Magcubic HY300: האם הלהיט של אלי אקספרס באמת שווה ₪150?)",
  "titleHe": "שם המוצר בעברית נקייה ומקצועית לקטלוג (למשל: מקרן נייד Magcubic HY300 חכם עם אנדרואיד)",
  "slug": "url-friendly-slug-in-english-or-hebrew-transliteration",
  "metaTitle": "מטא טייטל לגוגל (עד 60 תווים, כולל מילת מפתח עיקרית ומחיר)",
  "metaDescription": "מטא דסקריפשן לגוגל (130-155 תווים עם קריאה לפעולה)",
  "directAnswerGeo": "פסקת שורה תחתונה ישירה (40-60 מילים) המיועדת לציטוט ב-Google AI Overviews / Perplexity / SearchGPT",
  "pros": ["יתרון 1", "יתרון 2", "יתרון 3"],
  "cons": ["חיסרון כנה 1", "חיסרון כנה 2"],
  "contentMarkdown": "תוכן המאמר המלא ב-Markdown עשיר ללא סימוני $$ או LaTeX. כולל פתיח חזק, מפרט והתאמה לישראל (שקע EU, פטור מכס), ביצועים וחוות דעת רוכשים",
  "faqs": [
    {"question": "שאלה 1", "answer": "תשובה 1"},
    {"question": "שאלה 2", "answer": "תשובה 2"},
    {"question": "שאלה 3", "answer": "תשובה 3"}
  ],
  "israelContext": {
    "under75TaxExempt": ${isTaxExempt},
    "taxNotes": "${isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ (מתחת ל-75$)" : "מחיר מעל 75$ - ייתכן חיוב במע\"מ (17%) בכניסה לארץ"}",
    "plugType": "מתאים לשקע ישראלי / מגיע בגרסת EU",
    "shippingEstimate": "משלוח AliExpress Standard Shipping מגיע תוך 7-14 ימי עסקים"
  }
}
`;

  // If Gemini API Key is available, use real Gemini 2.5 Flash
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey.length > 5) {
    try {
      const { quotaGovernor } = await import("../agent/quota-governor");
      await quotaGovernor.waitIfPacingRequired("gemini_pro");
      await quotaGovernor.recordUsage("gemini_pro", 1800);

      const client = getGenAI();
      let response;
      try {
        response = await client.models.generateContent({
          model: MODELS.FLASH,
          contents: [
            { role: "user", parts: [{ text: `${REVIEW_SYSTEM_PROMPT}\n\n${prompt}` }] },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        });
      } catch (fErr) {
        response = await client.models.generateContent({
          model: MODELS.FLASH_2_0,
          contents: [
            { role: "user", parts: [{ text: `${REVIEW_SYSTEM_PROMPT}\n\n${prompt}` }] },
          ],
          config: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        });
      }

      const responseText = response.text?.trim() || "{}";
      const cleanedJson = responseText.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      return JSON.parse(cleanedJson) as GeneratedReviewContent;
    } catch (err: any) {
      console.error("Gemini API generation error, falling back to smart template:", err);
      if (err?.status === 429 || String(err?.message || "").includes("429") || String(err?.message || "").includes("RESOURCE_EXHAUSTED")) {
        const { quotaGovernor } = await import("../agent/quota-governor");
        await quotaGovernor.handleRateLimitHit("gemini_pro", 60);
      }
    }
  }

  // Smart fallback template (ensures smooth testing even without API key)
  const baseTitle = product.originalTitle.split(",")[0].slice(0, 60);
  const titleHe =
    product.titleHe && product.titleHe !== product.originalTitle
      ? product.titleHe
      : baseTitle;
  const slug = `review-${product.aliId}-${baseTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}`.slice(0, 60);

  return {
    title: `סקירת ${titleHe}: האם הלהיט של אלי אקספרס באמת שווה ₪${product.priceIls}?`,
    titleHe,
    slug,
    metaTitle: `${titleHe} באלי אקספרס - חוות דעת, מחיר וקופונים 2026`,
    metaDescription: `סקירה מקיפה על ${baseTitle}: יתרונות, חסרונות, בדיקת מפרט, מחיר עדכני בש\"ח, וטיפים למשלוח מהיר לישראל. כל האמת לפני שקונים.`,
    directAnswerGeo: `ה-${baseTitle} מציע תמורה מצוינת למחיר של כ-$${product.priceUsd} (כ-₪${product.priceIls}). הוא מומלץ במיוחד למי שמחפש פתרון איכותי וחסכוני, ונהנה מציון משתמשים גבוה של ${product.rating} כוכבים. מנגד, יש לקחת בחשבון זמן משלוח של כשבועיים לישראל.`,
    pros: [
      `מחיר אטרקטיבי במיוחד ($${product.priceUsd}) ${isTaxExempt ? "כולל פטור מלא ממכס ומע\"מ" : ""}`,
      `איכות בנייה מפתיעה לטובה בהתאם לביקורות של מעל ${product.ordersCount} רוכשים`,
      "תאימות מלאה לשימוש בישראל (כולל שקע אירופאי ומשלוח מהיר)",
    ],
    cons: [
      "הוראות שימוש לרוב מגיעות באנגלית או סינית בלבד",
      "זמני אספקה נעים בדרך כלל בין 10 ל-18 ימי עסקים",
    ],
    contentMarkdown: `## נעים להכיר: מה אנחנו בודקים היום?
מוצרי אלי אקספרס רבים מבטיחים הרים וגבעות במחיר מצחיק, אך ה-${baseTitle} הוא אחד הפריטים המסקרנים ביותר בקטגוריה. עם דירוג ממוצע מרשים של **${product.rating} מתוך 5** ומעל **${product.ordersCount} הזמנות מאומתות**, יצאנו לבדוק האם ההתלהבות מוצדקת.

## מפרט טכני ויכולות מרכזיות
- **מחיר מבצע:** $${product.priceUsd} (כ-₪${product.priceIls})
- **דירוג שביעות רצון:** ${product.rating} / 5
- **מצב מכס בישראל:** ${isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ (מתחת לרף ה-$75)" : "מעל 75$ (חייב במע\"מ 17%)"}
- **שיטת משלוח מומלצת:** AliExpress Standard Shipping

## חוויית שימוש ואיכות החומרים
בחינת ביקורות הקונים (ובפרט ביקורות של משתמשים ישראלים) מראה כי מדובר במוצר עמיד ואמין המספק את העבודה בצורה חלקה. הגימור נעים למגע, והמוצר עושה בדיוק את מה שהוא מתחייב לעשות ללא תקלות מיותרות.

## השורה התחתונה - לקנות או לוותר?
אם אתם מחפשים מוצר איכותי במחיר שנמוך בעשרות אחוזים מהמחירים בחנויות בארץ - זוהי ללא ספק עסקה משתלמת. הקפידו לבחור במוכר הרשמי ובמשלוח מעקב כדי להבטיח קבלת חבילה מהירה ובטוחה.
`,
    faqs: [
      {
        question: `האם צריך לשלם מכס על ה-${baseTitle}?`,
        answer: isTaxExempt
          ? `לא. מחיר המוצר הינו כ-$${product.priceUsd}, ולכן הוא נמוך מרף המכס הישראלי של 75 דולר ופטור מכל תשלום נוסף של מע\"מ או מכס.`
          : `מחיר המוצר מעל 75 דולר, ולכן בכניסה לארץ ייתכן ותידרשו לתשלום מע\"מ (17%) בהתאם לתקנות רשות המיסים.`,
      },
      {
        question: "איזה סוג שקע חשמל מומלץ לבחור בהזמנה?",
        answer: "יש לבחור תמיד באפשרות EU Plug (תקע אירופאי), שמתאים לשקעי החשמל התקניים בישראל ללא צורך במתאמים.",
      },
      {
        question: "תוך כמה זמן המשלוח מגיע לישראל?",
        answer: "בבחירה ב-AliExpress Standard Shipping, זמני ההגעה הממוצעים נעים בין 8 ל-14 ימי עסקים, כאשר החבילה מגיעה לנקודת חלוקה סמוכה או ישירות לסניף הדואר.",
      },
    ],
    israelContext: {
      under75TaxExempt: isTaxExempt,
      taxNotes: isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ (מתחת ל-75$)" : "מעל 75$ - ייתכן חיוב במע\"מ (17%)",
      plugType: "מתאים לשקע ישראלי / תקן EU",
      shippingEstimate: "משלוח מהיר AliExpress Standard Shipping (7-14 ימים)",
    },
  };
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

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey.length > 5) {
    try {
      const { quotaGovernor } = await import("../agent/quota-governor");
      await quotaGovernor.waitIfPacingRequired("gemini_pro");
      await quotaGovernor.recordUsage("gemini_pro", 2500);

      const client = getGenAI();
      let response;
      try {
        response = await client.models.generateContent({
          model: MODELS.FLASH,
          contents: [{ role: "user", parts: [{ text: `${TOP_N_SYSTEM_PROMPT}\n\n${prompt}` }] }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        });
      } catch (fErr) {
        response = await client.models.generateContent({
          model: MODELS.FLASH_2_0,
          contents: [{ role: "user", parts: [{ text: `${TOP_N_SYSTEM_PROMPT}\n\n${prompt}` }] }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.4,
          },
        });
      }

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

  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey.length > 5) {
    try {
      const { quotaGovernor } = await import("../agent/quota-governor");
      await quotaGovernor.waitIfPacingRequired("gemini_pro");
      await quotaGovernor.recordUsage("gemini_pro", 1400);

      const client = getGenAI();
      let response;
      try {
        response = await client.models.generateContent({
          model: MODELS.FLASH,
          contents: [{ role: "user", parts: [{ text: `${DEAL_SYSTEM_PROMPT}\n\n${prompt}` }] }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        });
      } catch (fErr) {
        response = await client.models.generateContent({
          model: MODELS.FLASH_2_0,
          contents: [{ role: "user", parts: [{ text: `${DEAL_SYSTEM_PROMPT}\n\n${prompt}` }] }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.3,
          },
        });
      }

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
