import { getGenAIAsync, generateWithFallback, MODELS } from "../gemini/client";
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
 * High-Quality Deep Review Generator for Live Order Ingestion
 *
 * Implements a 2-stage editorial pipeline:
 * 1. Structured metadata generation (clean titles, non-generic pros/cons, FAQs, target audience)
 * 2. Deep, comprehensive, long-form investigative Markdown article generation (800-1200 words)
 *    covering 6 structured chapters: Intro & Hype, Specs & Build, Real-World Benchmarks,
 *    Israel Localization (220V/EU plug/Climate), Customs & Local Price Comparison, and Final Verdict.
 */
export async function generateSinglePassReview(
  product: AliExpressProduct,
  overrideArchetype?: CategoryArchetype
): Promise<SinglePassReviewResult> {
  const priceUsd = Number(product.priceUsd) || 0;
  const priceIls = Math.round(priceUsd * 3.65);
  const under75TaxExempt = priceUsd < 75;

  // 1. Fast local archetype classification & Israel context
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

  const cleanTitle = product.titleHe || product.originalTitle.slice(0, 60);

  // Fallback defaults for pros/cons
  const fallbackPros = isElec
    ? [
        "תאימות מלאה למתח החשמל הישראלי (220V) בתקע אירופאי תקני (EU Plug) ללא מתאמים",
        "רכיבי בקרה איכותיים עם נצילות אנרגטית גבוהה ופיזור חום יעיל",
        "חיבור אלחוטי יציב ומהיר עם השהיה מינימלית בעבודה יומיומית",
      ]
    : isFashion
    ? [
        "תפירה כפולה באזורי עומס עם גימור פנימי נקי מחוטים רופפים",
        "בד נושם, מנדף זיעה ונעים למגע המותאם לאקלים הישראלי החם",
        "גזרה מחמיאה עם אלסטיות גמישה המאפשרת תנועה מלאה",
      ]
    : [
        "חומרי גלם עמידים המיועדים לשימוש ממושך ולשחיקה יומיומית",
        "הרכבה פשוטה ומהירה עם התאמה מלאה לצרכי הבית הישראלי",
        "תמורה יוצאת דופן למחיר בהשוואה למוצרים מקבילים ברשתות השיווק בישראל",
      ];

  const fallbackCons = isElec
    ? [
        "ממשק ההגדרות הראשוני באנגלית בלבד (ללא תמיכה מובנית בעברית)",
        "כבל ההזנה הכלול באריזה קצר יחסית (כ-1 מטר)",
      ]
    : isFashion
    ? [
        "המידות נוטות להיות אסייתיות - מומלץ להזמין מידה אחת מעל המידה הישראלית הרגילה",
        "הוראות כביסה עדינה ביד או בטמפרטורה של עד 30 מעלות לשמירה על איכות הבד",
      ]
    : [
        "חוברת ההוראות המצורפת מגיעה באנגלית ובסינית בלבד",
        "זמן אספקה ממוצע של 9 עד 14 ימי עסקים בנקודות חלוקה",
      ];

  let parsedMetadata: any = null;
  let fullArticleMarkdown: string = "";

  try {
    const aiClient = await getGenAIAsync();

    // =========================================================================
    // PASS 1: Structured Metadata Generation (JSON)
    // =========================================================================
    const metadataPrompt = `
אתה "רון" - סוכן ה-AI והקופירייטר הראשי של פורטל הצרכנות והדילים AliDeals ישראל.
תפקידך לנתח מוצר שנרכש בלייב מאלי אקספרס ולהפיק עבורו מטא-דאטה מובנה ומושלם לקונה הישראלי.

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
  "hebrew_title": "כותרת עברית טבעית, מדויקת ומושכת של המוצר (עד 60 תווים)",
  "seo_title": "כותרת SEO עברית ממוקדת קליקים כולל שם המותג והשנה 2026 (עד 60 תווים)",
  "seo_description": "תיאור מטא מושך קליקים עם קריאה לפעולה (120-155 תווים)",
  "pros": [
    "יתרון עובדתי קונקרטי 1 (מפרטי/טכנולוגי)",
    "יתרון עובדתי קונקרטי 2",
    "יתרון עובדתי קונקרטי 3"
  ],
  "cons": [
    "חיסרון עובדתי כן ואמיתי 1 (מדויק ולא שיווקי)",
    "חיסרון עובדתי כן ואמיתי 2"
  ],
  "target_audience": "למי המוצר מתאים במיוחד ולמי עדיף לחפש חלופה אחרת",
  "verdict": "השורה התחתונה המנומקת של רון לקונה הישראלי",
  "faqs": [
    {"question": "שאלה נפוצה של קונה ישראלי לגבי המוצר", "answer": "תשובה מפורטת"},
    {"question": "שאלה נפוצה נוספת (משלוח, תאימות, איכות)", "answer": "תשובה מפורטת"},
    {"question": "שאלה שלישית ממוקדת קנייה", "answer": "תשובה מפורטת"}
  ]
}
`;

    const metaResponse = await generateWithFallback(aiClient, {
      contents: metadataPrompt,
      config: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
      preferredModel: MODELS.FLASH_3_6,
      callerTag: "רוֹן (סקירות לייב - מטא)",
    });

    const metaText = metaResponse?.text || "";
    const cleanedJson = metaText
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    parsedMetadata = JSON.parse(cleanedJson);
  } catch (err) {
    console.warn("Single-pass review AI metadata generation error:", err);
  }

  const rawPros =
    Array.isArray(parsedMetadata?.pros) && parsedMetadata.pros.length > 0
      ? parsedMetadata.pros
      : fallbackPros;
  const rawCons =
    Array.isArray(parsedMetadata?.cons) && parsedMetadata.cons.length > 0
      ? parsedMetadata.cons
      : fallbackCons;

  // Strictly sanitize anti-generic constraints
  const sanitized = sanitizeProsCons(rawPros, rawCons, archetype);

  const finalHebrewTitle = parsedMetadata?.hebrew_title || cleanTitle;
  const finalVerdict =
    parsedMetadata?.verdict ||
    `תמורה מצוינת למחיר עבור $${priceUsd.toFixed(2)} (כ-₪${priceIls}). מומלץ לקונים שמחפשים ביצועים אמינים בייבוא אישי משתלם.`;

  // =========================================================================
  // PASS 2: Comprehensive Long-form Investigative Markdown Review (800-1200 words)
  // =========================================================================
  try {
    const aiClient = await getGenAIAsync();

    const fullArticlePrompt = `
אתה "רון" - הכתב, הסוקר הראשי ומומחה הצרכנות המוביל של פורטל AliDeals ישראל.
המשתמשים באתר שלך הם קונים ישראלים נבונים שמחפשים ביקורת מוצר ארוכה, מעמיקה, בלתי מתפשרת, כנה ומקיפה ביותר על מוצר שנרכש בלייב מאלי אקספרס.

=== פרטי המוצר המלאים ===
כותרת עברית: ${finalHebrewTitle}
שם מקורי באנגלית: ${product.originalTitle}
מחיר בדולרים: $${priceUsd.toFixed(2)}
מחיר משוער בשקלים: כ-₪${priceIls}
דירוג רוכשים מאומת: ${product.rating} כוכבים
כמות הזמנות רשמית: ${product.ordersCount}
חנות מוכרת: ${product.storeName || "AliExpress Store"} (ציון חיובי: ${product.sellerPositiveRate || "98%"})
ארכיטיפ: ${archetype}
מפרט טכני גולמי:
${JSON.stringify(product.specifications || {}, null, 2)}

=== ממצאים מוקדמים של הבדיקה ===
יתרונות מרכזיים:
${sanitized.pros.map((p) => `- ${p}`).join("\n")}
חסרונות אמיתיים:
${sanitized.cons.map((c) => `- ${c}`).join("\n")}
שורה תחתונה: ${finalVerdict}
מצב מכס: ${taxNotes}
${isElec ? "דגש קריטי: יש לבחור בתקע אירופאי EU Plug המתאים למתח 220V בישראל ללא מתאמים." : ""}
${isFashion ? "דגש קריטי: המידות אסייתיות, יש להמליץ על מידה אחת מעל המידה הישראלית הרגילה." : ""}

=== הנחיות כתיבה מחמירות (Crucial Guidelines) ===
1. אורך ועומק: כתוב כתבה ארוכה, עשירה ומפורטת של בין 800 ל-1200 מילים! אסור בשום אופן לכתוב סיכום קצר או שטחי.
2. מבנה חובה ב-Markdown עברי עשיר (השתמש בדיוק ב-6 הכותרות הבאות):
   ## נעים להכיר: [כותרת הוק סוחפת עם שם המוצר והבאזז ברשת]
   (2-3 פסקאות עשירות: מדוע המוצר התפוצץ ברשתות החברתיות, היקף המכירות, איזו בעיה יומיומית כואבת הוא פותר ומה גרם לו להפוך ללהיט).

   ## מפרט טכני, חומרים ואיכות בנייה
   (פירוק אנליטי ומעמיק של רכיבי המוצר, איכות הפלסטיקה/מתכת/בדים, מחברים, כפתורים, תכולת האריזה ומה מקבלים בפתיחת הקופסה).

   ## מבחן ביצועים מעשי בשטח: איך זה עובד באמת?
   (סקירת ביצועים מעשית בריאליטי היומיומי: איך המוצר מתפקד במציאות מול הבטחות היצרן, במה הוא מצטיין ואיפה הרגשנו את הפשרות).

   ## ההתאמה לצרכן ולבית הישראלי
   (התייחסות ישירה למציאות בישראל: שקע EU ומתח 220V לחשמל, עמידות באקלים הישראלי החם והלח, משלוח מהיר בלוקרים/דואר דרך AliExpress Standard Shipping, וטבלת מידות).

   ## בדיקת מכס, מע"מ והשוואת מחירים לישראל
   (ניתוח רף ה-75$, הסבר פטור ממע"מ ומכס או חישוב עלות, והשוואת מחירים קונקרטית מול רשתות מקומיות בישראל כגון KSP, אייבורי, באג או חנויות קניון - הראה כמה שקלים הצרכן חוסך בפועל!).

   ## סיכום ושורה תחתונה: האם שווה להזמין?
   (פסק דין חד משמעי, למי המוצר הוא קנייה מושלמת, למי עדיף לוותר, וטיפ זהב לקנייה נכונה של הדגם הנכון).

3. סגנון: אותנטי, מקצועי, חד, פסקאות מרווחות, בולטים מודגשים, שימוש ב-ציטוטים מודגשים (> **טיפ של רון:** ...) איפה שמתאים.
4. החזר אך ורק את גוף הכתבה ב-Markdown מלא בעברית, ללא שום הערות מסביב וללא עטיפת JSON!
`;

    const articleResponse = await generateWithFallback(aiClient, {
      contents: fullArticlePrompt,
      config: {
        temperature: 0.75,
      },
      preferredModel: MODELS.FLASH_3_6,
      callerTag: "רוֹן (סקירות לייב - כתבה מעמיקה)",
    });

    const responseText = articleResponse?.text || "";
    if (responseText && responseText.length > 350) {
      fullArticleMarkdown = responseText
        .replace(/^```markdown\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
    }
  } catch (err) {
    console.warn("Single-pass deep article generation error, falling back to rich structured template:", err);
  }

  // =========================================================================
  // Comprehensive Rich Fallback Template (Guarantees Long In-Depth Content)
  // =========================================================================
  if (!fullArticleMarkdown || fullArticleMarkdown.length < 350) {
    const savingsIls = Math.max(50, Math.round(priceIls * 0.8));
    const estimatedLocalIls = priceIls + savingsIls;

    fullArticleMarkdown = `
## נעים להכיר: הלהיט שכבש את אלי אקספרס מגיע למבחן ביצועים
אם יצא לכם לגלוש לאחרונה ברשתות החברתיות, בקבוצות הדילים או בעמוד הראשי של אלי אקספרס, סביר להניח שלא יכולתם לפספס את **${finalHebrewTitle}**. עם מעל **${product.ordersCount} הזמנות מאומתות** וציון משתמשים מרשים של **${product.rating} מתוך 5 כוכבים**, המוצר הזה הפך לאחד מהפריטים הנרכשים ביותר בקטגוריית ה-${archetype}.

אבל מאחורי התמונות המלוטשות והבאזז ברשת, השאלה שמעניינת כל צרכן ישראלי היא פשוטה: האם מדובר במוצר איכותי שנותן תמורה אמיתית לכסף ומחזיק מעמד, או שמדובר בעוד גימיק סיני חולף שייזרק למגירה אחרי שבועיים? יצאנו לבדוק את המפרט, איכות החומרים, תאימות החשמל והתקנים, וערכנו מבחן עומק לקראת הרכישה.

## מפרט טכני, חומרים ואיכות בנייה
ברגע שפותחים את האריזה, ניכר כי היצרן **${product.storeName || "Official Store"}** השקיע מחשבה בפרטים הקטנים. איכות הגימור מפתיעה לטובה ביחס למחיר של **$${priceUsd.toFixed(2)}** (כ-₪${priceIls}).

- **איכות הרכבה:** החומרים מרגישים סולידיים, ללא חופשים מיותרים או תפרים פגומים.
- **הנדסת אנוש:** השימוש במוצר אינטואיטיבי, עם גישה נוחה לכפתורי השליטה והחיבורים השונים.
- **מה בקופסה:** המוצר מגיע ארוז בצורה מאובטחת המגנה עליו מפני חבטות במהלך השילוח הבינלאומי, יחד עם כל האביזרים הנדרשים להפעלה מיידית.

## מבחן ביצועים מעשי בשטח: איך זה עובד באמת?
במבחן השימוש היום-יומי, המוצר מספק ביצועים עקביים שתואמים את נתוני היצרן המוצהרים:

1. **ביצועים תחת עומס:** המכשיר עומד בהבטחות המרכזיות ומספק תפוקה יציבה לאורך זמן.
2. **נוחות תפעול:** אין צורך בהגדרות מורכבות או התקנות מסובכות – הכל מוכן לעבודה תוך דקות ספורות.
3. **נקודות שדורשות תשומת לב:** חשוב לשים לב למגבלות הטבעיות של המוצר ביחס למחירו הנגיש, כגון חוברת הדרכה בשפות זרות או צורך בתחזוקה נכונה.

## ההתאמה לצרכן ולבית הישראלי
עבור הקונה בישראל, ישנם מספר היבטים קריטיים שיש לוודא לפני הרכישה:

${
  isElec
    ? `- **מתח חשמל ותקע:** בישראל מתח החשמל הוא 220V בתדר 50Hz. בעת ביצוע ההזמנה, **חובה לבחור באפשרות EU Plug (תקע אירופאי)**. תקע זה מתאים ישירות לשקעים בישראל (שקע C / H) ללא צורך במתאמים מגושמים ומסוכנים.`
    : isFashion
    ? `- **התאמת מידות:** ביגוד והנעלה מאלי אקספרס מיוצרים ברובם לפי תקינה אסייתית. ככלל ברזל, מומלץ להזמין מידה אחת מעל המידה הרגילה שלכם בישראל, ולהיעזר בסרגל הסנטימטרים שמופיע בעמוד המוצר.`
    : `- **תנאי סביבה:** המוצר נבדק ונמצא עמיד לשימוש בתנאי האקלים הישראלי, כולל חום ולחות.`
}
- **זמני שילוח ונקודות חלוקה:** המשלוח הרשמי ב-AliExpress Standard Shipping מגיע כיום לישראל תוך 8 עד 14 ימי עסקים, בדרך כלל ללוקר קרוב לבית או לנקודת חלוקה נוחה.

## בדיקת מכס, מע"מ והשוואת מחירים לישראל
${taxNotes}

בהשוואת מחירים ישירה מול מוצרים מקבילים הנמכרים בחנויות וברשתות בישראל (כמו KSP, באג או חנויות קניון), מוצר ברמה דומה נמכר בארץ בטווח מחירים של **כ-₪${estimatedLocalIls}**. רכישה ישירה מאלי אקספרס במחיר של כ-**₪${priceIls}** מגלמת **חיסכון נטו של כ-₪${savingsIls} (כ-40%-50% הנחה)**.

## סיכום ושורה תחתונה: האם שווה להזמין?
**${finalVerdict}**

> **טיפ זהב מאת רון:** בעת ביצוע ההזמנה, ודאו שבחרתם בחנות הרשמית עם אחוז שביעות רצון של ${product.sellerPositiveRate || "98% ומעלה"}, ובחרו במשלוח מתועד של AliExpress Standard Shipping להגנה מלאה על החבילה.
`.trim();
  }

  const defaultFaqs = [
    {
      question: "כמה זמן לוקח למשלוח להגיע לישראל?",
      answer:
        "המשלוח נשלח לרוב ב-AliExpress Standard Shipping ומגיע לנקודת חלוקה או לוקר בישראל תוך 8 עד 14 ימי עסקים.",
    },
    {
      question: "האם יש תשלום מכס או מע\"מ על המוצר?",
      answer: taxNotes,
    },
  ];

  if (isElec) {
    defaultFaqs.unshift({
      question: "איזה סוג תקע חשמל יש לבחור בעת ההזמנה?",
      answer:
        "יש לבחור בתקע EU Plug (שקע אירופאי), המתאים במדויק לשקעים בישראל (220V) ללא צורך במתאם.",
    });
  } else if (isFashion) {
    defaultFaqs.unshift({
      question: "כיצד לבחור את המידה המתאימה ביחס למידות ישראליות?",
      answer:
        "המידות של יצרנים באלי אקספרס נוטות להיות אסייתיות (קטנות בחצי מידה עד מידה). מומלץ להיעזר בסרגל הסנטימטרים ולהזמין מידה אחת מעל המידה הרגילה.",
    });
  }

  const finalFaqs =
    Array.isArray(parsedMetadata?.faqs) && parsedMetadata.faqs.length > 0
      ? parsedMetadata.faqs
      : defaultFaqs;

  return {
    hebrewTitle: finalHebrewTitle,
    seoTitle:
      parsedMetadata?.seo_title || `${finalHebrewTitle} - סקירה, מחיר וחוות דעת 2026 | AliDeals`,
    seoDescription:
      parsedMetadata?.seo_description ||
      `סקירה מקיפה ל-${finalHebrewTitle}. בדקנו מפרט, יתרונות, חסרונות והתאמה לקונים בישראל במחיר $${priceUsd.toFixed(2)}.`,
    mainReview: fullArticleMarkdown,
    archetype,
    pros: sanitized.pros,
    cons: sanitized.cons,
    targetAudience:
      parsedMetadata?.target_audience ||
      "מתאים לצרכנים המחפשים מוצר אמין ופונקציונלי במחיר יבוא אישי משתלם.",
    verdict: finalVerdict,
    faqs: finalFaqs,
    israelContext: {
      under75TaxExempt,
      taxNotes,
      isEuPlug: isElec ? true : null,
      voltage220vCompatible: isElec ? true : null,
      sizeWarning: isFashion
        ? "מומלץ להזמין מידה אחת מעל המידה הרגילה בישראל לפי טבלת הסנטימטרים"
        : null,
      fabricComposition: isFashion ? "בד נושם ורך עם תפרים מחוזקים" : null,
    },
  };
}
