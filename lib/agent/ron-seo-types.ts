// Pure TypeScript interfaces and constants for Ron SEO Studio
// Safe to import in both Client Components and Server Components

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

export type TopicStrategy =
  | "all"
  | "backlinks"
  | "shopping_guides"
  | "seasonal_trends"
  | "cost_of_living";

export interface RonSuggestedTopic {
  id?: string;
  topic: string;
  focusKeyword: string;
  category: string;
  description: string;
  strategyType: "backlink_magnet" | "definitive_guide" | "seasonal_trend" | "cost_of_living";
  strategyBadgeHe: string;
  backlinkAngleHe?: string;
  targetSourcesToCiteHe?: string[];
  estimatedPotentialHe?: string;
}

export type PopularTopic = RonSuggestedTopic;

export const POPULAR_ISRAELI_ALIEXPRESS_TOPICS: RonSuggestedTopic[] = [
  // --- עוגני סמכות ומגנטי קישורים לעיתונות ובלוגרים (Backlink Magnets & Digital PR) ---
  {
    id: "bl_customs_guide_2026",
    topic: "מדריך המכס, המע״מ ואגרות השחרור ביבוא אישי 2026: כל התקנות של רשות המסים",
    focusKeyword: "מכס אלי אקספרס 75 דולר",
    category: "מדריכי קנייה וצרכנות",
    description: "ניתוח מקיף של תקרת הפטור ממע״מ (75$), מדרגות המכס עד 500$, אגרות חברות הבלדרות (דואר ישראל, EMS, DHL) ופיצול חבילות.",
    strategyType: "backlink_magnet",
    strategyBadgeHe: "🧲 מגנט קישורים & ציטוט עיתונאי",
    backlinkAngleHe: "עיתונאי כלכלה (דה-מרקר, כלכליסט, Ynet) ובלוגרים מצטטים מדריך זה כמקור האוטוריטה העדכני למספרים ולתקנות.",
    targetSourcesToCiteHe: ["רשות המסים בישראל", "צו תעריף המכס והפטורים", "דואר ישראל", "חוק מע\"מ"],
    estimatedPotentialHe: "פוטנציאל גבוה מאוד לציטוטים וקישורים",
  },
  {
    id: "bl_wireless_comm_ministry",
    topic: "ייבוא אישי של מוצרי תקשורת ורחפנים: תקנות משרד התקשורת ורשימת הפטורים המלאה 2026",
    focusKeyword: "אישור משרד התקשורת יבוא אישי",
    category: "אלקטרוניקה וגאדג'טים",
    description: "אילו נתבים, מצלמות, רחפנים ומשדרי WiFi 6E/7 פטורים מאישור משרד התקשורת, ומה עושים כשהחבילה מעוכבת בבית המכס.",
    strategyType: "backlink_magnet",
    strategyBadgeHe: "🧲 מגנט קישורים & ציטוט עיתונאי",
    backlinkAngleHe: "פורומי טכנולוגיה (Geektime, HWzone, קבוצות פייסבוק) מפנים למדריך זה כרשימת הפטורים הרשמית.",
    targetSourcesToCiteHe: ["משרד התקשורת", "אגף הספקטרום", "תקנות התקשורת (פטור מרישוי)"],
    estimatedPotentialHe: "פוטנציאל גבוה מאוד לציטוטים וקישורים",
  },
  {
    id: "bl_standards_safety_kids",
    topic: "בטיחות ותקנים בצעצועים ומוצרי תינוקות מחו״ל: מה אומר מכון התקנים ומשרד הכלכלה?",
    focusKeyword: "תקן צעצועים יבוא אישי",
    category: "ילדים, תינוקות וצעצועים",
    description: "חומרים רעילים, בדיקות BPA, חלקים קטנים וסימוני CE - מדריך להורים ובלוגרי הורות על בדיקת בטיחות לפני שמזמינים.",
    strategyType: "backlink_magnet",
    strategyBadgeHe: "🧲 מגנט קישורים & ציטוט עיתונאי",
    backlinkAngleHe: "אתרי הורות, בלוגים משפחתיים ועמודי צרכנות מצטטים את הצ'קליסט לבטיחות צעצועים.",
    targetSourcesToCiteHe: ["מכון התקנים הישראלי (תקן רשמי 562)", "משרד הכלכלה והתעשייה", "ארגון בטרם לבטיחות ילדים"],
    estimatedPotentialHe: "פוטנציאל גבוה לציטוטים וקישורים",
  },
  {
    id: "bl_cost_of_living_index",
    topic: "מדד פערי המחירים 2026: כמה באמת חוסך הצרכן הישראלי בהזמנה ישירה מעלי אקספרס מול רשתות הפארם והחשמל?",
    focusKeyword: "השוואת מחירים אלי אקספרס מול ישראל",
    category: "מדריכי קנייה וצרכנות",
    description: "מחקר נתונים מפורט: סל השוואתי של 20 מוצרים פופולריים בישראל (מברשות שיניים, כבלים, ראשי נינג'ה, תאורה) מול מחירי KSP, סופר-פארם ובאג.",
    strategyType: "backlink_magnet",
    strategyBadgeHe: "🧲 מגנט קישורים & ציטוט עיתונאי",
    backlinkAngleHe: "עיתונות צרכנית ומדורי 'כסף' מצטטים את טבלת פערי המחירים כנתון מחקרי על יוקר המחיה.",
    targetSourcesToCiteHe: ["נתוני שוק ומדד AliDeals", "הלשכה המרכזית לסטטיסטיקה", "המועצה הישראלית לצרכנות"],
    estimatedPotentialHe: "פוטנציאל ויראלי ועיתונאי עצום",
  },

  // --- מדריכי סמכות וצרכנות עמוקים (Definitive Consumer Guides) ---
  {
    id: "guide_dispute_refund",
    topic: "איך לפתוח סכסוך (Dispute) באלי אקספרס ולקבל החזר כספי מלא [מדריך שלב-אחר-שלב 2026]",
    focusKeyword: "סכסוך באלי אקספרס החזר כספי",
    category: "מדריכי קנייה וצרכנות",
    description: "צילום וידאו של פתיחת החבילה (Unboxing), ניהול משא ומתן מול מוכר עקשן, התערבות שירות הלקוחות הרשמי והגנת כרטיס האשראי.",
    strategyType: "definitive_guide",
    strategyBadgeHe: "📚 מדריך סמכות מקיף",
    backlinkAngleHe: "מדריך רפרנס בקהילות קניות ישראליות למקרים שבהם מוצר מגיע פגום או לא מגיע כלל.",
    targetSourcesToCiteHe: ["מדיניות הגנת הקונה הרשמית של AliExpress", "חוק כרטיסי חיוב (הכחשת עסקה)"],
    estimatedPotentialHe: "נפח חיפוש חודשי גבוה וקבוע",
  },
  {
    id: "guide_eu_plug_voltage",
    topic: "שקע ותקע אירופאי (EU Plug) ומתח 220V: מדריך החשמל השלם לישראלים באלי אקספרס",
    focusKeyword: "מוצרי חשמל אלי אקספרס מתח 220v",
    category: "אלקטרוניקה וגאדג'טים",
    description: "הבדלים בין תקע ישראלי (Type H) לאירופאי (Type C/F), בדיקת תדר 50Hz, סכנות מתאמים זולים ומה אסור לחבר לרשת החשמל.",
    strategyType: "definitive_guide",
    strategyBadgeHe: "📚 מדריך סמכות מקיף",
    backlinkAngleHe: "הסבר מוסמך על בטיחות חשמל המקושר בפורומים של חשמלאים ועשה-זאת-בעצמך.",
    targetSourcesToCiteHe: ["חוק החשמל ותקנותיו", "מכון התקנים הישראלי", "רשות החשמל"],
    estimatedPotentialHe: "נפח חיפוש גבוה ומתמיד",
  },
  {
    id: "guide_size_chart_fashion",
    topic: "סרגל מידות באלי אקספרס: איך להמיר מידות אסייתיות לישראליות ולא לטעות בבגדים ונעליים",
    focusKeyword: "מידות אלי אקספרס המרה לישראל",
    category: "אופנה והנעלה",
    description: "מדריך מדידה בס\"מ (חזה, מותניים, אורך רגל), טבלאות המרה מ-Asian Size ל-EU/US, והבנת ביקורות רוכשים עם תמונות גוף אמיתיות.",
    strategyType: "definitive_guide",
    strategyBadgeHe: "📚 מדריך סמכות מקיף",
    backlinkAngleHe: "מומלץ ומקושר בקבוצות פייסבוק של אופנה וסטיילינג ברשת.",
    targetSourcesToCiteHe: ["תקן מידות בינלאומי ISO 8559", "סרגלי מדידה רשמיים"],
    estimatedPotentialHe: "חיפוש עקבי עם עשרות אלפי חשיפות",
  },
  {
    id: "guide_choice_shipping",
    topic: "משלוח AliExpress Choice לישראל: יתרונות, זמני הגעה והחזרות מקומיות בחינם",
    focusKeyword: "אלי אקספרס צ'ויס ישראל",
    category: "מדריכי קנייה וצרכנות",
    description: "מדוע מוצרי Choice מגיעים תוך 7-12 ימים, איך עובד מחסן השילוח המהיר וכיצד מנצלים החזרה חינם בדואר ללא תשלום על משלוח חוזר.",
    strategyType: "definitive_guide",
    strategyBadgeHe: "📚 מדריך סמכות מקיף",
    backlinkAngleHe: "סקירת שירות מקיפה המצוטטת בכל כתבה על הרגלי שילוח ורכישות מסין.",
    targetSourcesToCiteHe: ["Cainiao Global Logistics", "דואר ישראל שילוח מהיר"],
    estimatedPotentialHe: "טרנד חיפוש גובר והולך",
  },
];
