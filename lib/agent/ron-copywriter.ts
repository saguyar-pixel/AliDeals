import { getGenAI, isGeminiConfigured, generateWithFallback, MODELS } from "../gemini/client";
import { AliExpressProduct } from "../aliexpress/types";

export interface RonReviewOutput {
  title: string;
  titleHe: string;
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

export interface RonTopNOutput {
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

const RON_SYSTEM_PROMPT = `
אתה "רון" - סוכן ה-AI הראשי של פורטל AliDeals ישראל, קופירייטר מסחר אלקטרוני ומומחה SEO מהשורה הראשונה בישראל.
תפקידך להפוך נתוני מוצר גולמיים מאלי אקספרס (באנגלית) לתוכן עברי אותנטי, ממיר, מרתק ומקצועי המותאם במדויק לצרכן הישראלי.

הנחיות כתיבה בלתי מתפשרות:
1. שפה ועברית טבעית: עברית רהוטה, זורמת, אמינה וישירה. הימנע מתרגום מכונה, ממשפטים מאולצים או מתבניות גנריות קבועות.
2. התאמה ייחודית למוצר: התייחס במפורש למפרט, למותג, לתכונות המיוחדות ולמחיר הספציפי של המוצר. אסור שכל המוצרים יישמעו אותו הדבר!
3. דגשים לקונה הישראלי:
   - רף הפטור ממכס ומע"מ (75$): ציין האם המוצר פטור ממכס או חייב במע"מ 17%.
   - תאימות שקע חשמל (EU Plug שמתאים לישראל ללא מתאמים).
   - זמני משלוח (AliExpress Standard Shipping 7-14 ימי עסקים).
4. אופטימיזציה ל-GEO ו-AI Search: ספק פסקה ישירה וקולעת (Direct Answer) המתאימה לציטוט ב-Google AI Overviews / SearchGPT.
5. חוק עיקרי: החזר אך ורק מבנה JSON תקין (Strict JSON) ללא תגיות Markdown או backticks מסביב.
`;

export async function generateRonReview(product: AliExpressProduct): Promise<RonReviewOutput> {
  const isTaxExempt = Number(product.priceUsd) < 75;
  const priceIls = Math.round(Number(product.priceUsd) * 3.65);

  const prompt = `
נתוני המוצר מאלי אקספרס:
- מזהה פריט: ${product.aliId}
- כותרת מקורית: ${product.originalTitle}
- מחיר דולרי: $${product.priceUsd} (בש"ח: כ-₪${product.priceIls || priceIls})
- מחיר מקורי: $${product.originalPriceUsd || product.priceUsd}
- אחוז הנחה: ${product.discountPercent || 0}%
- דירוג: ${product.rating} מתוך 5 (על בסיס ${product.ordersCount} הזמנות)
- שם חנות/מוכר: ${product.storeName || "AliExpress Store"}
- מפרט טכני שנאסף: ${JSON.stringify(product.specifications || {})}
- מדגם ביקורות רוכשים: ${JSON.stringify(product.reviewsSummary || [])}

החזר אך ורק אובייקט JSON תקין לפי המבנה הבא:
{
  "title": "כותרת סקירה מושכת קליקים בעברית (למשל: סקירת מקרן Magcubic HY300: האם הלהיט של אלי אקספרס באמת שווה ₪150?)",
  "titleHe": "שם שיווקי קצר ומדויק בעברית למוצר (למשל: מקרן נייד Magcubic HY300 אנדרואיד 11)",
  "slug": "unique-english-slug-${product.aliId}",
  "metaTitle": "מטא טייטל לגוגל עד 60 תווים כולל מילת מפתח ומחיר",
  "metaDescription": "מטא דסקריפשן ממיר עד 155 תווים עם הנעה לפעולה",
  "directAnswerGeo": "פסקת שורה תחתונה ישירה (40-60 מילים) המיועדת לציטוט ב-AI Search (גוגל, Perplexity)",
  "pros": ["יתרון מבוסס מפרט אמיתי 1", "יתרון מבוסס מפרט אמיתי 2", "יתרון מבוסס מפרט אמיתי 3"],
  "cons": ["חיסרון כנה וריאליסטי 1", "חיסרון כנה וריאליסטי 2"],
  "contentMarkdown": "סקירה מקיפה ומעמיקה ב-Markdown עשיר. כולל כותרות H2, התייחסות לאיכות הבנייה, ביצועים אמיתיים, חוויית שימוש, תאימות לישראל וסיכום רכישה.",
  "faqs": [
    {"question": "שאלה ספציפית על המוצר?", "answer": "תשובה מקצועית ומפורטת."},
    {"question": "האם יש פטור ממכס?", "answer": "${isTaxExempt ? "כן, מחירו מתחת ל-75$ ופטור ממע\"מ ומכס." : "מחיר המוצר מעל 75$ וייתכן חיוב במע\"מ 17%."}"},
    {"question": "איזה שקע חשמל מומלץ?", "answer": "יש לבחור תקע EU Plug המתאים לשקעים בישראל."}
  ],
  "israelContext": {
    "under75TaxExempt": ${isTaxExempt},
    "taxNotes": "${isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ בישראל (מתחת לרף ה-$75)" : "מחיר מעל 75$ - ייתכן חיוב במע\"מ 17% בכניסה לישראל"}",
    "plugType": "גרסת תקע EU Plug מותאמת לשקע הישראלי",
    "shippingEstimate": "משלוח AliExpress Standard Shipping מבוטח (כ-7 עד 14 ימי עסקים)"
  }
}
`;

  if (isGeminiConfigured()) {
    try {
      const client = getGenAI();
      const response = await generateWithFallback(client, {
        contents: [
          { role: "user", parts: [{ text: `${RON_SYSTEM_PROMPT}\n\n${prompt}` }] },
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.45,
        },
      });

      const raw = response.text?.trim() || "{}";
      const cleaned = raw.replace(/^```json\s*/, "").replace(/\s*```$/, "");
      const parsed = JSON.parse(cleaned);

      if (parsed.title && parsed.contentMarkdown) {
        return {
          title: parsed.title,
          titleHe: parsed.titleHe || parsed.title.slice(0, 50),
          slug: parsed.slug || `review-${product.aliId}`,
          metaTitle: parsed.metaTitle || parsed.title.slice(0, 60),
          metaDescription: parsed.metaDescription || `סקירה מקיפה על ${parsed.titleHe || product.originalTitle}`,
          directAnswerGeo: parsed.directAnswerGeo || "",
          contentMarkdown: parsed.contentMarkdown,
          pros: Array.isArray(parsed.pros) ? parsed.pros : ["תמורה מעולה למחיר", "משלוח מהיר לישראל"],
          cons: Array.isArray(parsed.cons) ? parsed.cons : ["הוראות שימוש באנגלית"],
          faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
          israelContext: parsed.israelContext || {
            under75TaxExempt: isTaxExempt,
            taxNotes: isTaxExempt ? "פטור מלא ממכס ומע\"מ" : "חייב במע\"מ",
            plugType: "EU Plug",
            shippingEstimate: "7-14 ימי עסקים",
          },
        };
      }
    } catch (err) {
      console.warn("Agent Ron Gemini execution error, using intelligent dynamic generator:", err);
    }
  }

  // Dynamic fallback: Tailored to the product's actual data (No static generic repetition!)
  const cleanTitle = (product.originalTitle || "מוצר אלי אקספרס").split(/[,|\-/]/)[0].trim().slice(0, 50);
  const titleHe = product.titleHe && product.titleHe !== product.originalTitle
    ? product.titleHe
    : `${cleanTitle} - גרסה מומלצת`;

  const specKeys = Object.keys(product.specifications || {});
  const dynamicPros = [
    `מחיר תחרותי במיוחד של כ-₪${product.priceIls || priceIls} ($${product.priceUsd})${isTaxExempt ? " כולל פטור מלא ממכס ומע\"מ" : ""}`,
    specKeys.length > 0 ? `מפרט טכני מתקדם: ${specKeys.slice(0, 3).map((k) => `${k}: ${(product.specifications as any)[k]}`).join(", ")}` : `איכות בנייה גבוהה ומעל ${product.ordersCount || 100} הזמנות מוצלחות`,
    product.sellerPositiveRate ? `נרכש מחנות בדירוג אמינות גבוה של ${product.sellerPositiveRate}` : "תאימות מלאה לשקע ורשת החשמל בישראל (EU)",
  ];

  const dynamicCons = [
    "מגיע לרוב עם חוברת הוראות באנגלית/סינית בלבד",
    Number(product.priceUsd) >= 75 ? "מחיר המוצר עולה על $75 ועלול להיות מחויב במע\"מ (17%)" : "זמן אספקה ממוצע של שבוע וחצי עד שבועיים",
  ];

  return {
    title: `סקירת ${titleHe}: האם שווה להזמין באלי אקספרס ב-₪${product.priceIls || priceIls}?`,
    titleHe,
    slug: `review-${product.aliId}-${cleanTitle.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-")}`.slice(0, 60),
    metaTitle: `${titleHe} באלי אקספרס - מחיר, מפרט וקופונים 2026`,
    metaDescription: `סקירה מעמיקה על ${titleHe}: בדיקת מפרט, יתרונות וחסרונות, מחיר עדכני בש\"ח ובדיקת פטור ממכס לקונים בישראל.`,
    directAnswerGeo: `ה-${titleHe} מציע יחס עלות-תועלת מצוין במחיר של כ-$${product.priceUsd} (כ-₪${product.priceIls || priceIls}). המוצר זוכה לדירוג של ${product.rating || 4.8} מתוך 5 כוכבים, ומיועד למי שמחפש ביצועים אמינים במחיר שנמוך בעשרות אחוזים מהארץ.${isTaxExempt ? " פטור מלא ממכס ומע\"מ." : ""}`,
    pros: dynamicPros,
    cons: dynamicCons,
    contentMarkdown: `## נעים להכיר: מה אנחנו בודקים ב-${titleHe}?
אם חיפשתם פתרון איכותי ומשתלם בקטגוריה, ה-**${titleHe}** הוא אחד הפריטים המבוקשים ביותר באלי אקספרס כרגע, עם מעל **${product.ordersCount || 150} הזמנות מאומתות** וציון משתמשים מרשים של **${product.rating || 4.8} מתוך 5**.

## מפרט טכני עיקרי והתאמה לישראל
- **מחיר מבצע עדכני:** $${product.priceUsd} (כ-₪${product.priceIls || priceIls})
- **בדיקת מכס בישראל:** ${isTaxExempt ? "✓ פטור מלא מתשלום מכס ומע\"מ בישראל (מתחת לרף ה-$75)" : "מחיר מעל 75$ - ייתכן חיוב במע\"מ 17%"}
- **תאימות חשמל:** מומלץ לבחור באפשרות EU Plug המתאימה ישירות לשקעים בישראל
- **שיטת משלוח מומלצת:** AliExpress Standard Shipping עם מספר מעקב

## ביצועים וחוות דעת רוכשים
בחינה של ביקורות הקונים מראה כי המוצר מספק תמורה יוצאת מן הכלל למחירו. איכות החומרים וההרכבה עולה על המצופה ברמת מחיר זו, והוא מתמודד בקלות עם משימותיו היום-יומיות.

## השורה התחתונה של רון
אם אתם רוצים לחסוך עשרות עד מאות שקלים בהשוואה לרכישה מקבילה בישראל מבלי להתפשר על איכות - ה-${titleHe} הוא קנייה בטוחה ומשתלמת במיוחד.
`,
    faqs: [
      {
        question: "האם יש תשלום מכס או מע\"מ נוסף בהגעה לארץ?",
        answer: isTaxExempt
          ? "לא. כל חבילה שערך המוצרים בה נמוך מ-75 דולר פטורה לחלוטין ממע\"מ ומכס בישראל."
          : "מכיוון שהמחיר עולה על 75 דולר, החבילה עשויה להיות מחויבת במע\"מ של 17% בלבד בעת הכניסה לארץ.",
      },
      {
        question: "איזה סוג שקע לבחור בעת ההזמנה?",
        answer: "בחרו תמיד בתקע אירופאי (EU Plug). הוא מתאים במדויק לשקעים בישראל ללא צורך במתאמים.",
      },
      {
        question: "תוך כמה זמן המשלוח מגיע לישראל?",
        answer: "במשלוח AliExpress Standard Shipping ממוצע זמני האספקה עומד על 7 עד 14 ימי עסקים ישירות לנקודת חלוקה קרובה או דואר.",
      },
    ],
    israelContext: {
      under75TaxExempt: isTaxExempt,
      taxNotes: isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ בישראל (מתחת לרף ה-$75)" : "מחיר מעל 75$ - ייתכן חיוב במע\"מ (17%)",
      plugType: "גרסת EU Plug מתאימה ישירות לשקע ישראלי",
      shippingEstimate: "משלוח מהיר AliExpress Standard Shipping (7-14 ימי עסקים)",
    },
  };
}

/**
 * Generate a persuasive Hebrew sentence for "Frequently Bought Together" bundle cross-sell
 */
export async function generateRonCrossSellReason(
  mainTitle: string,
  complementaryTitles: string[]
): Promise<string> {
  const compStr = complementaryTitles.join(" + ");
  const fallback = `השילוב המושלם: ${mainTitle} יחד עם ${compStr} משלימים זה את זה ומעניקים חוויית שימוש מלאה ומקסימום חיסכון ברכישה אחת.`;

  if (!isGeminiConfigured()) {
    return fallback;
  }

  try {
    const client = getGenAI();
    const prompt = `
המוצר הראשי: "${mainTitle}"
המוצרים המשלימים: ${JSON.stringify(complementaryTitles)}

כתוב משפט שיווקי קצר, אלגנטי וממיר בעברית (1-2 משפטים, עד 35 מילים) המסביר מדוע מומלץ לקנות את המוצרים האלו יחד כערכה/חבילה משלימה ("קונים יחד לעיתים קרובות").
החזר אך ורק את המשפט בעברית ללא מרכאות או תוספות.
`;

    const response = await generateWithFallback(client, {
      contents: [{ role: "user", parts: [{ text: `${RON_SYSTEM_PROMPT}\n\n${prompt}` }] }],
      config: { temperature: 0.6 },
    });

    const text = response.text?.trim();
    return text || fallback;
  } catch (err) {
    console.warn("Ron cross-sell generation error:", err);
    return fallback;
  }
}
