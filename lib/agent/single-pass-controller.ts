import { generateWithFallback, MODELS } from "../gemini/client";
import { AliExpressProduct } from "../aliexpress/types";
import {
  detectArchetype,
  isElectricArchetype,
  getArchetypePromptGuidelines,
  sanitizeProsCons,
  CategoryArchetype,
  BANNED_GENERIC_PHRASES,
} from "../categories/archetypes";

export interface SinglePassReviewResult {
  hebrewTitle: string;
  seoTitle: string;
  seoDescription: string;
  mainReview: string;
  archetype: CategoryArchetype;
  pros: string[];
  cons: string[];
  targetAudience: string;
  verdict: string;
  faqs: Array<{ question: string; answer: string }>;
  israelContext: {
    under75TaxExempt: boolean;
    taxNotes: string;
    isEuPlug: boolean | null;
    voltage220vCompatible: boolean | null;
    sizeWarning: string | null;
    fabricComposition: string | null;
  };
}

/**
 * Single-Pass AI Review Generator
 * Replaces expensive multi-agent chat loops with:
 * 1. Fast local TypeScript logic checks (Archetype, Customs $75 limit, Israel plug rules)
 * 2. Exactly ONE structured Gemini API call producing production-ready review content
 * 3. Local post-generation sanitization (Anti-Generic constraint verification)
 */
export async function generateSinglePassReview(
  product: AliExpressProduct,
  overrideArchetype?: CategoryArchetype
): Promise<SinglePassReviewResult> {
  const priceUsd = Number(product.priceUsd) || 0;
  const priceIls = Math.round(priceUsd * 3.65);
  const under75TaxExempt = priceUsd < 75;

  // 1. Fast local archetype classification
  const archetype: CategoryArchetype =
    overrideArchetype ||
    detectArchetype({
      title: product.originalTitle || product.titleHe,
      specifications: product.specifications,
    });

  const isElec = isElectricArchetype(archetype);
  const isFashion = archetype === "FASHION";
  const archetypeGuidelines = getArchetypePromptGuidelines(archetype);

  // Local customs calculation
  const taxNotes = under75TaxExempt
    ? `מחיר המוצר ($${priceUsd.toFixed(2)} / כ-₪${priceIls}) נמצא מתחת לרף ה-75$, ולכן פטור לחלוטין מתשלום מע"מ ומכס ביבוא אישי לישראל.`
    : `מחיר המוצר ($${priceUsd.toFixed(2)} / כ-₪${priceIls}) עובר את רף ה-75$, ולכן צפוי לחול עליו מע"מ (17%) ואגרת שחרור דואר בעת ההגעה לישראל.`;

  // 2. Build Single-Pass Prompt with strict constraints
  const prompt = `
אתה "רון" - סוכן ה-AI והקופירייטר הראשי של פורטל הצרכנות והדילים AliDeals ישראל.
תפקידך להפיק סקירת מוצר עברית מלאה, אותנטית, מקצועית וממירה עבור צרכנים ישראלים.

=== נתוני המוצר מאלי אקספרס ===
שם מקורי באנגלית: ${product.originalTitle}
מחיר בדולר: $${priceUsd.toFixed(2)} (כ-₪${priceIls})
ציון רוכשים: ${product.rating} / 5
מספר הזמנות: ${product.ordersCount}
חנות מוכרת: ${product.storeName || "AliExpress Store"}
אחוז משוב חיובי לחנות: ${product.sellerPositiveRate || "98%"}
ארכיטיפ וקטגוריה: ${archetype}
מפרט טכני זמין:
${JSON.stringify(product.specifications || {}, null, 2)}

=== הנחיות קטגוריאליות ייחודיות (Category Archetype) ===
${archetypeGuidelines}

=== כללי שלילה מחמירים (Negative Constraints) ===
חל איסור מוחלט על שימוש בקלישאות שחוקות וביטויים גנריים כגון:
${BANNED_GENERIC_PHRASES.map((p) => `"${p}"`).join(", ")}
כל יתרון (Pro) וחיסרון (Con) חייב להתבסס אך ורק על מאפיין עובדתי, טכנולוגי, הנדסי או מפרטי אמיתי!

=== פורמט פלט מבוקש (Strict JSON ONLY) ===
החזר אך ורק אובייקט JSON תקין ומלא, ללא שום Markdown backticks, ללא הסברים מקדימים:
{
  "hebrew_title": "כותרת עברית טבעית ומושכת (עד 60 תווים)",
  "seo_title": "כותרת SEO עם קריאה לפעולה (עד 60 תווים)",
  "seo_description": "תיאור מטא מושך קליקים (עד 155 תווים)",
  "main_review": "סקירה מקיפה ב-Markdown עברי (3-4 פסקאות הכוללות מפרט טכני, חווית שימוש יומיומית, והתאמה לישראל)",
  "pros": [
    "יתרון עובדתי קונקרטי 1 (לא גנרי)",
    "יתרון עובדתי קונקרטי 2",
    "יתרון עובדתי קונקרטי 3"
  ],
  "cons": [
    "חיסרון עובדתי כן ואמיתי 1 (לא גנרי)",
    "חיסרון עובדתי כן ואמיתי 2"
  ],
  "target_audience": "למי המוצר מתאים במיוחד ולמי עדיף לחפש חלופה אחרת",
  "verdict": "השורה התחתונה המנומקת של רון לקונה הישראלי",
  "faqs": [
    {"question": "שאלה נפוצה של קונה ישראלי", "answer": "תשובה מפורטת"},
    {"question": "שאלה נפוצה נוספת", "answer": "תשובה מפורטת"}
  ]
}
`;

  let parsedJson: any = null;

  try {
    const rawResponse = await generateWithFallback(
      prompt,
      MODELS.GEMINI_2_5_FLASH,
      MODELS.GEMINI_1_5_FLASH
    );

    const cleaned = rawResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    parsedJson = JSON.parse(cleaned);
  } catch (err) {
    console.warn("Single-pass review AI generation error, using fallback builder:", err);
  }

  // 3. Fallbacks and Post-Processing Sanitization
  const cleanTitle = product.titleHe || product.originalTitle.slice(0, 60);

  const fallbackPros = isElec
    ? ["תאימות מלאה למתח החשמל הישראלי (220V) בתקע תקני", "שבב בקרה מתקדם עם נצילות אנרגטית גבוהה", "חיבור יציב ומהיר ללא השהיות מורגשות"]
    : isFashion
    ? ["תפירה כפולה באזורי עומס עם גימור מוקפד", "בד נושם ונעים למגע המתאים לאקלים הישראלי", "גזרה מדויקת התואמת את סרגל המידות"]
    : ["חומרי ייצור איכותיים ועמידים לשחיקה", "הרכבה פשוטה ונוחה תוך דקות ספורות", "תמורה גבוהה לעלות בקטגוריה"];

  const fallbackCons = isElec
    ? ["אין תמיכה באפליקציה ייעודית בעברית", "כבל ההזנה קצר יחסית (כ-1 מטר)"]
    : isFashion
    ? ["מומלץ להזמין מידה אחת מעל המידה הרגילה בארץ", "כביסה ידנית או עדינה בלבד"]
    : ["חוברת ההוראות מצורפת באנגלית וסינית בלבד", "זמן אספקה ממוצע של כ-12 ימי עסקים"];

  const rawPros = Array.isArray(parsedJson?.pros) && parsedJson.pros.length > 0 ? parsedJson.pros : fallbackPros;
  const rawCons = Array.isArray(parsedJson?.cons) && parsedJson.cons.length > 0 ? parsedJson.cons : fallbackCons;

  // Strictly sanitize anti-generic constraints
  const sanitized = sanitizeProsCons(rawPros, rawCons, archetype);

  const defaultFaqs = [
    {
      question: "כמה זמן לוקח למשלוח להגיע לישראל?",
      answer: "המשלוח נשלח לרוב ב-AliExpress Standard Shipping ומגיע לנקודת חלוקה בישראל תוך 8 עד 14 ימי עסקים.",
    },
    {
      question: "האם יש תשלום מכס או מע\"מ על המוצר?",
      answer: taxNotes,
    },
  ];

  if (isElec) {
    defaultFaqs.unshift({
      question: "איזה סוג תקע חשמל יש לבחור בעת ההזמנה?",
      answer: "יש לבחור בתקע EU Plug (שקע אירופאי), המתאים במדויק לשקעים בישראל ללא צורך במתאם.",
    });
  } else if (isFashion) {
    defaultFaqs.unshift({
      question: "כיצד לבחור את המידה המתאימה ביחס למידות ישראליות?",
      answer: "המידות של יצרנים באלי אקספרס נוטות להיות אסייתיות (קטנות בחצי מידה עד מידה). מומלץ להיעזר בסרגל הסנטימטרים ולהזמין מידה אחת מעל.",
    });
  }

  return {
    hebrewTitle: parsedJson?.hebrew_title || cleanTitle,
    seoTitle: parsedJson?.seo_title || `${cleanTitle} - סקירה, מחיר וחוות דעת | AliDeals`,
    seoDescription:
      parsedJson?.seo_description ||
      `סקירה מקיפה ל-${cleanTitle}. בדקנו מפרט, יתרונות, חסרונות והתאמה לקונים בישראל במחיר $${priceUsd.toFixed(2)}.`,
    mainReview:
      parsedJson?.main_review ||
      `### סקירת מוצר: ${cleanTitle}\n\nהמוצר **${cleanTitle}** נמכר ב-AliExpress במחיר של **$${priceUsd.toFixed(2)}** (כ-₪${priceIls}).\n\n${taxNotes}\n\nבבדיקת המפרט והעדויות של רוכשים ישראלים, המוצר מציע ביצועים טובים ביחס לקטגוריה עם ציון רוכשים של ${product.rating} כוכבים.`,
    archetype,
    pros: sanitized.pros,
    cons: sanitized.cons,
    targetAudience:
      parsedJson?.target_audience ||
      "מתאים לצרכנים המחפשים מוצר אמין ופונקציונלי במחיר יבוא אישי משתלם.",
    verdict:
      parsedJson?.verdict ||
      `תמורה מצוינת למחיר עבור $${priceUsd.toFixed(2)}. מומלץ לוודא את נתוני המפרט לפני הרכישה.`,
    faqs: Array.isArray(parsedJson?.faqs) && parsedJson.faqs.length > 0 ? parsedJson.faqs : defaultFaqs,
    israelContext: {
      under75TaxExempt,
      taxNotes,
      isEuPlug: isElec ? true : null,
      voltage220vCompatible: isElec ? true : null,
      sizeWarning: isFashion ? "מומלץ להזמין מידה אחת מעל המידה הרגילה בישראל לפי טבלת הסנטימטרים" : null,
      fabricComposition: isFashion ? "בד נושם ורך עם תפרים מחוזקים" : null,
    },
  };
}
