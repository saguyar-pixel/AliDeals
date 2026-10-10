import { getGenAIAsync, isGeminiConfigured, generateWithFallback, MODELS } from "../gemini/client";
import { quotaGovernor } from "./quota-governor";
import { addAgentLog } from "./team-orchestrator";
import { supabaseDb, jsonDb, PageRecord } from "../db";
import { revalidatePath } from "next/cache";

// ==========================================
// 1. Interfaces & Data Types
// ==========================================

export interface RonKeywordResearch {
  primaryKeyword: string;
  searchIntent: "informational" | "commercial" | "transactional" | "navigational";
  targetAudience: string;
  lsiKeywords: string[];
  semanticEntities: string[];
  peopleAlsoAsk: string[];
  suggestedHeadings: Array<{
    level: "h2" | "h3";
    title: string;
    targetLsi: string[];
  }>;
  seoDifficulty: "easy" | "medium" | "competitive";
  searchVolumePotential: "high" | "medium" | "niche";
  strategyNotes: string;
}

export interface RonSeoArticleInput {
  topic: string;
  focusKeyword?: string;
  category?: string;
  targetAudience?: string;
  customInstructions?: string;
  existingResearch?: RonKeywordResearch;
  minWordCount?: number;
}

export interface RonSeoArticleOutput {
  pageId?: string;
  title: string;
  slug: string;
  metaTitle: string;
  metaDescription: string;
  directAnswerGeo: string;
  targetCategory: string;
  archetype?: string;
  tags: string[];
  estimatedReadTimeMinutes: number;
  contentMarkdown: string;
  lsiKeywordsWeaved: Array<{
    keyword: string;
    count: number;
    section: string;
  }>;
  pros: string[];
  cons: string[];
  faqs: Array<{ question: string; answer: string }>;
  productIds: string[];
  isEuPlug?: boolean | null;
  voltage220vCompatible?: boolean | null;
  sizeWarning?: string | null;
  fabricComposition?: string | null;
  structuredDataJson: string;
  featuredImage?: string | null;
  featuredImageAlt?: string;
  alonRationale: string;
  researchSnapshot: RonKeywordResearch;
}

// ==========================================
// 2. Curated Popular Topics for Israel SEO
// ==========================================

export const POPULAR_ISRAELI_ALIEXPRESS_TOPICS = [
  {
    topic: "מדריך מכס ומע״מ באלי אקספרס 2026",
    focusKeyword: "מכס אלי אקספרס",
    category: "מדריכי קנייה",
    description: "כל מה שצריך לדעת על רף ה-75$, מע\"מ 17%, אגרות שחרור וחבילות מפוצלות",
  },
  {
    topic: "סרגל מידות באלי אקספרס: איך לא לטעות בבגדים ונעליים",
    focusKeyword: "מידות אלי אקספרס",
    category: "אופנה והנעלה",
    description: "מדריך המרת מידות אסייתיות לאירופאיות (EU/IL) והסבר על טבלאות בס\"מ",
  },
  {
    topic: "איך למצוא קופונים וקודי הנחה פעילים באלי אקספרס",
    focusKeyword: "קופונים לאלי אקספרס",
    category: "מבצעים וקופונים",
    description: "שילוב קופוני חנות, קופונים אדומים ומטבעות (Coins) למקסימום חיסכון",
  },
  {
    topic: "משלוח AliExpress Choice לישראל: יתרונות, זמנים והחזרות",
    focusKeyword: "אלי אקספרס צ'ויס",
    category: "מדריכי קנייה",
    description: "למה כדאי לבחור במוצרי Choice, איך עובד משלוח חינם מעל 10$ והחזרה מקומית",
  },
  {
    topic: "איך לפתוח סכסוך (Dispute) באלי אקספרס ולקבל החזר כספי מלא",
    focusKeyword: "סכסוך באלי אקספרס החזר כספי",
    category: "מדריכי קנייה",
    description: "מדריך שלב-אחר-שלב: העלאת ראיות, התמודדות עם מוכר עקשן והגנת הקונה",
  },
  {
    topic: "שקע ותקע אירופאי (EU Plug): מדריך מוצרי חשמל לישראל מאלי אקספרס",
    focusKeyword: "מוצרי חשמל אלי אקספרס מתח 220v",
    category: "אלקטרוניקה וגאדג'טים",
    description: "הבדלים בין EU, US ו-UK, בדיקת תאימות 220V/50Hz ומניעת קצרים",
  },
];

// ==========================================
// 3. Step 1: Keyword Research & LSI Engine
// ==========================================

export async function researchRonKeywordsAndLsi(
  topicOrTerm: string,
  options?: { category?: string; targetAudience?: string; additionalNotes?: string }
): Promise<RonKeywordResearch> {
  const cleanTerm = topicOrTerm.trim();
  const category = options?.category || "מדריכי קנייה וצרכנות";
  const audience = options?.targetAudience || "קונים ישראלים באלי אקספרס, מחפשי דילים וצרכנים נבונים בישראל";

  // Check if Gemini is configured
  if (!(await isGeminiConfigured())) {
    return generateFallbackKeywordResearch(cleanTerm, category, audience);
  }

  try {
    await quotaGovernor.waitIfPacingRequired("gemini_pro");
    await quotaGovernor.recordUsage("gemini_pro", 1200);

    const client = await getGenAIAsync();

    const systemPrompt = `
אתה "רוֹן" - מומחה ה-SEO והקופירייטר הבכיר של פורטל AliDeals ישראל.
אתה מתמחה במחקר מילות מפתח, איתור כוונת חיפוש (Search Intent), חילוץ מילות מפתח סמנטיות (LSI Keywords) ושאלות נפוצות של ישראלים (PAA).

תפקידך:
לבצע מחקר מילות מפתח מקיף ומעמיק סביב הנושא/מונח המבוקש עבור מאמר תוכן ואסטרטגיית SEO לפורטל AliDeals.

דרישות המחקר:
1. Primary Keyword: חלץ את ביטוי החיפוש הראשי והמדויק ביותר בעברית.
2. Search Intent: קבע את כוונת החיפוש (informational / commercial / transactional / navigational).
3. LSI Keywords: לפחות 15-20 מילות מפתח סמנטיות, ביטויים נרדפים, מונחי זנב ארוך וביטויים נלווים שישראלים משתמשים בהם כשהם מחפשים את הנושא בגוגל.
4. Semantic Entities: מונחים מקצועיים ומותגיים הרלוונטיים לעלי אקספרס ולצרכן הישראלי (כגון שמות שירותים, תקרות מס, תקנים).
5. People Also Ask (PAA): לפחות 5 שאלות אמיתיות ונפוצות שישראלים מחפשים בנושא.
6. Suggested Headings: הצע היררכיית כותרות H2 ו-H3 עשירה שמתאימה לתוכן עניינים (TOC), כולל חלוקת מונחי LSI לכל כותרת.
7. SEO Difficulty & Volume: הערכת תחרותיות ופוטנציאל חיפוש.
8. Strategy Notes: 2-3 פסקאות אסטרטגיה ממוקדות: כיצד לתפוס את המקום הראשון בגוגל, כיצד להופיע ב-Google AI Overviews / SearchGPT, וכיצד המאמר יוביל להמרות וקליקים.

חוק בל יעבור: החזר אך ורק מבנה JSON תקין (Strict JSON) ללא תגיות Markdown או backticks.
`;

    const userPrompt = `
בצע מחקר מילות מפתח ו-LSI עבור:
- נושא/ביטוי מבוקש: "${cleanTerm}"
- קטגוריה: "${category}"
- קהל יעד: "${audience}"
${options?.additionalNotes ? `- הערות נוספות: "${options.additionalNotes}"` : ""}

החזר בפורמט JSON במבנה הבא:
{
  "primaryKeyword": "...",
  "searchIntent": "informational",
  "targetAudience": "...",
  "lsiKeywords": ["...", "...", "..."],
  "semanticEntities": ["...", "...", "..."],
  "peopleAlsoAsk": ["...", "...", "..."],
  "suggestedHeadings": [
    { "level": "h2", "title": "...", "targetLsi": ["...", "..."] },
    { "level": "h3", "title": "...", "targetLsi": ["..."] }
  ],
  "seoDifficulty": "medium",
  "searchVolumePotential": "high",
  "strategyNotes": "..."
}
`;

    const response = await generateWithFallback(client, {
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      config: { temperature: 0.5 },
      callerTag: "רוֹן (מחקר מילות מפתח & LSI)",
    });

    const rawText = response.text || "";
    const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedJson) as RonKeywordResearch;

    addAgentLog(
      "copywriter",
      "רון",
      "success",
      `מחקר מילות מפתח הושלם עבור "${cleanTerm}": אותרו ${parsed.lsiKeywords?.length || 0} מונחי LSI ו-${parsed.peopleAlsoAsk?.length || 0} שאלות נפוצות.`
    );

    return {
      primaryKeyword: parsed.primaryKeyword || cleanTerm,
      searchIntent: parsed.searchIntent || "informational",
      targetAudience: parsed.targetAudience || audience,
      lsiKeywords: Array.isArray(parsed.lsiKeywords) ? parsed.lsiKeywords : [],
      semanticEntities: Array.isArray(parsed.semanticEntities) ? parsed.semanticEntities : [],
      peopleAlsoAsk: Array.isArray(parsed.peopleAlsoAsk) ? parsed.peopleAlsoAsk : [],
      suggestedHeadings: Array.isArray(parsed.suggestedHeadings) ? parsed.suggestedHeadings : [],
      seoDifficulty: parsed.seoDifficulty || "medium",
      searchVolumePotential: parsed.searchVolumePotential || "high",
      strategyNotes: parsed.strategyNotes || "אסטרטגיית תוכן מותאמת ל-AI Overviews ודירוג אורגני בגוגל ישראל.",
    };
  } catch (err: any) {
    console.warn("Ron keyword research LLM failed, using smart fallback:", err?.message);
    return generateFallbackKeywordResearch(cleanTerm, category, audience);
  }
}

// ==========================================
// 4. Step 2: Full SEO Article Generator with LSI Weaving
// ==========================================

export async function generateRonSeoArticle(
  input: RonSeoArticleInput
): Promise<RonSeoArticleOutput> {
  const { topic, focusKeyword, category = "מדריכי קנייה וצרכנות", targetAudience, customInstructions } = input;
  const cleanTopic = topic.trim();

  // 1. Run or use existing keyword research
  const research = input.existingResearch || (await researchRonKeywordsAndLsi(cleanTopic, { category, targetAudience }));

  // 1.5. Extract AliExpress Product IDs from topic or custom instructions (Edge Case 3)
  const extractedAliIds = [
    ...extractAliExpressProductIds(topic),
    ...(customInstructions ? extractAliExpressProductIds(customInstructions) : []),
  ];

  // 2. Fetch candidate catalog products to recommend or embed
  let candidateProducts: Array<{ id: string; title: string; priceIls?: number }> = [];
  try {
    const allProds = supabaseDb.isConfigured() ? await supabaseDb.getProducts() : jsonDb.getProducts();
    if (Array.isArray(allProds)) {
      // Prioritize explicitly pasted AliExpress product IDs
      for (const aliId of extractedAliIds) {
        const found = allProds.find(
          (p) =>
            String(p.id) === aliId ||
            String(p.aliId) === aliId ||
            String(p.ali_product_id) === aliId
        );
        if (found) {
          candidateProducts.push({
            id: found.id,
            title: found.titleHe || found.title || found.originalTitle || "מוצר נבחר",
            priceIls: found.priceIls,
          });
        } else {
          candidateProducts.push({
            id: aliId,
            title: `מוצר אלי אקספרס נבחר (${aliId})`,
          });
        }
      }

      if (allProds.length > 0) {
        const topWords = cleanTopic.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);
        const matched = allProds.filter((p) => {
          const title = (p.titleHe || p.title || "").toLowerCase();
          const cat = (p.category || "").toLowerCase();
          return (
            title.includes(cleanTopic.toLowerCase()) ||
            cat.includes(category.toLowerCase()) ||
            topWords.some((w) => title.includes(w))
          );
        });
        const selected = (matched.length > 0 ? matched : allProds).slice(0, 6);
        for (const p of selected) {
          if (!candidateProducts.some((c) => c.id === p.id)) {
            candidateProducts.push({
              id: p.id,
              title: p.titleHe || p.title || p.originalTitle || "מוצר מומלץ",
              priceIls: p.priceIls,
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn("Could not fetch candidate products for article:", err);
  }

  // 3. Check if Gemini is configured
  if (!(await isGeminiConfigured())) {
    return generateFallbackArticle(cleanTopic, research, category, candidateProducts);
  }

  try {
    await quotaGovernor.waitIfPacingRequired("gemini_pro");
    await quotaGovernor.recordUsage("gemini_pro", 2400);

    const client = await getGenAIAsync();

    const systemPrompt = `
אתה "רוֹן" - סוכן ה-AI, הקופירייטר הבכיר ומומחה ה-SEO/GEO של פורטל AliDeals ישראל.
אתה נחשב לכותב התוכן המוביל בישראל למסחר אלקטרוני, צרכנות חכמה וקניות באלי אקספרס.

מטרתך:
לכתוב מאמר SEO מעמיק, מקיף, מרתק ואינפורמטיבי ביותר בעברית על הנושא שהוגדר, תוך **שזירה טבעית לחלוטין (LSI Weaving)** של כל מילות המפתח הסמנטיות שנמצאו במחקר, וחיבור אקטיבי של **כל שדות העמוד**:
- יתרונות וחסרונות ספציפיים (Pros & Cons)
- צ'קליסט קנייה חכמה
- שאלות ותשובות FAQ מקיפות
- תאימות ישראלית (תקע EU, מתח 220V, אזהרות מידה)
- שילוב מוצרים מומלצים

עקרונות כתיבה חובה (הנחיות בלתי מתפשרות):
1. עברית שוטפת וטבעית:
   - שפה עשירה, קולחת ומזמינה לקורא הישראלי.
   - איסור חמור על תרגום מכונה, מבנים תחביריים מאולצים או "דחיסת מילות מפתח" (Keyword Stuffing).
   - כל מונח LSI חייב להשתלב באופן אורגני כחלק אינטגרלי מהמשפט!
2. אופטימיזציה ל-GEO ו-AI Search:
   - פסקת "Direct Answer GEO": פסקה של 45-65 מילים בתחילת המאמר המספקת תשובה ישירה, מדויקת וממצה לקורא ולמנועי בינה מלאכותית (Google AI Overviews / SearchGPT / Perplexity).
3. היררכיית כותרות ותוכן עניינים (TOC):
   - השתמש בכותרות H2 (##) וכותרות H3 (###) ברורות שמתאימות לבניית תוכן עניינים אינטראקטיבי.
4. ערך מעשי ופרקטיקה לקונה הישראלי:
   - שלב תיבות "טיפ של רוֹן" (> 💡 **טיפ של רון:** ...)
   - שלב תיבות אזהרה צרכנית (> ⚠️ **אזהרת צרכנות:** ...)
   - שלב סעיף "צ'קליסט קנייה חכמה של רון" (## צ'קליסט קנייה חכמה של רון) עם 4-6 סעיפי בדיקה מעשיים בפורמט: - [x] סעיף...
   - התייחס להיבטים ישראליים: מכס (75$), מע"מ (17%), זמני משלוח לארץ, שקעים אירופאיים (EU 220V), מידות אסייתיות, שיטות תשלום מומלצות.
   - שלב טבלת השוואה או נתונים (Markdown Table) בפורמט | עמודה 1 | עמודה 2 |.
   - אם סופקו לך מוצרים מתאימים מהאתר, שזור תגית [product:ID] במקום המתאים בגוף המאמר כדי להציג כרטיס מוצר חי.
   - סיים תמיד עם פסקת "השורה התחתונה של רון" הכוללת המלצה חותכת ומעשית.
5. שאלות נפוצות (FAQ):
   - ספק לפחות 4 שאלות ותשובות מעמיקות (2-3 משפטים לתשובה) המבוססות על שאלות אמיתיות של ישראלים (People Also Ask).
6. שדות Pros & Cons:
   - ספק 3-5 יתרונות (pros) ממוקדים וספציפיים לנושא/מוצר.
   - ספק 2-4 חסרונות/אזהרות (cons) אמיתיים (רף 75$, הבדלי מידות, זמני הגעה, החזרות).
7. שדות תאימות וארכיטיפ:
   - קבע archetype מתוך: GENERAL, ELECTRONICS, FASHION, HOME_LIVING, BEAUTY, BABY_KIDS, SPORTS, AUTOMOTIVE.
   - קבע isEuPlug (true אם מוצר חשמלי שמתחבר לשקע, אחרת null או false).
   - קבע voltage220vCompatible (true אם מוצר חשמלי שדורש 220V, אחרת null או false).
   - קבע sizeWarning (אזהרת מידות אם מדובר באופנה/הנעלה, אחרת null).
   - קבע fabricComposition (הרכב בד אם מדובר בביגוד/טקסטיל, אחרת null).
8. חוק ברזל: החזר אך ורק מבנה JSON תקין (Strict JSON) ללא תגיות Markdown או backticks מסביב.
`;

    const userPrompt = `
כתוב מאמר SEO מלא ומקיף על הנושא הבא:
- נושא: "${cleanTopic}"
- מילת מפתח מרכזית: "${research.primaryKeyword || focusKeyword || cleanTopic}"
- קטגוריה: "${category}"
- קהל יעד: "${research.targetAudience}"
${customInstructions ? `- הנחיות מיוחדות: "${customInstructions}"` : ""}

נתוני מחקר מילות מפתח ו-LSI שיש לשזור במאמר:
- מילות מפתח LSI: ${JSON.stringify(research.lsiKeywords)}
- ישויות סמנטיות: ${JSON.stringify(research.semanticEntities)}
- שאלות גולשים (PAA): ${JSON.stringify(research.peopleAlsoAsk)}
- ראשי פרקים מומלצים: ${JSON.stringify(research.suggestedHeadings)}

${
  extractedAliIds.length > 0
    ? `📌 שים לב מיוחד: המשתמש סיפק קישור או מזהה פריט מאלי אקספרס (${extractedAliIds.join(", ")}).
חובה עליך:
1. לכלול את המזהה הזה בתוך מערך productIds ב-JSON.
2. לשלב תגית [product:${extractedAliIds[0]}] במיקום מרכזי בתוכן המאמר (למשל מתחת לפרק הסקירה או בכותרת מיוחדת).
3. להתייחס ישירות למוצר זה בניתוח, ביתרונות ובצ'קליסט!\n`
    : ""
}
${candidateProducts.length > 0 ? `מוצרים קיימים באתר שיכולים להתאים לכתבה (בחר 1-2 ושלב [product:ID] בתוכן):
${candidateProducts.map((p) => `- ID: "${p.id}", שם: "${p.title}"`).join("\n")}` : ""}

החזר אך ורק מבנה JSON בפורמט הבא:
{
  "title": "כותרת ראשית שובת עין וכוללת את מילת המפתח ל-2026",
  "slug": "english-url-slug-optimized-for-seo",
  "metaTitle": "כותרת מטא של עד 60 תווים כולל הנעה לפעולה",
  "metaDescription": "תיאור מטא מושך של עד 155 תווים עם מונחי LSI וקריאה לפעולה",
  "directAnswerGeo": "פסקת Direct Answer של 45-60 מילים לציטוט ב-Google AI Overviews",
  "targetCategory": "${category}",
  "archetype": "GENERAL",
  "tags": ["תגית 1", "תגית 2", "תגית 3", "תגית 4", "תגית 5"],
  "estimatedReadTimeMinutes": 5,
  "pros": [
    "יתרון ראשון מובהק לקורא הישראלי",
    "יתרון שני...",
    "יתרון שלישי..."
  ],
  "cons": [
    "חיסרון או כוכבית ראשונה (למשל תקרת 75$ למכס)",
    "חיסרון שני (למשל צורך בבדיקת מידות או שקע)"
  ],
  "isEuPlug": false,
  "voltage220vCompatible": false,
  "sizeWarning": null,
  "fabricComposition": null,
  "productIds": ${JSON.stringify(candidateProducts.slice(0, 2).map((p) => p.id))},
  "contentMarkdown": "טקסט המאמר המלא בפורמט Markdown הכולל כותרות ## ו-###, פסקאות מפורטות, רשימות, טבלאות, צ'קליסט בפורמט - [x] ותיבות טיפ...",
  "lsiKeywordsWeaved": [
    { "keyword": "...", "count": 2, "section": "..." }
  ],
  "faqs": [
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." },
    { "question": "...", "answer": "..." }
  ],
  "featuredImageAlt": "תיאור תמונה נגיש ו-SEO עשיר למאמר",
  "alonRationale": "ניתוח קצר של אלון כיצד המאמר הזה משרת את האתר, מביא תנועה אורגנית ותומך ביעד ה-100$ ביום"
}
`;

    const response = await generateWithFallback(client, {
      contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
      config: { temperature: 0.6 },
      callerTag: "רוֹן (כתיבת מאמר SEO & שזירת LSI)",
    });

    const rawText = response.text || "";
    const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    // Sanitize and filter empty FAQs
    const cleanFaqs = (Array.isArray(parsed.faqs) ? parsed.faqs : []).filter(
      (f: any) =>
        f &&
        typeof f.question === "string" &&
        f.question.trim().length > 0 &&
        typeof f.answer === "string" &&
        f.answer.trim().length > 0
    );

    // Robust slug generation
    const safeSlug = transliterateHebrewToSlug(parsed.slug || parsed.title || cleanTopic);

    // Build Schema.org structured data (Article + FAQPage)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
    const canonicalUrl = `${siteUrl}/articles/${safeSlug}`;

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: parsed.title,
      description: parsed.metaDescription,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": canonicalUrl,
      },
      author: {
        "@type": "Person",
        name: "רוֹן - סוכן ה-AI ומומחה הצרכנות של AliDeals",
        url: siteUrl,
      },
      publisher: {
        "@type": "Organization",
        name: "AliDeals ישראל",
        url: siteUrl,
      },
      datePublished: new Date().toISOString(),
      dateModified: new Date().toISOString(),
    };

    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: cleanFaqs.map((faq: any) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };

    const structuredDataJson = JSON.stringify([articleSchema, faqSchema], null, 2);

    addAgentLog(
      "copywriter",
      "רון",
      "success",
      `מאמר SEO נכתב בהצלחה: "${parsed.title}" (אורך קריאה מוערך: ${parsed.estimatedReadTimeMinutes || 5} דק', נשזרו ${parsed.lsiKeywordsWeaved?.length || 0} מונחי LSI).`
    );

    const finalProductIds = Array.isArray(parsed.productIds) && parsed.productIds.length > 0
      ? parsed.productIds
      : candidateProducts.slice(0, 2).map((p) => p.id);

    return {
      title: parsed.title,
      slug: safeSlug,
      metaTitle: parsed.metaTitle || parsed.title.slice(0, 60),
      metaDescription: parsed.metaDescription || parsed.directAnswerGeo.slice(0, 155),
      directAnswerGeo: parsed.directAnswerGeo,
      targetCategory: parsed.targetCategory || category,
      archetype: parsed.archetype || "GENERAL",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [category, "אלי אקספרס", "מדריך"],
      estimatedReadTimeMinutes: parsed.estimatedReadTimeMinutes || 5,
      contentMarkdown: parsed.contentMarkdown,
      lsiKeywordsWeaved: Array.isArray(parsed.lsiKeywordsWeaved) ? parsed.lsiKeywordsWeaved : [],
      pros: Array.isArray(parsed.pros) && parsed.pros.length > 0 ? parsed.pros : [
        "חיסכון ניכר בעלויות ברכישה ישירה מהיצרן",
        "מגוון דגמים רחב ואפשרויות התאמה אישית",
        "משלוחי Choice מהירים עם אחריות לקונה",
      ],
      cons: Array.isArray(parsed.cons) && parsed.cons.length > 0 ? parsed.cons : [
        "מומלץ לשמור על הזמנות מתחת ל-75$ למניעת חיוב במע\"מ",
        "יש לוודא ביקורות אותנטיות ותמונות של רוכשים לפני הזמנה",
      ],
      faqs: cleanFaqs,
      productIds: finalProductIds,
      isEuPlug: parsed.isEuPlug !== undefined ? parsed.isEuPlug : null,
      voltage220vCompatible: parsed.voltage220vCompatible !== undefined ? parsed.voltage220vCompatible : null,
      sizeWarning: parsed.sizeWarning || null,
      fabricComposition: parsed.fabricComposition || null,
      structuredDataJson,
      featuredImageAlt: parsed.featuredImageAlt,
      alonRationale: parsed.alonRationale || "מאמר תוכן אסטרטגי המייצר תנועה אורגנית איכותית ומחזק את ה-Topical Authority של האתר.",
      researchSnapshot: research,
    };
  } catch (err: any) {
    console.warn("Ron full SEO article generation LLM failed, using smart fallback:", err?.message);
    return generateFallbackArticle(cleanTopic, research, category, candidateProducts);
  }
}

// ==========================================
// 5. Helpers: Transliteration, Safe Slugs & AliExpress Matcher
// ==========================================

export function extractAliExpressProductIds(text: string): string[] {
  if (!text || typeof text !== "string") return [];
  const ids = new Set<string>();

  // 1. Matches item URLs: /item/1005006392019482.html or /item/123456789.html
  const itemMatches = text.matchAll(/\/item\/(\d{10,20})(?:\.html|\?|\/|$)/gi);
  for (const match of itemMatches) {
    if (match[1]) ids.add(match[1]);
  }

  // 2. Query param IDs: ?productId=... or &productId=... or ?id=...
  const queryMatches = text.matchAll(/[?&](?:productId|id|itemId)=(\d{10,20})\b/gi);
  for (const match of queryMatches) {
    if (match[1]) ids.add(match[1]);
  }

  // 3. Raw 14 to 18 digit IDs (standard AliExpress product ID format)
  const rawIdMatches = text.matchAll(/\b(1005\d{10,14})\b/g);
  for (const match of rawIdMatches) {
    if (match[1]) ids.add(match[1]);
  }

  return Array.from(ids);
}

const HEBREW_SLUG_DICTIONARY: Record<string, string> = {
  מדריך: "guide",
  מכס: "customs",
  מעמ: "vat",
  "מע\"מ": "vat",
  מידות: "sizes",
  מידה: "size",
  קופונים: "coupons",
  קופון: "coupon",
  משלוח: "shipping",
  משלוחים: "shipping",
  אליאקספרס: "aliexpress",
  "אלי אקספרס": "aliexpress",
  עליאקספרס: "aliexpress",
  "עלי אקספרס": "aliexpress",
  החזר: "refund",
  סכסוך: "dispute",
  מבצעים: "deals",
  מבצע: "deal",
  חשמל: "electronics",
  תקע: "plug",
  שקע: "plug",
  נעליים: "shoes",
  נעלי: "shoes",
  בגדים: "clothes",
  בגד: "clothes",
  איך: "how-to",
  השוואה: "comparison",
  סקירה: "review",
  המלצות: "recommendations",
  מומלץ: "recommended",
  בטוחה: "safe",
  קנייה: "shopping",
  קניות: "shopping",
  ישראל: "israel",
  צויס: "choice",
  "צ'ויס": "choice",
};

const HEBREW_CHAR_MAP: Record<string, string> = {
  א: "a", ב: "b", ג: "g", ד: "d", ה: "h", ו: "v", ז: "z",
  ח: "ch", ט: "t", י: "y", כ: "k", ך: "k", ל: "l", מ: "m",
  ם: "m", נ: "n", ן: "n", ס: "s", ע: "a", פ: "p", ף: "p",
  צ: "ts", ץ: "ts", ק: "k", ר: "r", ש: "sh", ת: "t",
};

export function transliterateHebrewToSlug(text: string): string {
  if (!text) return `guide-${Date.now().toString(36)}`;

  let cleaned = text.trim().toLowerCase();

  // Replace common dictionary phrases
  for (const [heb, eng] of Object.entries(HEBREW_SLUG_DICTIONARY)) {
    cleaned = cleaned.split(heb).join(` ${eng} `);
  }

  // Transliterate Hebrew characters or preserve ASCII
  let result = "";
  for (const char of cleaned) {
    if (HEBREW_CHAR_MAP[char]) {
      result += HEBREW_CHAR_MAP[char];
    } else if (/[a-z0-9]/i.test(char)) {
      result += char.toLowerCase();
    } else if (/[\s\-_/.]/.test(char)) {
      result += "-";
    }
  }

  // Clean dashes
  result = result
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  if (result.length < 3) {
    return `guide-${Date.now().toString(36)}`;
  }

  return result.slice(0, 60);
}

export async function getUniqueSlug(baseSlug: string, existingPageId?: string): Promise<string> {
  const cleanBase = transliterateHebrewToSlug(baseSlug);
  let candidate = cleanBase;
  let counter = 2;

  // Protect against infinite loop
  for (let i = 0; i < 50; i++) {
    let existingPage = null;
    try {
      if (supabaseDb.isConfigured()) {
        existingPage = await supabaseDb.getPageBySlug(candidate);
      } else {
        existingPage = jsonDb.getPageBySlug(candidate);
      }
    } catch {
      // Ignore lookup errors
    }

    // Safe if no page exists with this slug, or if it is the EXACT same page being updated!
    if (!existingPage || (existingPageId && existingPage.id === existingPageId)) {
      return candidate;
    }

    // Collision detected: append counter
    candidate = `${cleanBase}-${counter}`;
    counter++;
  }

  return `${cleanBase}-${Date.now().toString(36)}`;
}

// ==========================================
// 6. Step 3: Save to Database (Supabase + Local)
// ==========================================

export async function saveRonSeoArticleToDb(
  article: RonSeoArticleOutput,
  status: "published" | "draft" = "published"
): Promise<{ success: boolean; pageId: string; slug: string; publicUrl: string }> {
  const pageId = article.pageId || `page_article_${Date.now()}`;
  const now = new Date().toISOString();

  // Robust transliteration & collision-free slug
  const rawSlugCandidate = article.slug || article.title;
  const slug = await getUniqueSlug(rawSlugCandidate, pageId);

  // Sanitize and filter empty FAQs
  const cleanFaqs = (article.faqs || []).filter(
    (f) =>
      f &&
      typeof f.question === "string" &&
      f.question.trim().length > 0 &&
      typeof f.answer === "string" &&
      f.answer.trim().length > 0
  );

  const cleanPros = (article.pros || []).filter((p) => typeof p === "string" && p.trim().length > 0);
  const cleanCons = (article.cons || []).filter((c) => typeof c === "string" && c.trim().length > 0);
  const cleanTags = (article.tags || []).filter((t) => typeof t === "string" && t.trim().length > 0);

  const pageRecord: PageRecord = {
    id: pageId,
    slug,
    type: "article",
    title: article.title,
    metaTitle: article.metaTitle,
    metaDescription: article.metaDescription,
    directAnswerGeo: article.directAnswerGeo,
    contentMarkdown: article.contentMarkdown,
    structuredDataJson: article.structuredDataJson,
    featuredImage: article.featuredImage || null,
    targetCategory: article.targetCategory,
    archetype: article.archetype || "GENERAL",
    tags: cleanTags,
    pros: cleanPros,
    cons: cleanCons,
    faqs: cleanFaqs,
    productIds: JSON.stringify(article.productIds || []),
    isEuPlug: article.isEuPlug !== undefined ? article.isEuPlug : null,
    voltage220vCompatible: article.voltage220vCompatible !== undefined ? article.voltage220vCompatible : null,
    sizeWarning: article.sizeWarning || null,
    fabricComposition: article.fabricComposition || null,
    alonRationale: article.alonRationale || null,
    status,
    viewsCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  // 1. Save to Supabase (primary)
  try {
    if (supabaseDb.isConfigured()) {
      await supabaseDb.upsertPage(pageRecord);
    }
  } catch (dbErr) {
    console.warn("Failed saving article to Supabase, fallback to jsonDb:", dbErr);
  }

  // 2. Save to JSON DB (fallback / sync)
  try {
    jsonDb.upsertPage(pageRecord);
  } catch (jsonErr) {
    console.warn("Failed saving article to jsonDb:", jsonErr);
  }

  // 3. Revalidate Next.js cache
  try {
    revalidatePath("/");
    revalidatePath("/articles");
    revalidatePath(`/articles/${slug}`);
    revalidatePath("/admin/pages");
  } catch {}

  addAgentLog(
    "orchestrator",
    "אלון",
    "success",
    `מאמר ה-SEO של רון פורסם באתר: "${article.title}" בכתובת /articles/${slug} (סטטוס: ${status}).`
  );

  return {
    success: true,
    pageId,
    slug,
    publicUrl: `/articles/${slug}`,
  };
}

function generateFallbackKeywordResearch(
  term: string,
  category: string,
  audience: string
): RonKeywordResearch {
  return {
    primaryKeyword: term,
    searchIntent: "informational",
    targetAudience: audience,
    lsiKeywords: [
      `${term} באלי אקספרס`,
      `${term} לישראל`,
      "קניות באלי אקספרס",
      "מדריך אלי אקספרס",
      "פטור ממכס 75 דולר",
      "מע\"מ אלי אקספרס",
      "זמני משלוח אלי אקספרס",
      "איך להזמין מאלי אקספרס",
      "קופונים אלי אקספרס",
      "החזר כספי אלי אקספרס",
      "שקע אירופאי EU plug",
      "AliExpress Choice ישראל",
      "ביקורות קונים אלי אקספרס",
      "מספר מעקב דואר ישראל",
      "קנייה בטוחה ברשת",
    ],
    semanticEntities: [
      "AliExpress Standard Shipping",
      "AliExpress Choice",
      "דואר ישראל",
      "רשות המסים בישראל",
      "תקן שקע אירופאי EU",
      "הגנת הקונה Buyer Protection",
    ],
    peopleAlsoAsk: [
      `איך עובד ${term} בקניות מאלי אקספרס?`,
      "האם יש תשלום מכס או מע\"מ נוסף בהגעה לישראל?",
      "תוך כמה זמן החבילה מגיעה לארץ?",
      "איך ניתן לקבל שירות לקוחות והחזר כספי בעת בעיה?",
    ],
    suggestedHeadings: [
      {
        level: "h2",
        title: `מה חשוב לדעת על ${term} לפני שמזמינים?`,
        targetLsi: [`${term} באלי אקספרס`, "קניות באלי אקספרס", "מדריך אלי אקספרס"],
      },
      {
        level: "h2",
        title: "המדריך המלא שלב אחר שלב: כך תעשו את זה נכון",
        targetLsi: ["איך להזמין מאלי אקספרס", "AliExpress Choice ישראל"],
      },
      {
        level: "h2",
        title: "דגשים קריטיים לצרכן הישראלי: מכס, משלוחים ותקנים",
        targetLsi: ["פטור ממכס 75 דולר", "מע\"מ אלי אקספרס", "זמני משלוח אלי אקספרס", "שקע אירופאי EU plug"],
      },
      {
        level: "h2",
        title: "שאלות נפוצות ותשובות (FAQ)",
        targetLsi: ["החזר כספי אלי אקספרס", "מספר מעקב דואר ישראל"],
      },
      {
        level: "h2",
        title: "השורה התחתונה של רון: המלצות סיכום",
        targetLsi: ["קנייה בטוחה ברשת", "קופונים אלי אקספרס"],
      },
    ],
    seoDifficulty: "medium",
    searchVolumePotential: "high",
    strategyNotes: `המאמר מתמקד בביטוי "${term}" עם דגש על שאלות נפוצות וכוונת חיפוש של קונים מישראל. שימוש במבנה היררכי מושלם מאפשר זכייה ב-Direct Answer וב-Featured Snippets בגוגל.`,
  };
}

function generateFallbackArticle(
  topic: string,
  research: RonKeywordResearch,
  category: string,
  candidateProducts: Array<{ id: string; title: string }> = []
): RonSeoArticleOutput {
  const primary = research.primaryKeyword || topic;
  const slug = transliterateHebrewToSlug(`guide-${primary}`);

  const title = `${primary} באלי אקספרס: המדריך המלא והמעודכן לקונים בישראל 2026`;
  const metaTitle = `${primary} באלי אקספרס - מדריך מעשי, טיפים וחיסכון 2026`;
  const metaDescription = `כל מה שצריך לדעת על ${primary} באלי אקספרס: טיפים פרקטיים, בדיקת מכס ומע\"מ לישראל, שיטות משלוח מומלצות והמלצות של רון לקנייה חכמה.`;
  const directAnswerGeo = `${primary} באלי אקספרס מאפשר לצרכנים ישראלים ליהנות מחיסכון משמעותי ומגוון עצום. כדי להזמין בצורה בטוחה וחסכונית, חשוב להקפיד על רכישה מחנויות בדירוג 95%+, לוודא שערך החבילה נמוך מ-75$ לפטור מלא ממכס ומע\"מ, ולבחור במשלוח AliExpress Standard Shipping.`;

  const isElectronics =
    category.includes("אלקטרוניקה") ||
    primary.includes("חשמל") ||
    primary.includes("אוזניות") ||
    primary.includes("מטען") ||
    primary.includes("סלולר") ||
    primary.includes("שקע");

  const isFashion =
    category.includes("אופנה") ||
    category.includes("הנעלה") ||
    primary.includes("בגדים") ||
    primary.includes("נעליים") ||
    primary.includes("מידות");

  const archetype = isElectronics ? "ELECTRONICS" : isFashion ? "FASHION" : "GENERAL";
  const isEuPlug = isElectronics ? true : null;
  const voltage220vCompatible = isElectronics ? true : null;
  const sizeWarning = isFashion
    ? "מידות אסייתיות קטנות ב-1-2 מידות מהמקובל בישראל. חובה למדוד בס\"מ לפי טבלת המוכר."
    : null;
  const fabricComposition = isFashion ? "כותנה מעורבת בפוליאסטר נושם" : null;

  const pros = [
    `חיסכון של 40%-70% בעלויות בהשוואה למחירים המקומיים בישראל עבור ${primary}`,
    "מגוון עצום של דגמים, מפרטים ויצרנים ישירים עם חוות דעת מצולמות",
    "משלוחי Choice מהירים יחסית (7 עד 14 ימי עסקים) לנקודות חלוקה ולוקרים",
    "הגנת קונה מלאה (Buyer Protection) ומנגנון החזר כספי במקרה של תקלה",
  ];

  const cons = [
    "יש להקפיד על שווי חבילה כולל משלוח עד 75$ לפטור מלא ממע\"מ (17%) ומכס",
    isElectronics
      ? "במוצרי חשמל חובה לבחור שקע EU ולוודא תמיכה במתח 220V ובתדר 50Hz"
      : "החזרת פריטים שאינם Choice לסין כרוכה בדמי משלוח וזמן המתנה",
    isFashion
      ? "אסור להסתמך על אותיות מידה (M/L/XL) – יש לבדוק תמיד היקפים בסנטימטרים"
      : "זמני האספקה עלולים להתארך בעונות מבצעים עמוסות כגון חגי נובמבר",
  ];

  const embeddedProductSection =
    candidateProducts.length > 0
      ? `\n\n### מוצר מומלץ שנבדק על ידי רוֹן:\n[product:${candidateProducts[0].id}]\n`
      : "";

  const contentMarkdown = `## נעים להכיר: מה צריך לדעת על ${primary}?
אם אתם קונים באופן קבוע באלי אקספרס או מתכננים הזמנה בקרוב, הנושא של **${primary}** הוא אחד הדברים החשובים ביותר שמשפיעים על הצלחת הרכישה שלכם, על זמני המשלוח, וכמובן – על הכיס שלכם.

קנייה חכמה באלי אקספרס אינה עניין של מזל, אלא של היכרות עם הכללים הנכונים. במדריך זה ריכזנו עבורכם את כל הידע המעשי, הטיפים והדגשים שיעזרו לכם להזמין בביטחון מלא.${embeddedProductSection}

---

## צ'קליסט קנייה חכמה של רון: ${primary}
- [x] בדיקת ותק החנות (שנה לפחות) וציון שביעות רצון של 95% ומעלה
- [x] בדיקה שערך החבילה הכולל אינו עולה על 75$ למניעת חיוב במע"מ
- [x] קריאת 5 ביקורות אחרונות הכוללות תמונות אותנטיות של רוכשים
- [x] בחירה בשיטת משלוח AliExpress Standard Shipping או AliExpress Choice
${isElectronics ? "- [x] וידוא בחירת שקע אירופאי (EU Plug) ותמיכה במתח 220V/50Hz\n" : ""}${isFashion ? "- [x] השוואת מידות בס\"מ מול סרגל המוכר ולא להסתמך על S/M/L\n" : ""}- [x] הפעלת קופוני חנות ושימוש במטבעות (Coins) בקופה

---

## 3 הכללים החשובים ביותר לקנייה בטוחה
כדי להבטיח שתקבלו בדיוק את מה שהזמנתם וללא הפתעות לא נעימות, הנה שלושת הדגשים המובילים של רוֹן:

1. **בדיקת דירוג החנות והוותק:** חפשו חנויות עם ותק של שנה לפחות וציון שביעות רצון מעל 95% (Positive Feedback).
2. **קריאת ביקורות עם תמונות אמיתיות:** אל תסתפקו בתמונות השיווקיות של המוכר. בדקו תמיד חוות דעת של רוכשים אמיתיים שהעלו תמונות של הפריט שקיבלו.
3. **בחירה בשירותי Choice ומשלוח מנוהל:** מוצרים המסומנים בתווית **AliExpress Choice** נשלחים ישירות ממחסני עלי אקספרס, מגיעים מהר יותר וזכאים להחזרה מקומית חינם.

> 💡 **טיפ של רון:** תמיד שמרו צילום מסך של תיאור המוצר והמחיר ביום ההזמנה. אם המוצר יגיע פגום או לא תואם, צילום זה יהווה הוכחה מנצחת בעת פתיחת סכסוך (Dispute).

> ⚠️ **אזהרת צרכנות:** היזהרו ממוכרים חדשים שמציעים מחירים נמוכים באופן חריג ללא היסטוריית מכירות. אם מחיר נראה טוב מכדי להיות אמיתי – ברוב המקרים מדובר בחיקוי או בטעות.

---

## מדריך מכס, מע״מ ומיסים לקונים בישראל
אחת השאלות הנפוצות ביותר בקרב קונים בישראל קשורה לעלויות נוספות בכניסה לארץ:

| פרמטר | עד $75 | מעל $75 |
| :--- | :--- | :--- |
| **פטור ממע״מ (17%)** | ✓ פטור מלא | חייב במע״מ |
| **מכס ומס קנייה** | ✓ פטור מלא | פטור מרוב המוצרים עד 500$ (למעט חריגים) |
| **עמלות שחרור חבילה** | בדרך כלל ללא עמלה | עשויות לחול עמלות שחרור וטיפול |

*המלצת רון:* אם אתם רוכשים מספר פריטים שערכם הכולל עולה על 75$, מומלץ לפצל את ההזמנות בהפרש של 48 שעות לפחות כדי למנוע איחוד חבילות במכס.

---

## שיטות משלוח מומלצות לישראל
- **AliExpress Standard Shipping:** שיטת המשלוח המומלצת ביותר. החבילה מגיעה לרוב תוך 7 עד 14 ימי עסקים עם מספר מעקב מלא הניתן לאיתור באפליקציה ובאתר דואר ישראל.
- **משלוחי Choice:** מגיעים במהירות גבוהה לנקודות חלוקה קרובות לביתכם (לוקרים או חנויות שכונתיות).

---

## השורה התחתונה של רון
${directAnswerGeo}
קנייה נבונה מתחילה בתשומת לב לפרטים הקטנים. עקבו אחרי ההנחיות במדריך זה, ותיהנו ממוצרים מעולים במחירים הנמוכים בעשרות אחוזים מהארץ!
`;

  const faqs = [
    {
      question: `האם קנייה הקשורה ל-${primary} בטוחה באלי אקספרס?`,
      answer: "כן, כל עוד מקפידים לרכוש ממוכרים בעלי ציון 95%+ ומשתמשים במנגנון התשלום הרשמי של האתר המוגן תחת Buyer Protection.",
    },
    {
      question: "האם יש תשלום מכס או מע\"מ נוסף בהגעה לארץ?",
      answer: "כל חבילה ששוויה נמוך מ-75 דולר (כולל עלות המשלוח אם ישנה) פטורה לחלוטין ממע\"מ ומכס בישראל.",
    },
    {
      question: "תוך כמה זמן המשלוח מגיע לישראל?",
      answer: "זמן האספקה הממוצע בשיטת AliExpress Standard Shipping עומד על 7 עד 14 ימי עסקים לנקודת חלוקה סמוכה לביתכם.",
    },
    {
      question: "מה עושים אם הפריט לא הגיע או הגיע פגום?",
      answer: "פותחים סכסוך (Dispute) באפליקציית עלי אקספרס, מצרפים תמונות או סרטון קצר הממחישים את הבעיה, וברוב המכריע של המקרים מקבלים זיכוי כספי מלא תוך ימים ספורים.",
    },
  ];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
  const canonicalUrl = `${siteUrl}/articles/${slug}`;
  const structuredDataJson = JSON.stringify(
    [
      {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: title,
        description: metaDescription,
        mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
        author: { "@type": "Person", name: "רוֹן - סוכן ה-AI ומומחה הצרכנות של AliDeals", url: siteUrl },
      },
      {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.question,
          acceptedAnswer: { "@type": "Answer", text: f.answer },
        })),
      },
    ],
    null,
    2
  );

  return {
    title,
    slug,
    metaTitle,
    metaDescription,
    directAnswerGeo,
    targetCategory: category,
    archetype,
    tags: [category, "אלי אקספרס", "מדריך צרכנות", "קניות ברשת"],
    estimatedReadTimeMinutes: 5,
    contentMarkdown,
    lsiKeywordsWeaved: research.lsiKeywords.slice(0, 10).map((k) => ({
      keyword: k,
      count: 2,
      section: "גוף המאמר והכותרות",
    })),
    pros,
    cons,
    faqs,
    productIds: candidateProducts.slice(0, 2).map((p) => p.id),
    isEuPlug,
    voltage220vCompatible,
    sizeWarning,
    fabricComposition,
    structuredDataJson,
    featuredImageAlt: `${title} - מדריך קנייה רשמי מבית AliDeals ישראל`,
    alonRationale: "מאמר תוכן אסטרטגי המייצר סמכות נושאית (Topical Authority) ודירוג אורגני בגוגל עבור ביטוי החיפוש הראשי.",
    researchSnapshot: research,
  };
}
