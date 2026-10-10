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

export interface PopularTopic {
  topic: string;
  focusKeyword: string;
  category: string;
  description: string;
}

export const POPULAR_ISRAELI_ALIEXPRESS_TOPICS: PopularTopic[] = [
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
