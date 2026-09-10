export interface GeoScoreResult {
  score: number; // 0 - 100
  level: "excellent" | "good" | "needs_work";
  wordCount: number;
  tips: string[];
}

/**
 * Evaluates text for citation probability in AI Search Engines
 * (ChatGPT Search, Google AI Overviews, Perplexity)
 */
export function evaluateGeoReadiness(text: string): GeoScoreResult {
  if (!text || !text.trim()) {
    return {
      score: 0,
      level: "needs_work",
      wordCount: 0,
      tips: ["לא הוזן טקסט שורה תחתונה (Direct Answer) עבור מנועי AI Search"],
    };
  }

  const clean = text.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  let score = 50; // baseline
  const tips: string[] = [];

  // 1. Word Count Check (Ideal: 40 - 75 words)
  if (wordCount >= 40 && wordCount <= 75) {
    score += 20;
  } else if (wordCount >= 25 && wordCount < 40) {
    score += 10;
    tips.push("הטקסט מעט קצר. מומלץ להרחיב לכ-50 מילים עם פירוט טכני.");
  } else if (wordCount > 75 && wordCount <= 110) {
    score += 10;
    tips.push("הטקסט מעט ארוך. מנועי AI מעדיפים פסקאות תמציתיות של עד 70 מילים.");
  } else if (wordCount > 110) {
    score -= 15;
    tips.push("הטקסט ארוך מדי עבור ציטוט ישיר ב-AI Search. קצר ל-50-70 מילים.");
  } else {
    score -= 20;
    tips.push("הטקסט קצר מדי (פחות מ-25 מילים). מנועי AI יתעלמו ממנו כציטוט מרכזי.");
  }

  // 2. Fact & Statistics Check ($, ₪, numbers, percentages)
  const hasNumbers = /\d+/.test(clean);
  const hasPrices = /[$₪]|דולר|ש"ח|שקל/.test(clean);
  if (hasNumbers && hasPrices) {
    score += 15;
  } else if (hasNumbers || hasPrices) {
    score += 8;
    tips.push("מומלץ להוסיף מחיר מדויק בדולרים ושקלים לחיזוק עובדתי.");
  } else {
    tips.push("חסרים נתונים מספריים ועובדות קשיחות (מחירים, מפרט, אחוזים).");
  }

  // 3. Israel Context Check (customs, plug, shipping)
  const hasIsraelContext = /ישראל|מכס|75|אירופאי|EU|מע"מ|משלוח/.test(clean);
  if (hasIsraelContext) {
    score += 15;
  } else {
    tips.push("כדאי לציין התאמה לישראל (שקע אירופאי EU, פטור ממכס או זמני משלוח).");
  }

  // Cap score between 0 and 100
  score = Math.max(0, Math.min(100, score));

  let level: "excellent" | "good" | "needs_work" = "needs_work";
  if (score >= 80) level = "excellent";
  else if (score >= 60) level = "good";

  if (tips.length === 0) {
    tips.push("הטקסט מעולה ומותאם מושלם לציטוט ב-Google AI Overviews ו-SearchGPT!");
  }

  return {
    score,
    level,
    wordCount,
    tips,
  };
}
