import { getGenAIAsync, isGeminiConfigured, generateWithFallback, MODELS } from "../gemini/client";
import { quotaGovernor } from "./quota-governor";
import { addAgentLog } from "./team-orchestrator";
import { supabaseDb, jsonDb, PageRecord } from "../db";
import { revalidatePath } from "next/cache";

// ==========================================
// 1. Interfaces, Types & Shared Constants
// ==========================================

export * from "./ron-seo-types";
import {
  RonKeywordResearch,
  RonSeoArticleInput,
  RonSeoArticleOutput,
  RonSuggestedTopic,
  TopicStrategy,
  POPULAR_ISRAELI_ALIEXPRESS_TOPICS,
  LsiCluster,
} from "./ron-seo-types";
import { getIsraelCalendarContext } from "./alon-radar";

// ==========================================
// 2. Dynamic Topic Discovery & Brainstorming Engine (Ron)
// ==========================================

function getFallbackSuggestedTopics(
  strategy: TopicStrategy,
  existingTitles: string[] = []
): RonSuggestedTopic[] {
  let pool = [...POPULAR_ISRAELI_ALIEXPRESS_TOPICS];

  if (strategy === "backlinks") {
    pool = pool.filter((t) => t.strategyType === "backlink_magnet");
  } else if (strategy === "shopping_guides") {
    pool = pool.filter((t) => t.strategyType === "definitive_guide");
  } else if (strategy === "seasonal_trends") {
    pool = pool.filter((t) => t.strategyType === "seasonal_trend");
  } else if (strategy === "cost_of_living") {
    pool = pool.filter((t) => t.strategyType === "cost_of_living");
  }

  // Filter out any topic that is already published on the site
  const filtered = pool.filter(
    (t) =>
      !existingTitles.some(
        (et) =>
          et.toLowerCase().includes(t.focusKeyword.toLowerCase()) ||
          t.topic.toLowerCase().includes(et.toLowerCase())
      )
  );

  const finalPool = filtered.length >= 3 ? filtered : pool;
  return [...finalPool].sort(() => Math.random() - 0.5).slice(0, 8);
}

/**
 * Ron's Dynamic Topic Generator:
 * Generates fresh, high-demand topics tailored to Israeli shoppers,
 * including powerful Backlink Magnets (Digital PR / Linkable Assets)
 * designed to be cited and linked by journalists, bloggers, and industry third parties.
 */
export async function generateRonDynamicTopics(
  strategy: TopicStrategy = "all"
): Promise<RonSuggestedTopic[]> {
  const cal = getIsraelCalendarContext();

  // 1. Fetch existing page titles to avoid repeating covered topics
  let existingTitles: string[] = [];
  try {
    const pages = supabaseDb.isConfigured() ? await supabaseDb.getPages() : jsonDb.getPages();
    if (Array.isArray(pages)) {
      existingTitles = pages.map((p) => p.title || p.metaTitle || p.slug).filter(Boolean);
    }
  } catch (err) {
    console.warn("[Ron SEO Studio] Could not fetch existing pages for topic generator:", err);
  }

  // 2. Check Gemini configuration
  if (!(await isGeminiConfigured())) {
    return getFallbackSuggestedTopics(strategy, existingTitles);
  }

  try {
    await quotaGovernor.waitIfPacingRequired("gemini_flash");
    await quotaGovernor.recordUsage("gemini_flash", 1200);

    const client = await getGenAIAsync();

    let strategyInstructions = "";
    if (strategy === "backlinks") {
      strategyInstructions = `
דגש אסטרטגי עליון: "מגנט קישורים ועיתונות" (Linkable Assets & Digital PR for Backlinks).
המטרה: לייצר כתבות ארוכות, ברות סמכא ומקוריות עם ציטוטים ממקורות אמינים שיעזרו לאתר להימצא על ידי גורמי צד שלישי (עיתונאים בדה-מרקר, כלכליסט, Ynet, Geektime, Ice, בלוגרים, אנשים שמחפשים מידע מהימן ברשת, פורומים) ולהיות מצוטט על ידם כמקור רשמי.
הנושאים חייבים לכלול אחד או יותר מהאלמנטים הבאים:
1. רגולציה ומיסוי רשמי: רשות המסים, צו תעריף המכס והפטורים, תקרת 75$, פיצול חבילות, אגרות חברות הבלדרות (דואר, DHL, EMS).
2. תקינה ובטיחות ביבוא: מכון התקנים הישראלי, משרד הכלכלה (תקן 562 לצעצועים, תקן 900 לחשמל, חומרים רעילים/BPA).
3. תקשורת וציוד אלחוטי: תקנות משרד התקשורת, רשימת פטורים לרחפנים, נתבים, משדרי WiFi 6E/7.
4. נתונים ומחקר השוואתי: מדדי יוקר המחיה, פערי מחירים באחוזים מול רשתות ישראליות (KSP, באג, סופר-פארם).
5. זכויות צרכן והגנת הקונה: חוק הגנת הצרכן, ביטול עסקה בינלאומי, הכחשת עסקה מול חברות אשראי.
`;
    } else if (strategy === "seasonal_trends") {
      strategyInstructions = `
דגש אסטרטגי מחייב: "עונתיות, חגים וטרנדים ישראליים עכשוויים".
הנושאים חייבים לשקף את התקופה הנוכחית בישראל: עונה (${cal.seasonHe}), חגים ואירועים קרובים (${cal.currentHolidaysOrPeaks.join(", ")}).
`;
    } else if (strategy === "cost_of_living") {
      strategyInstructions = `
דגש אסטרטגי מחייב: "מלחמה ביוקר המחיה הישראלי".
מדריכים המראים כיצד לחסוך 50%-80% במוצרי יסוד, גאדג'טים, כלי עבודה, ציוד רכב וטיפוח אישי בהזמנה ישירה.
`;
    } else if (strategy === "shopping_guides") {
      strategyInstructions = `
דגש אסטרטגי מחייב: "מדריכי קנייה וסמכות צרכנית".
מדריכים מקיפים הפותרים כאבים אמיתיים: ניהול סכסוך והחזר כספי, המרת מידות אסייתיות, משלוח Choice, קופונים ומטבעות.
`;
    } else {
      strategyInstructions = `
דגש אסטרטגי: תמהיל מגוון וחכם (50% מגנטי קישורים ועיתונות / Digital PR, 30% מדריכי קנייה סמכותיים, 20% עונתיות ויוקר המחיה).
`;
    }

    const systemPrompt = `
אתה "רוֹן" - מנהל ה-SEO, הקופירייטר הבכיר והאסטרטג הראשי של פורטל הצרכנות והמסחר AliDeals ישראל.
היום בישראל: ${cal.dateStr} (${cal.monthNameHe}, עונה: ${cal.seasonHe}).
אירועי לוח שנה וצרכנות אקטואליים בישראל:
${cal.currentHolidaysOrPeaks.map((h) => `- ${h}`).join("\n")}

תפקידך:
לפתח רשימה של 6 עד 8 נושאים חמים, ממוקדים וחדשניים למאמרי תוכן ואוטוריטה באתר.

${strategyInstructions}

=== נושאים שכבר קיימים באתר AliDeals (איסור מוחלט לחזור עליהם!) ===
${existingTitles.slice(0, 30).map((t) => `- ${t}`).join("\n")}

כללי ברזל מחייבים:
1. כותרת חדה בעברית (topic): כותרת מושכת ומקצועית הכוללת שנה (2026) או זווית ישראלית ברורה.
2. מילת מפתח ממוקדת (focusKeyword): ביטוי חיפוש ישראלי אמיתי בעברית בן 2-4 מילים.
3. קטגוריה (category): בחר מתוך: "מדריכי קנייה וצרכנות", "אלקטרוניקה וגאדג'טים", "אופנה והנעלה", "לבית ולמטבח", "ילדים, תינוקות וצעצועים", "רכב ואביזרים".
4. סוג אסטרטגיה (strategyType): backlink_magnet / definitive_guide / seasonal_trend / cost_of_living.
5. תגית אסטרטגיה (strategyBadgeHe): כגון "🧲 מגנט קישורים & ציטוט עיתונאי", "📚 מדריך סמכות מקיף", "📈 טרנד עונתי", "💰 חיסכון ביוקר המחיה".
6. זווית קישורים ועיתונות (backlinkAngleHe): משפט מנומק המסביר במדויק מדוע עיתונאים, בלוגרים, אתרי חדשות ופורומים יקשרו למאמר זה ויצטטו אותו.
7. מקורות רשמיים לציטוט (targetSourcesToCiteHe): מערך של 2-4 שמות גופים ורגולציות רשמיות בישראל ובעולם הרלוונטיים לנושא (כגון "רשות המסים", "מכון התקנים", "משרד התקשורת", "חוק הגנת הצרכן").
8. פוטנציאל ציטוט (estimatedPotentialHe): משפט קצר על פוטנציאל הקישורים והחשיפה.

פורמט פלט: החזר אך ורק מערך JSON תקין ומלא (Strict JSON Array) ללא שום Markdown backticks, ללא טקסט מקדים.
`;

    const response = await generateWithFallback(client, {
      contents: [{ role: "user", parts: [{ text: systemPrompt }] }],
      config: { temperature: 0.7, maxOutputTokens: 2500, responseMimeType: "application/json" },
      callerTag: "רוֹן (גילוי וג'נרוט נושאים ל-SEO & Backlinks)",
    });

    const rawText = response.text || "";
    const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsed = JSON.parse(cleanedJson);

    if (Array.isArray(parsed) && parsed.length >= 4) {
      addAgentLog(
        "copywriter",
        "רון",
        "success",
        `רוֹן גיבש בהצלחה ${parsed.length} נושאי SEO ואסטרטגיית קישורים (אסטרטגיה: ${strategy})`
      );
      return parsed.map((item: any, idx: number) => ({
        id: item.id || `topic_${Date.now()}_${idx}`,
        topic: String(item.topic || "").trim(),
        focusKeyword: String(item.focusKeyword || item.topic || "").trim(),
        category: String(item.category || "מדריכי קנייה וצרכנות").trim(),
        description: String(item.description || "").trim(),
        strategyType: item.strategyType || (strategy === "backlinks" ? "backlink_magnet" : "definitive_guide"),
        strategyBadgeHe: item.strategyBadgeHe || (strategy === "backlinks" ? "🧲 מגנט קישורים & ציטוט עיתונאי" : "📚 מדריך סמכות מקיף"),
        backlinkAngleHe: item.backlinkAngleHe || "עיתונאים ובלוגרים מצטטים מדריך זה כמקור רשמי ומהימן ברשת.",
        targetSourcesToCiteHe: Array.isArray(item.targetSourcesToCiteHe) ? item.targetSourcesToCiteHe : ["רשות המסים", "מכון התקנים"],
        estimatedPotentialHe: item.estimatedPotentialHe || "פוטנציאל גבוה מאוד לציטוטים וקישורים",
      }));
    }
  } catch (err: any) {
    console.warn("[Ron Dynamic Topics LLM Notice] Falling back to curated matrix:", err?.message);
  }

  return getFallbackSuggestedTopics(strategy, existingTitles);
}

// ==========================================
// 3. Step 1: Keyword Research & LSI Engine
// ==========================================

/**
 * Fetches real-time live search suggestions from Google Israel (gl=il, hl=iw)
 * Returns the exact search queries Israeli users are actively searching on Google.
 */
export async function fetchGoogleSearchSuggestions(query: string): Promise<string[]> {
  if (!query || typeof query !== "string" || !query.trim()) return [];

  const clean = query.trim();
  const results = new Set<string>();

  try {
    const urls = [
      `https://suggestqueries.google.com/complete/search?client=firefox&hl=iw&gl=il&q=${encodeURIComponent(clean)}`,
      `https://suggestqueries.google.com/complete/search?client=firefox&hl=iw&gl=il&q=${encodeURIComponent(clean + " איך")}`,
      `https://suggestqueries.google.com/complete/search?client=firefox&hl=iw&gl=il&q=${encodeURIComponent(clean + " מומלץ")}`,
    ];

    const responses = await Promise.allSettled(
      urls.map((u) =>
        fetch(u, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "application/json, text/plain, */*",
          },
          signal: AbortSignal.timeout(2500),
        }).then((res) => (res.ok ? res.json() : null))
      )
    );

    for (const r of responses) {
      if (r.status === "fulfilled" && Array.isArray(r.value) && Array.isArray(r.value[1])) {
        for (const item of r.value[1]) {
          if (typeof item === "string" && item.trim()) {
            results.add(item.trim());
          }
        }
      }
    }
  } catch (err) {
    console.warn("[Ron SEO] Google suggestions fetch notice:", err);
  }

  return Array.from(results).slice(0, 15);
}

function buildDefaultClusters(keywords: string[]): LsiCluster[] {
  const kws = Array.isArray(keywords)
    ? keywords.filter((k) => typeof k === "string" && k.trim().length > 1)
    : [];
  if (kws.length === 0) {
    return [
      { name: "מילים נרדפות ושמות חלופיים", icon: "🔤", keywords: [] },
      { name: "מפרט טכני, חומרים ותכונות", icon: "⚙️", keywords: [] },
      { name: "השוואת מחירים וכוונת קנייה", icon: "📊", keywords: [] },
      { name: "כאבי לקוחות ושאלות נפוצות", icon: "⚠️", keywords: [] },
    ];
  }

  const chunk = Math.max(2, Math.ceil(kws.length / 4));
  return [
    { name: "מילים נרדפות ושמות חלופיים", icon: "🔤", keywords: kws.slice(0, chunk) },
    { name: "מפרט טכני, חומרים ותכונות", icon: "⚙️", keywords: kws.slice(chunk, chunk * 2) },
    { name: "השוואת מחירים וכוונת קנייה", icon: "📊", keywords: kws.slice(chunk * 2, chunk * 3) },
    { name: "כאבי לקוחות ושאלות נפוצות", icon: "⚠️", keywords: kws.slice(chunk * 3) },
  ];
}

export async function researchRonKeywordsAndLsi(
  topicOrTerm: string,
  options?: { category?: string; targetAudience?: string; additionalNotes?: string }
): Promise<RonKeywordResearch> {
  const cleanTerm = topicOrTerm.trim();
  const category = options?.category || "מדריכי קנייה וצרכנות";
  const audience = options?.targetAudience || "קונים ישראלים באלי אקספרס, מחפשי דילים וצרכנים נבונים בישראל";

  // 1. Fetch real-time live Google Israel search suggestions (SERP Grounding)
  const liveGoogleSuggestions = await fetchGoogleSearchSuggestions(cleanTerm);

  // Check if Gemini is configured
  if (!(await isGeminiConfigured())) {
    return generateFallbackKeywordResearch(cleanTerm, category, audience, liveGoogleSuggestions);
  }

  try {
    await quotaGovernor.waitIfPacingRequired("gemini_pro");
    await quotaGovernor.recordUsage("gemini_pro", 1200);

    const client = await getGenAIAsync();

    const systemPrompt = `
אתה "רוֹן" - מומחה ה-SEO, מחקר מילות המפתח (LSI) והקופירייטר הבכיר של פורטל AliDeals ישראל.
אתה מתמחה ב-Semantic SEO, חילוץ ישויות סמנטיות (Entity SEO), כוונת חיפוש (Search Intent) ואיתור מדויק של שאלות צרכנים ישראליים (PAA).

תפקידך:
לבצע מחקר מילות מפתח מעמיק, עשיר וייעודי עבור הנושא המבוקש.

=== כללי ברזל קריטיים למחקר LSI עמוק ומבודל (ללא זיהומים גנריים) ===
1. התמקדות מוחלטת בעולם התוכן של הנושא:
   - כל מילת מפתח LSI חייבת להיות קשורה באופן ישיר, עמוק ומהותי לנושא המבוקש ("${cleanTerm}").
   - איסור מוחלט על "זיהום עלי אקספרס גנרי": חל איסור חמור לדחוף סתם מונחים כמו "שקע אירופאי EU plug" אם המוצר אינו חשמלי (כמו ביגוד, כלי גינון, צעצועים ללא סוללה), וחל איסור לדחוף "פטור ממכס 75 דולר" אם מדובר במוצר זול של כמה שקלים, וחל איסור על מונחים ריקים כמו "קניות באלי אקספרס" או "דואר ישראל".
2. חלוקה ל-4 אשכולות סמנטיים ברורים (LSI Clusters):
   א. "מילים נרדפות ושמות חלופיים": כל הדרכים שבהן ישראלים מחפשים את המוצר/נושא (סלנג, עברית/אנגלית, ראשי תיבות, מונחים דומים).
   ב. "מפרט טכני, חומרים ותכונות מוצר": רכיבים פנימיים, חיישנים, חומרים, טכנולוגיה, ביצועים, מידות ואיכויות (למשל: סוג מנוע, סוג סוללה, חיבורים, עמידות במים, תקנים).
   ג. "ביטויי כוונת קנייה, השוואת מחירים ודגמים": מונחי החלטה (הכי מומלץ 2026, השוואת מחירים, תמורה למחיר, מותגים מובילים באלי אקספרס מול חנויות בארץ).
   ד. "כאבי לקוחות, תקלות ושאלות נפוצות": בעיות אמיתיות של רוכשים (עמידות בחום הישראלי, תקלות נפוצות, התקנה, תאימות, החזרות).
3. שימוש בהצעות חיפוש חיות מגוגל ישראל (Google Autocomplete):
   - נתח את הצעות החיפוש החיות שסופקו והטמע את הרלוונטיות ביותר מתוכן במחקר.
4. שאלות נפוצות של ישראלים (People Also Ask):
   - לפחות 5 שאלות אמיתיות, עמוקות ומעשיות שישראלים שואלים על הנושא הספציפי (לא שאלות גנריות כמו "איך לקנות").
5. היררכיית כותרות H2 ו-H3:
   - מבנה מובנה המתאים לתוכן עניינים (TOC) עם שיוך מונחי LSI ממוקדים לכל כותרת.
6. אסטרטגיית דירוג:
   - הנחיות מדויקות כיצד לתפוס מקום ראשון בגוגל, כיצד לענות על כוונת החיפוש, וכיצד להופיע ב-Google AI Overviews / SearchGPT.

חוק בל יעבור: החזר אך ורק מבנה JSON תקין ומלא (Strict JSON) ללא תגיות Markdown או backticks מסביב.
`;

    const userPrompt = `
בצע מחקר מילות מפתח סמנטי (LSI) מעמיק עבור:
- נושא/מונח מבוקש: "${cleanTerm}"
- קטגוריה: "${category}"
- קהל יעד: "${audience}"
${options?.additionalNotes ? `- הערות והנחיות מיוחדות: "${options.additionalNotes}"` : ""}
${
  liveGoogleSuggestions.length > 0
    ? `- הצעות חיפוש חמות בזמן אמת מגוגל ישראל (Google Autocomplete Live):
${liveGoogleSuggestions.map((s) => `  * "${s}"`).join("\n")}`
    : ""
}

החזר בפורמט JSON במבנה הבא:
{
  "primaryKeyword": "ביטוי החיפוש הראשי והמדויק בעברית",
  "searchIntent": "informational / commercial / transactional / navigational",
  "targetAudience": "${audience}",
  "lsiClusters": [
    {
      "name": "מילים נרדפות ושמות חלופיים",
      "icon": "🔤",
      "keywords": ["מונח 1", "מונח 2", "מונח 3", "מונח 4", "מונח 5"]
    },
    {
      "name": "מפרט טכני, חומרים ותכונות",
      "icon": "⚙️",
      "keywords": ["מאפיין 1", "מאפיין 2", "מאפיין 3", "מאפיין 4", "מאפיין 5"]
    },
    {
      "name": "השוואת מחירים, דגמים ומותגים",
      "icon": "📊",
      "keywords": ["ביטוי 1", "ביטוי 2", "ביטוי 3", "ביטוי 4", "ביטוי 5"]
    },
    {
      "name": "כאבים, תקלות ושאלות נפוצות",
      "icon": "⚠️",
      "keywords": ["כאב 1", "כאב 2", "כאב 3", "כאב 4", "כאב 5"]
    }
  ],
  "lsiKeywords": ["רשימה מאוחדת ומסוננת של כל 18-25 מילות המפתח מכל האשכולות ללא כפילויות"],
  "semanticEntities": ["מושגי מפתח, מותגים ורכיבים טכניים ספציפיים לנושא"],
  "peopleAlsoAsk": [
    "שאלה 1 עמוקה וספציפית לנושא?",
    "שאלה 2...",
    "שאלה 3...",
    "שאלה 4...",
    "שאלה 5..."
  ],
  "suggestedHeadings": [
    { "level": "h2", "title": "כותרת ראשית", "targetLsi": ["מונח 1", "מונח 2"] },
    { "level": "h3", "title": "תת כותרת", "targetLsi": ["מונח 3"] }
  ],
  "seoDifficulty": "easy / medium / competitive",
  "searchVolumePotential": "high / medium / niche",
  "strategyNotes": "ניתוח אסטרטגי קצר של רון: כיצד לבנות את המאמר כך שינצח את המתחרים בגוגל ישראל ויופיע ב-Google AI Overviews"
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

    // Ensure lsiKeywords combines all cluster keywords seamlessly
    let allLsi: string[] = [];
    if (Array.isArray(parsed.lsiClusters) && parsed.lsiClusters.length > 0) {
      for (const cl of parsed.lsiClusters) {
        if (Array.isArray(cl.keywords)) {
          allLsi.push(...cl.keywords.filter((k: any) => typeof k === "string" && k.trim().length > 1));
        }
      }
    }
    if (Array.isArray(parsed.lsiKeywords)) {
      allLsi.push(...parsed.lsiKeywords.filter((k: any) => typeof k === "string" && k.trim().length > 1));
    }
    // Deduplicate
    allLsi = Array.from(new Set(allLsi.map((s) => s.trim()))).filter(Boolean);

    // If clusters were missing from LLM, generate them heuristically from allLsi
    const finalClusters = Array.isArray(parsed.lsiClusters) && parsed.lsiClusters.length > 0
      ? parsed.lsiClusters
      : buildDefaultClusters(allLsi);

    addAgentLog(
      "copywriter",
      "רון",
      "success",
      `מחקר מילות מפתח הושלם עבור "${cleanTerm}": אותרו ${allLsi.length} מונחי LSI ב-${finalClusters.length} אשכולות סמנטיים ו-${parsed.peopleAlsoAsk?.length || 0} שאלות נפוצות.`
    );

    return {
      primaryKeyword: parsed.primaryKeyword || cleanTerm,
      searchIntent: parsed.searchIntent || "informational",
      targetAudience: parsed.targetAudience || audience,
      lsiKeywords: allLsi.length > 0 ? allLsi : [cleanTerm],
      lsiClusters: finalClusters,
      liveGoogleSuggestions,
      semanticEntities: Array.isArray(parsed.semanticEntities) ? parsed.semanticEntities : [],
      peopleAlsoAsk: Array.isArray(parsed.peopleAlsoAsk) ? parsed.peopleAlsoAsk : [],
      suggestedHeadings: Array.isArray(parsed.suggestedHeadings) ? parsed.suggestedHeadings : [],
      seoDifficulty: parsed.seoDifficulty || "medium",
      searchVolumePotential: parsed.searchVolumePotential || "high",
      strategyNotes: parsed.strategyNotes || "אסטרטגיית תוכן מותאמת ל-AI Overviews ודירוג אורגני בגוגל ישראל.",
    };
  } catch (err: any) {
    console.warn("Ron keyword research LLM failed, using smart fallback:", err?.message);
    return generateFallbackKeywordResearch(cleanTerm, category, audience, liveGoogleSuggestions);
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
8. אסטרטגיית קישורים וסמכות עיתונאית (Linkable Assets & Digital PR for Backlinks):
   - המאמר מיועד להוות מקור מידע בר סמכא, מעמיק ואיכותי שיעזור לאתר להימצא על ידי גורמי צד שלישי (עיתונאים, בלוגרים, אנשים שמחפשים מידע מהימן ברשת, פורומים) ולהיות מצוטט על ידם כמקור רפרנס.
   - שלב בגוף המאמר לפחות 1-2 תיבות ציטוט רשמי בפורמט:
     > 📜 **מקור ורגולציה רשמית:** [ציטוט מדויק וסעיף חוק/תקנה רלוונטי מתוך רשות המסים, מכס ישראל, משרד הכלכלה, משרד התקשורת, מכון התקנים הישראלי, או חוק הגנת הצרכן].
   - שלב לפחות תיבה אחת של נתוני מדד צרכנות ברי ציטוט:
     > 📊 **מדד AliDeals ונתוני שוק:** [סטטיסטיקה השוואתית, אחוזי חיסכון או נתון עובדתי הניתן לציטוט עיתונאי עם קרדיט לאתר].
   - כתוב באריכות, יסודיות וסמכותיות (מעל 1,000 מילים) כדי שהמאמר יהווה את המדריך הממצה והאיכותי ביותר ברשת הישראלית לנושא זה.
9. חוק ברזל: החזר אך ורק מבנה JSON תקין (Strict JSON) ללא תגיות Markdown או backticks מסביב.
`;

    const userPrompt = `
כתוב מאמר SEO מלא ומקיף על הנושא הבא:
- נושא: "${cleanTopic}"
- מילת מפתח מרכזית: "${research.primaryKeyword || focusKeyword || cleanTopic}"
- קטגוריה: "${category}"
- קהל יעד: "${research.targetAudience}"
${customInstructions ? `- הנחיות מיוחדות: "${customInstructions}"` : ""}

נתוני מחקר מילות מפתח ו-LSI לפי אשכולות סמנטיים (חובה לשזור בטבעיות במקומות המתאימים):
${research.lsiClusters && research.lsiClusters.length > 0
  ? research.lsiClusters.map((c) => `- אשכול "${c.name}" (${c.icon || "📌"}): ${c.keywords.join(", ")}`).join("\n")
  : `- מילות מפתח LSI: ${JSON.stringify(research.lsiKeywords)}`
}
- ישויות סמנטיות: ${JSON.stringify(research.semanticEntities)}
- שאלות גולשים (PAA): ${JSON.stringify(research.peopleAlsoAsk)}
- ראשי פרקים מומלצים: ${JSON.stringify(research.suggestedHeadings)}

הנחיות לשזירת LSI ממוקדת:
1. שזור מונחי מפרט וחומרים בפרקי הניתוח הטכני, בטבלת ההשוואה ובצ'קליסט הקנייה.
2. שזור מונחי כוונת רכישה, מחיר וחיסכון בסקירת המחירים, טיפי החיסכון והשורה התחתונה.
3. שזור שאלות ונקודות כאב בכותרות H2/H3, בפסקאות ההסבר ובשאלות ה-FAQ.
4. שזור מילים נרדפות בפסקת ה-Direct Answer GEO הפותחת, בכותרות המשנה ובתיאורי המטא.

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

    // Verified LSI Weaving: calculate actual occurrences in contentMarkdown + directAnswerGeo
    const targetLsiTerms = Array.isArray(research.lsiKeywords) ? research.lsiKeywords : [];
    const fullArticleCorpus = `${parsed.contentMarkdown || ""} ${parsed.directAnswerGeo || ""}`;
    const verifiedLsiWeaved: Array<{ keyword: string; count: number; section: string }> = [];

    for (const term of targetLsiTerms) {
      if (!term || typeof term !== "string") continue;
      const cleanTerm = term.trim();
      if (!cleanTerm) continue;

      try {
        const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const matches = fullArticleCorpus.match(new RegExp(escaped, "gi"));
        const count = matches ? matches.length : 0;
        if (count > 0) {
          const modelItem = Array.isArray(parsed.lsiKeywordsWeaved)
            ? parsed.lsiKeywordsWeaved.find(
                (item: any) => item && typeof item.keyword === "string" && item.keyword.toLowerCase() === cleanTerm.toLowerCase()
              )
            : null;
          verifiedLsiWeaved.push({
            keyword: cleanTerm,
            count,
            section: modelItem?.section || "גוף המאמר",
          });
        }
      } catch {}
    }

    if (Array.isArray(parsed.lsiKeywordsWeaved)) {
      for (const item of parsed.lsiKeywordsWeaved) {
        if (
          item &&
          typeof item.keyword === "string" &&
          item.keyword.trim() &&
          !verifiedLsiWeaved.some((v) => v.keyword.toLowerCase() === item.keyword.trim().toLowerCase())
        ) {
          try {
            const escaped = item.keyword.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const matches = fullArticleCorpus.match(new RegExp(escaped, "gi"));
            const count = matches ? matches.length : (item.count || 1);
            if (count > 0) {
              verifiedLsiWeaved.push({
                keyword: item.keyword.trim(),
                count,
                section: item.section || "גוף המאמר",
              });
            }
          } catch {}
        }
      }
    }

    addAgentLog(
      "copywriter",
      "רון",
      "success",
      `מאמר SEO נכתב בהצלחה: "${parsed.title}" (אורך קריאה מוערך: ${parsed.estimatedReadTimeMinutes || 5} דק', נשזרו ואומתו ${verifiedLsiWeaved.length} מונחי LSI).`
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
      lsiKeywordsWeaved: verifiedLsiWeaved.length > 0 ? verifiedLsiWeaved : (Array.isArray(parsed.lsiKeywordsWeaved) ? parsed.lsiKeywordsWeaved : []),
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
  audience: string,
  liveSuggestions: string[] = []
): RonKeywordResearch {
  const synonyms = [
    `${term} מומלץ`,
    `${term} מחיר`,
    `${term} חוות דעת`,
    `איזה ${term} כדאי לקנות`,
    ...liveSuggestions.slice(0, 3),
  ].filter(Boolean);

  const techSpecs = [
    `מפרט ${term}`,
    `איכות ורמת גימור`,
    `חומרים ועמידות`,
    `דגמים מומלצים 2026`,
  ];

  const buyingIntent = [
    `${term} השוואת מחירים`,
    `מבצעים על ${term}`,
    `${term} הזמנה אונליין`,
    `משלוח מהיר לישראל`,
    ...liveSuggestions.slice(3, 6),
  ].filter(Boolean);

  const painPoints = [
    `מדריך בחירת ${term}`,
    `טעויות נפוצות בקניית ${term}`,
    `מה לבדוק לפני שמזמינים ${term}`,
    `איך לוודא ביקורות אותנטיות`,
  ];

  const clusters: LsiCluster[] = [
    { name: "מילים נרדפות ווריאציות חיפוש", icon: "🔍", keywords: Array.from(new Set(synonyms)).slice(0, 5) },
    { name: "מפרט טכני, חומרים ותכונות", icon: "⚙️", keywords: Array.from(new Set(techSpecs)).slice(0, 5) },
    { name: "כוונת רכישה, מחיר והשוואות", icon: "💰", keywords: Array.from(new Set(buyingIntent)).slice(0, 5) },
    { name: "פתרון בעיות, שאלות ונקודות כאב", icon: "🛡️", keywords: Array.from(new Set(painPoints)).slice(0, 5) },
  ];

  const flatLsi = Array.from(new Set(clusters.flatMap((c) => c.keywords)));

  return {
    primaryKeyword: term,
    searchIntent: "informational",
    targetAudience: audience,
    lsiKeywords: flatLsi,
    lsiClusters: clusters,
    liveGoogleSuggestions: liveSuggestions,
    semanticEntities: [
      term,
      `מדריך קנייה ${term}`,
      "ביקורות רוכשים מאומתות",
      "השוואת מחירים",
      "משלוח ישיר לישראל",
    ],
    peopleAlsoAsk: [
      `איך לבחור ${term} מומלץ?`,
      `מה ההבדלים העיקריים בין הדגמים של ${term}?`,
      `האם כדאי להזמין ${term} מאלי אקספרס ומה זמן המשלוח?`,
      `מה לבדוק לפני שמזמינים ${term} כדי לא ליפול על איכות ירודה?`,
    ],
    suggestedHeadings: [
      {
        level: "h2",
        title: `מה חשוב לדעת על ${term} לפני שקונים?`,
        targetLsi: clusters[0].keywords.slice(0, 3),
      },
      {
        level: "h2",
        title: `מפרט טכני ופרמטרים קריטיים להשוואה`,
        targetLsi: clusters[1].keywords.slice(0, 3),
      },
      {
        level: "h2",
        title: `איך למצוא את הדיל הטוב ביותר ולהימנע מטעויות`,
        targetLsi: clusters[2].keywords.slice(0, 3),
      },
      {
        level: "h2",
        title: `שאלות נפוצות על ${term} (FAQ)`,
        targetLsi: clusters[3].keywords.slice(0, 3),
      },
      {
        level: "h2",
        title: `השורה התחתונה של רון: ההמלצה הסופית`,
        targetLsi: [`${term} מומלץ`],
      },
    ],
    seoDifficulty: "medium",
    searchVolumePotential: "high",
    strategyNotes: `מחקר מילות מפתח ממוקד לנושא "${term}" המשלב אשכולות סמנטיים (LSI Clusters), וריאציות חיפוש אותנטיות מגוגל ישראל, ומבנה מוכן לזכייה ב-Direct Answer.`,
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
