/**
 * Hebrew Purity Guard (Ron's forward guardrail)
 *
 * Multilingual LLMs occasionally leak look-alike characters from Arabic /
 * Cyrillic / Greek / CJK into Hebrew words (e.g. "דרייвер", "גדولة").
 * This module deterministically cleans such artifacts in-memory (0ms, no extra
 * LLM call) and reports what was changed so it can be logged.
 *
 * - Arabic letters -> mapped 1:1 to the closest Hebrew letter (reliable).
 * - Arabic diacritics / tatweel -> removed.
 * - Cyrillic / Greek / CJK -> cannot be mapped safely, so they are stripped
 *   and reported (the caller should log a warning).
 *
 * All character literals use \u escapes on purpose, to avoid keyboard /
 * font mixups between Hebrew and Arabic glyphs.
 */

const ARABIC_TO_HEBREW: Record<string, string> = {
  "\u0621": "\u05D0", // ء -> א
  "\u0622": "\u05D0", // آ -> א
  "\u0623": "\u05D0", // أ -> א
  "\u0624": "\u05D5", // ؤ -> ו
  "\u0625": "\u05D0", // إ -> א
  "\u0626": "\u05D9", // ئ -> י
  "\u0627": "\u05D0", // ا -> א
  "\u0628": "\u05D1", // ب -> ב
  "\u0629": "\u05D4", // ة -> ה
  "\u062A": "\u05EA", // ت -> ת
  "\u062B": "\u05EA", // ث -> ת
  "\u062C": "\u05D2", // ج -> ג
  "\u062D": "\u05D7", // ح -> ח
  "\u062E": "\u05D7", // خ -> ח
  "\u062F": "\u05D3", // د -> ד
  "\u0630": "\u05D6", // ذ -> ז
  "\u0631": "\u05E8", // ر -> ר
  "\u0632": "\u05D6", // ز -> ז
  "\u0633": "\u05E1", // س -> ס
  "\u0634": "\u05E9", // ش -> ש
  "\u0635": "\u05E6", // ص -> צ
  "\u0636": "\u05D3", // ض -> ד
  "\u0637": "\u05D8", // ط -> ט
  "\u0638": "\u05D8", // ظ -> ט
  "\u0639": "\u05E2", // ع -> ע
  "\u063A": "\u05D2", // غ -> ג
  "\u0641": "\u05E4", // ف -> פ
  "\u0642": "\u05E7", // ق -> ק
  "\u0643": "\u05DB", // ك -> כ
  "\u0644": "\u05DC", // ل -> ל
  "\u0645": "\u05DE", // م -> מ
  "\u0646": "\u05E0", // ن -> נ
  "\u0647": "\u05D4", // ه -> ה
  "\u0648": "\u05D5", // و -> ו
  "\u0649": "\u05D9", // ى -> י
  "\u064A": "\u05D9", // ي -> י
  "\u067E": "\u05E4", // پ -> פ
  "\u0686": "\u05E6", // چ -> צ
  "\u0698": "\u05D6", // ژ -> ז
  "\u06AF": "\u05D2", // گ -> ג
};

// Arabic diacritics (harakat), superscript alef, tatweel
const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670\u0640]/g;
const ARABIC_ANY = /[\u0600-\u06FF\u0750-\u077F]/;
const ARABIC_LETTERS = /[\u0600-\u06FF\u0750-\u077F]/g;
// Characters that can never be mapped safely: Cyrillic, Greek, CJK
const UNMAPPABLE = /[\u0400-\u04FF\u0370-\u03FF\u1F00-\u1FFF\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u30FF\uAC00-\uD7AF]/g;
const UNMAPPABLE_TEST = /[\u0400-\u04FF\u0370-\u03FF\u1F00-\u1FFF\u4E00-\u9FFF\u3400-\u4DBF\u3040-\u30FF\uAC00-\uD7AF]/;

export interface HebrewPurityReport {
  /** Arabic letters converted to Hebrew */
  arabicFixed: number;
  /** Cyrillic / Greek / CJK characters that had to be removed */
  foreignStripped: number;
  /** Sample of the offending characters (max 10), for logs */
  samples: string[];
}

export function createEmptyPurityReport(): HebrewPurityReport {
  return { arabicFixed: 0, foreignStripped: 0, samples: [] };
}

export function hasForeignScript(text: string): boolean {
  return ARABIC_ANY.test(text) || UNMAPPABLE_TEST.test(text);
}

export function sanitizeHebrewText(text: string, report?: HebrewPurityReport): string {
  if (typeof text !== "string" || text.length === 0 || !hasForeignScript(text)) return text;

  const addSample = (ch: string) => {
    if (report && report.samples.length < 10 && !report.samples.includes(ch)) {
      report.samples.push(ch);
    }
  };

  let out = text.replace(ARABIC_DIACRITICS, "");

  out = out.replace(ARABIC_LETTERS, (ch) => {
    const mapped = ARABIC_TO_HEBREW[ch];
    if (mapped) {
      if (report) report.arabicFixed++;
      addSample(ch);
      return mapped;
    }
    // Unknown Arabic-block char (digits, punctuation, rare letters): drop
    if (report) report.foreignStripped++;
    addSample(ch);
    return "";
  });

  out = out.replace(UNMAPPABLE, (ch) => {
    if (report) report.foreignStripped++;
    addSample(ch);
    return "";
  });

  return out;
}

/**
 * Recursively sanitizes every string inside an object/array.
 * Keys listed in `skipKeys` (URLs, slugs, JSON-LD blobs) are left untouched.
 */
export function sanitizeHebrewDeep<T>(
  value: T,
  report: HebrewPurityReport = createEmptyPurityReport(),
  skipKeys: string[] = ["slug", "featuredImage", "structuredDataJson", "researchSnapshot"]
): { value: T; report: HebrewPurityReport } {
  const walk = (v: any, key?: string): any => {
    if (key && skipKeys.includes(key)) return v;
    if (typeof v === "string") return sanitizeHebrewText(v, report);
    if (Array.isArray(v)) return v.map((item) => walk(item));
    if (v && typeof v === "object") {
      const next: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) next[k] = walk(val, k);
      return next;
    }
    return v;
  };
  return { value: walk(value), report };
}

/** Prompt block injected into Ron's system prompts. */
export const HEBREW_PURITY_PROMPT = `
9. חוק טוהר העברית (Strict Hebrew Purity - איסור מוחלט):
    - כל הטקסט (כותרות, גוף המאמר, FAQ, יתרונות/חסרונות, מטא) נכתב בעברית תקנית בלבד.
    - חל איסור מוחלט לשלב אותיות מאלפבית אחר בתוך מילים בעברית, ובמיוחד: ערבית (ع ت و ق ح ة ش), קירילית/רוסית (д в е к и н а р), יוונית (ι α ο) וסינית.
    - מונח לועזי (שם מותג, דגם, ראשי תיבות) נכתב באותיות לטיניות (A-Z) בלבד, או בעברית.
    - לפני שאתה מחזיר את ה-JSON, עבור בראש על כל שדה ווודא שאין אף תו שאינו עברי, לטיני, ספרה או פיסוק רגיל. אם מצאת - תקן אותו.
`;
