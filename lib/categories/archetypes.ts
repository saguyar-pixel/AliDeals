/**
 * Category Archetypes Engine - AliDeals Platform
 * Provides deterministic classification, Israeli verification context, and archetype-specific copy rules.
 */

export type CategoryArchetype =
  | "ELECTRONICS"
  | "FASHION"
  | "HOME_LIVING"
  | "KIDS_TOYS"
  | "GENERAL";

export interface ArchetypeMeta {
  id: CategoryArchetype;
  labelHe: string;
  labelEn: string;
  icon: string; // Lucide icon name or emoji
  colorClass: string;
  descriptionHe: string;
  focusAreasHe: string[];
}

export const ARCHETYPE_METADATA: Record<CategoryArchetype, ArchetypeMeta> = {
  ELECTRONICS: {
    id: "ELECTRONICS",
    labelHe: "אלקטרוניקה וחשמל",
    labelEn: "Electronics & Tech",
    icon: "Plug",
    colorClass: "blue",
    descriptionHe: "מוצרי חשמל, גאדג'טים, אודיו, מחשוב, סלולר ורכיבים הדורשים בדיקת מתח ושקע",
    focusAreasHe: ["תאימות שקע EU ומתח 220V", "איכות בנייה ופורטים", "ביצועים אמיתיים בעולם האמיתי", "חיי סוללה וטעינה"],
  },
  FASHION: {
    id: "FASHION",
    labelHe: "אופנה והנעלה",
    labelEn: "Fashion & Apparel",
    icon: "Shirt",
    colorClass: "pink",
    descriptionHe: "ביגוד, הנעלה, אקססוריז, תכשיטים ותיקים הדורשים בדיקת מידות והרכב בד",
    focusAreasHe: ["אזהרת מידות (השוואת מידות אסייתיות מול אירופאיות/ישראליות)", "הרכב בד ואיכות תפירה", "הוראות כביסה ועמידות", "גזרה והתאמה למבנה הגוף"],
  },
  HOME_LIVING: {
    id: "HOME_LIVING",
    labelHe: "לבית, למטבח ולגינה",
    labelEn: "Home & Living",
    icon: "Home",
    colorClass: "amber",
    descriptionHe: "כלי בית, אביזרי מטבח, פתרונות אחסון, עיצוב הבית וכלי עבודה",
    focusAreasHe: ["מידות מדויקות בס\"מ מול תמונות שיווקיות", "איכות חומרים (נירוסטה, סיליקון מזון)", "קלות הרכבה ותחזוקה", "בטיחות שימוש"],
  },
  KIDS_TOYS: {
    id: "KIDS_TOYS",
    labelHe: "ילדים, תינוקות וצעצועים",
    labelEn: "Kids & Toys",
    icon: "Baby",
    colorClass: "purple",
    descriptionHe: "צעצועים, משחקי הרכבה, אביזרי תינוקות, בגדי ילדים וציוד הורות",
    focusAreasHe: ["תקני בטיחות (BPA Free / ללא חלקים קטנים מסוכנים)", "עמידות לנפילות ושחיקה", "התאמה לקבוצת גיל מדויקת", "חומרים לא רעילים"],
  },
  GENERAL: {
    id: "GENERAL",
    labelHe: "כללי ורב-תכליתי",
    labelEn: "General & Lifestyle",
    icon: "Package",
    colorClass: "slate",
    descriptionHe: "מוצרים מגוונים שלא שייכים לקטגוריות העיקריות",
    focusAreasHe: ["ערך שימושי ומעשי", "עמידות חומרים ואיכות אריזה", "מידות ומשקל", "תמורה לכסף מול מחיר מקומי"],
  },
};

export interface ArchetypeConfig {
  nameHe: string;
  icon: string;
  descriptionHe: string;
}

export const ARCHETYPE_CONFIG: Record<CategoryArchetype, ArchetypeConfig> = {
  ELECTRONICS: {
    nameHe: "אלקטרוניקה וחשמל",
    icon: "🔌",
    descriptionHe: "בדיקת שקע EU ומתח 220V",
  },
  FASHION: {
    nameHe: "אופנה והנעלה",
    icon: "👕",
    descriptionHe: "בדיקת מידות והרכב בד",
  },
  HOME_LIVING: {
    nameHe: "לבית, למטבח ולגינה",
    icon: "🏠",
    descriptionHe: "מידות בס\"מ ואיכות חומרים",
  },
  KIDS_TOYS: {
    nameHe: "ילדים וצעצועים",
    icon: "🧸",
    descriptionHe: "תקני בטיחות וגילאים",
  },
  GENERAL: {
    nameHe: "כללי ורב-תכליתי",
    icon: "📦",
    descriptionHe: "מוצרים כלליים ללא חשמל/מידות",
  },
};

// Heuristic keyword matchers (English & Hebrew)
const FASHION_KEYWORDS = [
  // Hebrew
  "ביגוד", "הלבשה", "חולצה", "חולצות", "שמלה", "שמלות", "מכנסיים", "ג'ינס", "ז'קט", "מעיל",
  "קפוצ'ון", "סוודר", "נעליים", "סניקרס", "מגפיים", "סנדלים", "כפכפים", "גרביים", "תחתונים",
  "חזייה", "הלבשה תחתונה", "בגד ים", "פיג'מה", "תכשיט", "תכשיטים", "שרשרת", "טבעת", "עגילים",
  "צמיד", "תיק", "תיקים", "תרמיל", "ארנק", "חגורה", "צעיף", "כובע", "משקפי שמש", "בד", "כותנה",
  "פוליאסטר", "משי", "פשתן", "שעון יד", "תליון",
  // English
  "clothing", "apparel", "dress", "dresses", "shirt", "shirts", "t-shirt", "tee", "pants", "trousers",
  "jeans", "jacket", "coat", "hoodie", "sweater", "sweatshirt", "shoes", "sneakers", "boots", "sandals",
  "slippers", "socks", "underwear", "boxers", "bra", "lingerie", "swimwear", "swimsuit", "pyjamas",
  "pajamas", "jewelry", "necklace", "ring", "earrings", "bracelet", "bag", "handbag", "backpack",
  "wallet", "belt", "scarf", "cap", "hat", "sunglasses", "cotton", "polyester", "silk", "linen", "watch",
];

const ELECTRONICS_KEYWORDS = [
  // Hebrew
  "מקרן", "מקרנים", "אוזניות", "אוזנייה", "רמקול", "רמקולים", "בלוטוס", "בלוטות'", "טעינה", "מטען",
  "סוללה", "סוללות", "פאוורבנק", "כבל", "כבלים", "usb", "type-c", "hdmi", "מתאם", "שקע", "תקע",
  "מתח", "חשמל", "וולט", "וואט", "220v", "110v", "טלפון", "סלולר", "סמארטפון", "טאבלט", "מחשב",
  "לפטופ", "מקלדת", "עכבר", "מסך", "מוניטור", "תאורת לד", "פנס", "רחפן", "מצלמה", "מצלמת דרך",
  "קונסולה", "גיימינג", "בקר", "מגבר", "סאב וופר", "כרטיס זיכרון", "דיסק און קי", "רובוט", "שואב אבק",
  "מכשיר חשמלי", "מכשיר עיסוי", "סוללת גיבוי",
  // English
  "projector", "earbuds", "earphones", "headphones", "headset", "speaker", "bluetooth", "charger",
  "charging", "battery", "batteries", "powerbank", "cable", "cables", "usb", "type-c", "hdmi", "adapter",
  "plug", "socket", "voltage", "electric", "electrical", "electronic", "electronics", "watt", "volt",
  "220v", "110v", "phone", "smartphone", "cellphone", "tablet", "computer", "laptop", "keyboard",
  "mouse", "display", "screen", "monitor", "led", "flashlight", "drone", "camera", "dashcam", "console",
  "gaming", "controller", "gamepad", "amplifier", "subwoofer", "sd card", "flash drive", "vacuum",
  "robot", "massager", "tws", "wireless", "anc",
];

const KIDS_TOYS_KEYWORDS = [
  // Hebrew
  "צעצוע", "צעצועים", "בובה", "בובות", "משחק קופסה", "פאזל", "פאזלים", "לגו", "אבני בנייה", "דמויות פעולה",
  "מכונית צעצוע", "שלט רחוק", "תינוק", "תינוקות", "פעוט", "פעוטות", "עגלת תינוק", "מוצץ", "מוצצים",
  "בקבוק האכלה", "חיתול", "חיתולים", "משטח פעילות", "נדנדה לתינוק", "ביגוד תינוקות", "משחק ילדים",
  // English
  "toy", "toys", "doll", "dolls", "board game", "puzzle", "puzzles", "lego", "building blocks",
  "action figure", "toy car", "rc car", "baby", "infant", "toddler", "stroller", "pacifier",
  "feeding bottle", "diaper", "playmat", "baby swing", "kids", "children", "child",
];

const HOME_LIVING_KEYWORDS = [
  // Hebrew
  "מטבח", "סיר", "סירים", "מחבת", "מחבתות", "סכין", "סכינים", "קרש חיתוך", "כלי בישול", "אפייה",
  "קופסאות אחסון", "ארגונית", "מדף", "מדפים", "וילון", "וילונות", "שטיח", "שטיחים", "כרית", "כריות",
  "מצעים", "מגבת", "מגבות", "אמבטיה", "מקלחת", "ברז", "כיור", "עיצוב הבית", "תמונה", "מדבקות קיר",
  "עציץ", "אדנית", "גינה", "השקיה", "כלי עבודה", "מברג", "פטיש", "ניקוי", "מטאטא", "סמרטוט",
  // English
  "kitchen", "cookware", "pot", "pots", "pan", "pans", "knife", "knives", "cutting board", "baking",
  "storage", "organizer", "shelf", "shelves", "curtain", "curtains", "carpet", "rug", "pillow",
  "pillows", "bedding", "towel", "towels", "bathroom", "shower", "faucet", "sink", "home decor",
  "wall sticker", "flowerpot", "planter", "garden", "gardening", "tools", "screwdriver", "hammer",
  "cleaning", "broom", "mop",
];

// Banned generic phrases that Agent Ron is strictly forbidden from writing
export const BANNED_GENERIC_PHRASES = [
  "מוצר איכותי",
  "איכות מעולה",
  "מחיר זול",
  "שווה כל שקל",
  "עיצוב יפה",
  "עיצוב מרשים",
  "מוצר מדהים",
  "איכותי מאוד",
  "מומלץ בחום",
  "קנייה מעולה",
  "תמורה מדהימה למחיר",
  "תמורה מצוינת",
  "מוצר נהדר",
  "מחיר משתלם במיוחד",
];

/**
 * Fast deterministic archetype detector based on title, category, specs, and breadcrumbs.
 */
export function detectArchetype(params: {
  category?: string | null;
  title?: string | null;
  specifications?: Record<string, any> | string | null;
  breadcrumbs?: string | null;
}): CategoryArchetype {
  const specText =
    typeof params.specifications === "string"
      ? params.specifications
      : typeof params.specifications === "object" && params.specifications !== null
      ? Object.entries(params.specifications)
          .map(([k, v]) => `${k} ${v}`)
          .join(" ")
      : "";

  const haystack = [
    params.category || "",
    params.title || "",
    params.breadcrumbs || "",
    specText,
  ]
    .join(" ")
    .toLowerCase();

  // Helper to count matches
  const countMatches = (keywords: string[]) => {
    let count = 0;
    for (const kw of keywords) {
      // Word boundary match or simple inclusion for Hebrew
      if (haystack.includes(kw.toLowerCase())) {
        count++;
      }
    }
    return count;
  };

  const fashionScore = countMatches(FASHION_KEYWORDS);
  const kidsScore = countMatches(KIDS_TOYS_KEYWORDS);
  const electronicsScore = countMatches(ELECTRONICS_KEYWORDS);
  const homeScore = countMatches(HOME_LIVING_KEYWORDS);

  // High priority disambiguation:
  // If fashion or kids have strong signals and electronics is low, prevent false electronic detection
  if (kidsScore >= 2 && kidsScore >= electronicsScore) {
    return "KIDS_TOYS";
  }

  if (fashionScore >= 2 && fashionScore >= electronicsScore) {
    return "FASHION";
  }

  if (electronicsScore >= 2 && electronicsScore > homeScore) {
    return "ELECTRONICS";
  }

  if (homeScore >= 2) {
    return "HOME_LIVING";
  }

  // Fallback single match checks
  if (fashionScore > 0 && fashionScore >= electronicsScore) return "FASHION";
  if (kidsScore > 0) return "KIDS_TOYS";
  if (electronicsScore > 0) return "ELECTRONICS";
  if (homeScore > 0) return "HOME_LIVING";

  return "GENERAL";
}

/**
 * Helper to test if an archetype requires electrical compliance (EU plug & 220V)
 */
export function isElectricArchetype(archetype: string | null | undefined): boolean {
  return archetype === "ELECTRONICS";
}

/**
 * Validate and clean pros & cons against banned generic phrases.
 * Returns array with filtered or rewritten specific items.
 */
export function sanitizeProsCons(
  items: string[],
  archetype: CategoryArchetype,
  type: "pros" | "cons"
): string[] {
  if (!Array.isArray(items)) return [];

  const cleaned: string[] = [];

  for (let item of items) {
    if (!item || typeof item !== "string") continue;
    let trimmed = item.trim();
    if (trimmed.length < 5) continue;

    // Check if this item is completely a banned generic phrase
    const isPurelyBanned = BANNED_GENERIC_PHRASES.some((banned) => {
      return trimmed === banned || trimmed === `${banned}!` || trimmed === `${banned}.`;
    });

    if (isPurelyBanned) {
      continue; // Drop completely
    }

    // Check if item contains plug/electrical mention when NOT electronics!
    if (archetype !== "ELECTRONICS") {
      const containsElectricLeak =
        trimmed.includes("שקע") ||
        trimmed.includes("תקע") ||
        trimmed.includes("220V") ||
        trimmed.includes("220 וולט") ||
        trimmed.includes("EU Plug") ||
        trimmed.includes("אירופאי");

      if (containsElectricLeak) {
        // Drop context leak!
        continue;
      }
    }

    cleaned.push(trimmed);
  }

  // If list became empty after filtering, supply archetype-specific factual fallbacks
  if (cleaned.length === 0) {
    if (type === "pros") {
      switch (archetype) {
        case "FASHION":
          return [
            "תפירה כפולה באזורי שחיקה ומבד נושם",
            "התאמת גזרה נוחה לשימוש יומיומי ממושך",
          ];
        case "HOME_LIVING":
          return [
            "מבנה חזק מחומרים עמידים לקורוזיה ולשחיקה",
            "הרכבה פשוטה ומידות תואמות למפרט הרשמי",
          ];
        case "KIDS_TOYS":
          return [
            "חומרים נקיים מרעלנים (BPA Free) עם קצוות מעוגלים לבטיחות",
            "עמידות גבוהה לנפילות ולשימוש אינטנסיבי של ילדים",
          ];
        case "ELECTRONICS":
          return [
            "תאימות מלאה לרשת החשמל בישראל (220V) עם תקע אירופאי מקורי",
            "חיבור מהיר ויציב ללא השהיות מורגשות בשימוש יומיומי",
          ];
        default:
          return [
            "עמידות מוכחת של החומרים בשימוש יומיומי ממושך",
            "אריזה מוגנת למשלוח בינלאומי בטוח לישראל",
          ];
      }
    } else {
      switch (archetype) {
        case "FASHION":
          return [
            "מידות אסייתיות - מומלץ להיעזר בטבלת הס\"מ ולהזמין מידה אחת מעל",
            "הוראות כביסה בטמפרטורה נמוכה לשמירה על צבע הבד לאורך זמן",
          ];
        case "HOME_LIVING":
          return [
            "הוראות הרכבה באנגלית ואינן כוללות תרגום לעברית",
            "מומלץ למדוד מראש את השטח המיועד לפני ההזמנה",
          ];
        case "KIDS_TOYS":
          return [
            "אריזת הקרטון החיצונית עלולה להתקמט קלות במשלוח הבינלאומי",
            "השגחת מבוגר מומלצת בהרכבה ראשונית של חלקים קטנים",
          ];
        case "ELECTRONICS":
          return [
            "חוברת הוראות וממשק ראשוני באנגלית ללא תמיכה מובנית בעברית",
            "אינו כולל מתאם שקע נוסף מעבר לכבל המקורי המצורף",
          ];
        default:
          return [
            "זמן הגעה ממוצע של שבוע וחצי עד שבועיים במשלוח רשמי",
            "מדריך למשתמש באנגלית בלבד",
          ];
      }
    }
  }

  return cleaned;
}

/**
 * Returns tailored Agent Ron instructions based on the archetype.
 */
export function getArchetypePromptGuidelines(archetype: CategoryArchetype): string {
  switch (archetype) {
    case "FASHION":
      return `
המוצר שייך לקטגוריית אופנה והנעלה (FASHION):
- אסור באיסור מוחלט לציין שקע חשמל, מתח 220V, תקע EU, סוללות או חיבורים חשמליים!
- דגשי Pros & Cons חובה:
  1. דיוק מידות (Size Accuracy): התייחס מפורשות לכך שמידות באלי אקספרס הן לרוב מידות אסייתיות, והסבר לקונה הישראלי כיצד למדוד בס"מ והאם לקחת מידה מעל.
  2. הרכב בד ותפירה (Fabric & Stitching): ציין את סוג הבד (כותנה, פשתן, פוליאסטר נושם, ג'ינס), גמישות, איכות התפרים ועמידות בכביסות.
  3. עמידות ונוחות לבישה: חוויית שימוש במזג האוויר הישראלי (קיץ לח / חורף).
- חוק שלילה: איסור מוחלט על "מוצר איכותי", "עיצוב יפה", "שווה כל שקל". פרט במדויק את הגזרה, התפר והבד.
`;

    case "ELECTRONICS":
      return `
המוצר שייך לקטגוריית אלקטרוניקה וחשמל (ELECTRONICS):
- דגשי Pros & Cons חובה:
  1. תאימות לישראל: בדוק והדגש תאימות לרשת 220V/50Hz ובחירה בתקע EU Plug מקורי שמתאים ישירות לשקע הישראלי.
  2. ביצועים אמיתיים בעולם האמיתי: חיי סוללה אמיתיים (mAh/שעות עבודה), איכות אודיו/תמונה/חיבור, התחממות תחת מאמץ.
  3. פורטים וקישוריות: USB-C, Bluetooth 5.x, HDMI, מהירות טעינה בוואט (W).
- חוק שלילה: איסור מוחלט על "מוצר איכותי", "מחיר זול", "שווה כל שקל". פרט מפרט טכני, ביצועים מדודים וסוגי שקעים.
`;

    case "HOME_LIVING":
      return `
המוצר שייך לקטגוריית כלי בית ומטבח (HOME_LIVING):
- אסור לציין שקע EU אלא אם המוצר הוא מוצר חשמלי מובהק למטבח.
- דגשי Pros & Cons חובה:
  1. פרופורציות ומידות אמיתיות: השווה בין התמונות השיווקיות של המוכר לבין המידות הממשיות בס"מ.
  2. איכות חומרים ועמידות: נירוסטה נגד חלודה, פלסטיק עבה, זכוכית מחוסמת, עמידות במדיח כלים.
  3. קלות הרכבה וניקוי: כמה זמן לוקח להרכיב, האם מגיע עם כלים נדרשים, קלות תחזוקה.
- חוק שלילה: איסור מוחלט על "מוצר איכותי", "עיצוב יפה". פרט חומרי גלם, עמידות ומידות בס"מ.
`;

    case "KIDS_TOYS":
      return `
המוצר שייך לקטגוריית ילדים וצעצועים (KIDS_TOYS):
- אסור לציין שקע EU או תכונות חשמל למבוגרים.
- דגשי Pros & Cons חובה:
  1. בטיחות ילדים: היעדר פינות חדות, חומרים נקיים מרעלנים (BPA Free / EN71), גודל חלקים (מניעת סכנת חנק).
  2. התאמת גיל: לאיזה גיל המוצר באמת מתאים מבחינה מוטורית וקוגניטיבית.
  3. עמידות לנפילות ושחיקה: עמידות החלקים מול משחק אינטנסיבי.
- חוק שלילה: איסור מוחלט על "מוצר איכותי", "שווה כל שקל". פרט תקני בטיחות, גילאים וחומרי מבנה.
`;

    case "GENERAL":
    default:
      return `
המוצר שייך לקטגוריה כללית (GENERAL):
- אל תניח תכונות חשמליות ללא עדות מפורשת במפרט.
- דגשי Pros & Cons חובה:
  1. ערך מעשי יומיומי ושימושיות.
  2. איכות חומרי הגלם ועמידות לאורך זמן.
  3. אריזה והגנה במשלוח בינלאומי.
- חוק שלילה: איסור על קלישאות גנריות כגון "מוצר איכותי", "מחיר זול". פרט עובדות קונקרטיות בלבד.
`;
  }
}
