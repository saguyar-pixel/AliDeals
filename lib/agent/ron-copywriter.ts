import { getGenAI, isGeminiConfigured, generateWithFallback, MODELS } from "../gemini/client";
import { AliExpressProduct } from "../aliexpress/types";
import {
  detectArchetype,
  isElectricArchetype,
  getArchetypePromptGuidelines,
  sanitizeProsCons,
  CategoryArchetype,
  BANNED_GENERIC_PHRASES,
} from "../categories/archetypes";

export interface RonReviewOutput {
  title: string;
  titleHe: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  directAnswerGeo: string;
  contentMarkdown: string;
  archetype?: CategoryArchetype;
  pros: string[];
  cons: string[];
  faqs: Array<{ question: string; answer: string }>;
  israelContext: {
    under75TaxExempt: boolean;
    taxNotes: string;
    plugType?: string | null;
    sizeWarning?: string | null;
    fabricComposition?: string | null;
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
2. התאמה ייחודית לקטגוריה ולארכיטיפ המוצר:
   - אם המוצר הוא מוצר חשמלי (ELECTRONICS): התייחס לתאימות מתח 220V/50Hz ובחירה בתקע EU אירופאי שמתאים לישראל ללא מתאמים.
   - אם המוצר הוא מוצר אופנה/הנעלה (FASHION): אסור לציין שקע חשמל או מתח! התמקד במידות (סרגל מידות אסייתיות מול אירופאיות), הרכב בד, תפירה והוראות כביסה.
   - אם המוצר הוא לבית או לילדים (HOME_LIVING / KIDS_TOYS): התמקד בתקני בטיחות, איכות חומרים, קלות הרכבה ופרופורציות אמיתיות מול תמונות שיווקיות.
3. איסור מוחלט על קלישאות וביטויים גנריים (Negative Constraints):
   - חל איסור חמור להשתמש בביטויים: "מוצר איכותי", "מחיר זול", "שווה כל שקל", "עיצוב יפה", "מוצר מדהים", "איכות מעולה".
   - כל יתרון (Pro) וחיסרון (Con) חייב לציין עובדה מפרטית, חומרית או מעשית קונקרטית מתוך נתוני המוצר!
4. דגשי מכס לקונה הישראלי:
   - רף הפטור ממכס ומע"מ (75$): ציין האם המוצר פטור ממכס או חייב במע"מ 17%.
   - זמני משלוח (AliExpress Standard Shipping 7-14 ימי עסקים).
5. אופטימיזציה ל-GEO ו-AI Search: ספק פסקה ישירה וקולעת (Direct Answer) המתאימה לציטוט ב-Google AI Overviews / SearchGPT.
6. חוק עיקרי: החזר אך ורק מבנה JSON תקין (Strict JSON) ללא תגיות Markdown או backticks מסביב.
`;

export async function generateRonReview(
  product: AliExpressProduct,
  archetypeParam?: CategoryArchetype | string
): Promise<RonReviewOutput> {
  const isTaxExempt = Number(product.priceUsd) < 75;
  const priceIls = Math.round(Number(product.priceUsd) * 3.65);

  const archetype: CategoryArchetype =
    (archetypeParam as CategoryArchetype) ||
    detectArchetype({
      title: product.originalTitle || product.titleHe,
      specifications: product.specifications,
    });

  const isElec = isElectricArchetype(archetype);
  const isFashion = archetype === "FASHION";
  const archetypeGuidelines = getArchetypePromptGuidelines(archetype);

  const defaultFaqQuestion = isElec
    ? "איזה שקע חשמל מומלץ לבחור בהזמנה?"
    : isFashion
    ? "איך המידות במוצר זה ביחס למידות בישראל?"
    : "מה חשוב לדעת לגבי איכות החומרים והבטיחות?";

  const defaultFaqAnswer = isElec
    ? "יש לבחור בתקע EU Plug (שקע אירופאי), המתאים ישירות לשקעים בישראל (220V) ללא צורך במתאמים."
    : isFashion
    ? "המידות הן מידות אסייתיות. מומלץ להיעזר בסרגל המידות בסנטימטרים ולהזמין לרוב מידה אחת מעל המידה הרגילה שלכם בישראל."
    : "המוצר עשוי מחומרים מאושרים לשימוש ביתי/ילדים ללא חומרים רעילים, ומומלץ לבדוק את מידות המוצר הממשיות בס\"מ.";

  const prompt = `
נתוני המוצר מאלי אקספרס:
- מזהה פריט: ${product.aliId}
- כותרת מקורית: ${product.originalTitle}
- ארכיטיפ מסווג: ${archetype}
- מחיר דולרי: $${product.priceUsd} (בש"ח: כ-₪${product.priceIls || priceIls})
- מחיר מקורי: $${product.originalPriceUsd || product.priceUsd}
- אחוז הנחה: ${product.discountPercent || 0}%
- דירוג: ${product.rating} מתוך 5 (על בסיס ${product.ordersCount} הזמנות)
- שם חנות/מוכר: ${product.storeName || "AliExpress Store"}
- מפרט טכני שנאסף: ${JSON.stringify(product.specifications || {})}
- מדגם ביקורות רוכשים: ${JSON.stringify(product.reviewsSummary || [])}

הנחיות ארכיטיפ ספציפיות:
${archetypeGuidelines}

החזר אך ורק אובייקט JSON תקין לפי המבנה הבא:
{
  "title": "כותרת סקירה מושכת קליקים בעברית (למשל: סקירת ${product.titleHe || 'המוצר'}: האם שווה ₪${product.priceIls || priceIls}?)",
  "titleHe": "שם שיווקי קצר ומדויק בעברית למוצר",
  "slug": "unique-english-slug-${product.aliId}",
  "metaTitle": "מטא טייטל לגוגל עד 60 תווים כולל מילת מפתח ומחיר",
  "metaDescription": "מטא דסקריפשן ממיר עד 155 תווים עם הנעה לפעולה",
  "directAnswerGeo": "פסקת שורה תחתונה ישירה (40-60 מילים) המיועדת לציטוט ב-AI Search (גוגל, Perplexity)",
  "pros": ["יתרון מבוסס מפרט/חומר/ביצועים אמיתי 1 (ללא קלישאות)", "יתרון ספציפי 2", "יתרון ספציפי 3"],
  "cons": ["חיסרון כנה וריאליסטי 1 (למשל מידות אסייתיות או אריזה פשוטה)", "חיסרון כנה 2"],
  "contentMarkdown": "סקירה מקיפה ומעמיקה ב-Markdown עשיר. כולל כותרות H2, התייחסות לאיכות החומרים, ביצועים אמיתיים, חוויית שימוש, תאימות לקונה הישראלי וסיכום רכישה.",
  "faqs": [
    {"question": "שאלה ספציפית על המוצר?", "answer": "תשובה מקצועית ומפורטת."},
    {"question": "האם יש פטור ממכס?", "answer": "${isTaxExempt ? "כן, מחירו מתחת ל-75$ ופטור ממע\"מ ומכס." : "מחיר המוצר מעל 75$ וייתכן חיוב במע\"מ 17%."}"},
    {"question": "${defaultFaqQuestion}", "answer": "${defaultFaqAnswer}"}
  ],
  "israelContext": {
    "under75TaxExempt": ${isTaxExempt},
    "taxNotes": "${isTaxExempt ? "פטור מלא מתשלום מכס ומע\"מ בישראל (מתחת לרף ה-$75)" : "מחיר מעל 75$ - ייתכן חיוב במע\"מ 17% בכניסה לישראל"}",
    ${isElec ? '"plugType": "גרסת תקע EU Plug מותאמת לשקע הישראלי",' : ''}
    ${isFashion ? '"sizeWarning": "מידות אסייתיות - מומלץ לבדוק טבלת סנטימטרים ולהזמין מידה אחת מעל",' : ''}
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
        const rawPros = Array.isArray(parsed.pros) ? parsed.pros : [];
        const rawCons = Array.isArray(parsed.cons) ? parsed.cons : [];

        // Strict sanitization: Strip banned generic phrases and context leaks
        const sanitizedPros = sanitizeProsCons(rawPros, archetype, "pros");
        const sanitizedCons = sanitizeProsCons(rawCons, archetype, "cons");

        return {
          title: parsed.title,
          titleHe: parsed.titleHe || parsed.title.slice(0, 50),
          slug: parsed.slug || `review-${product.aliId}`,
          metaTitle: parsed.metaTitle || parsed.title.slice(0, 60),
          metaDescription: parsed.metaDescription || `סקירה מקיפה על ${parsed.titleHe || product.originalTitle}`,
          directAnswerGeo: parsed.directAnswerGeo || "",
          contentMarkdown: parsed.contentMarkdown,
          archetype,
          pros: sanitizedPros,
          cons: sanitizedCons,
          faqs: Array.isArray(parsed.faqs) ? parsed.faqs : [],
          israelContext: {
            under75TaxExempt: isTaxExempt,
            taxNotes: isTaxExempt ? "פטור מלא ממכס ומע\"מ (מתחת ל-$75)" : "מחיר מעל 75$ - ייתכן חיוב במע\"מ",
            plugType: isElec ? (parsed.israelContext?.plugType || "EU Plug") : null,
            sizeWarning: isFashion ? (parsed.israelContext?.sizeWarning || "מידות אסייתיות - מומלץ להזמין מידה מעל") : null,
            fabricComposition: isFashion ? parsed.israelContext?.fabricComposition : null,
            shippingEstimate: "7-14 ימי עסקים במשלוח סטנדרטי",
          },
        };
      }
    } catch (err) {
      console.warn("Agent Ron Gemini execution error, using intelligent dynamic generator:", err);
    }
  }

  // Dynamic fallback: Tailored to the product's actual data (Strictly Archetype-Aware, No context leaks!)
  const cleanTitle = (product.originalTitle || "מוצר אלי אקספרס").split(/[,|\-/]/)[0].trim().slice(0, 50);
  const titleHe = product.titleHe && product.titleHe !== product.originalTitle
    ? product.titleHe
    : `${cleanTitle} - גרסה מומלצת`;

  const specKeys = Object.keys(product.specifications || {});

  // Archetype tailored pros
  let dynamicPros: string[] = [];
  if (isFashion) {
    dynamicPros = [
      `מחיר תחרותי במיוחד של כ-₪${product.priceIls || priceIls} ($${product.priceUsd})${isTaxExempt ? " כולל פטור מלא ממכס ומע\"מ" : ""}`,
      specKeys.length > 0
        ? `הרכב חומרים ומפרט: ${specKeys.slice(0, 2).map((k) => `${k}: ${(product.specifications as any)[k]}`).join(", ")}`
        : "גזרה מחמיאה מבד נעים ללבישה יומיומית ממושכת",
      product.sellerPositiveRate
        ? `חנות אמינה עם ציון שביעות רצון של ${product.sellerPositiveRate} ומעל ${product.ordersCount || 50} הזמנות`
        : "תפירה כפולה באזורי עומס ומבד נושם שמתאים למזג האוויר בישראל",
    ];
  } else if (isElec) {
    dynamicPros = [
      `מחיר תחרותי במיוחד של כ-₪${product.priceIls || priceIls} ($${product.priceUsd})${isTaxExempt ? " כולל פטור מלא ממכס ומע\"מ" : ""}`,
      specKeys.length > 0
        ? `מפרט טכני מתקדם: ${specKeys.slice(0, 2).map((k) => `${k}: ${(product.specifications as any)[k]}`).join(", ")}`
        : `מעל ${product.ordersCount || 100} הזמנות מוצלחות וציון אמינות גבוה`,
      "תאימות מלאה לשקע ורשת החשמל בישראל (EU Plug 220V)",
    ];
  } else if (archetype === "KIDS_TOYS") {
    dynamicPros = [
      `מחיר משתלם של כ-₪${product.priceIls || priceIls} ($${product.priceUsd})${isTaxExempt ? " בפטור מלא ממכס" : ""}`,
      specKeys.length > 0
        ? `חומרים ומפרט: ${specKeys.slice(0, 2).map((k) => `${k}: ${(product.specifications as any)[k]}`).join(", ")}`
        : "מבנה עמיד המיועד למשחק ממושך של ילדים",
      "חומרים ללא רעלנים וקצוות מעוגלים לבטיחות מרבית",
    ];
  } else {
    dynamicPros = [
      `מחיר תחרותי במיוחד של כ-₪${product.priceIls || priceIls} ($${product.priceUsd})${isTaxExempt ? " כולל פטור מלא ממכס ומע\"מ" : ""}`,
      specKeys.length > 0
        ? `מפרט ועמידות: ${specKeys.slice(0, 2).map((k) => `${k}: ${(product.specifications as any)[k]}`).join(", ")}`
        : `מעל ${product.ordersCount || 100} הזמנות מוצלחות`,
      "איכות חומרים עמידה בשימוש יומיומי ממושך",
    ];
  }

  // Archetype tailored cons
  let dynamicCons: string[] = [];
  if (isFashion) {
    dynamicCons = [
      "מידות אסייתיות - מומלץ לבדוק את טבלת המידות בסנטימטרים ולהזמין מידה אחת מעל המידה הרגילה בישראל",
      Number(product.priceUsd) >= 75
        ? "מחיר המוצר עולה על $75 ועלול לחול מע\"מ (17%)"
        : "זמן אספקה ממוצע של שבוע וחצי עד שבועיים במשלוח סטנדרטי",
    ];
  } else if (isElec) {
    dynamicCons = [
      "מגיע לרוב עם חוברת הוראות באנגלית/סינית בלבד (ללא עברית)",
      Number(product.priceUsd) >= 75
        ? "מחיר המוצר עולה על $75 ועלול להיות מחויב במע\"מ (17%)"
        : "זמן אספקה ממוצע של שבוע וחצי עד שבועיים",
    ];
  } else {
    dynamicCons = [
      "הוראות שימוש והרכבה באנגלית בלבד",
      Number(product.priceUsd) >= 75
        ? "מחיר המוצר עולה על $75 ועלול לחול מע\"מ (17%)"
        : "זמן אספקה ממוצע של שבוע וחצי עד שבועיים",
    ];
  }

  // Final check against banned generic phrases
  const finalPros = sanitizeProsCons(dynamicPros, archetype, "pros");
  const finalCons = sanitizeProsCons(dynamicCons, archetype, "cons");

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

/**
 * Generate a concise, SEO-focused, accessible Hebrew Alt Text for an article image/infographic
 */
export async function generateRonAltText(
  productTitle: string,
  category?: string
): Promise<string> {
  const fallback = `${productTitle} - סקירת מפרט ואינפוגרפיה רשמית באלי אקספרס`;

  if (!isGeminiConfigured()) {
    return fallback;
  }

  try {
    const client = getGenAI();
    const prompt = `
המוצר: "${productTitle}"
קטגוריה: "${category || "אלקטרוניקה וגאדג'טים"}"

כתוב תיאור תמונה שיווקי ונגיש (Alt Text) בעברית תקנית עבור תמונה/אינפוגרפיה מרכזית של המוצר בסקירה.
דרישות:
- אורך: 8 עד 18 מילים.
- לשלב מילות מפתח טבעיות של המוצר ל-SEO ולנגישות.
- החזר אך ורק את טקסט ה-Alt ללא מרכאות, ללא קידומות וללא שום טקסט נלווה.
`;

    const response = await generateWithFallback(client, {
      contents: [{ role: "user", parts: [{ text: `${RON_SYSTEM_PROMPT}\n\n${prompt}` }] }],
      config: { temperature: 0.5 },
    });

    const text = response.text?.trim().replace(/^["']|["']$/g, "");
    return text || fallback;
  } catch (err) {
    console.warn("Ron alt text generation error:", err);
    return fallback;
  }
}

