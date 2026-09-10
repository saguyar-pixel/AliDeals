/**
 * Smart Hebrew to English E-Commerce Search Translator
 * Enables Israeli shoppers & marketers to search in natural Hebrew
 * and get real, accurate results from the global AliExpress product catalog.
 */

const ECOMMERCE_HEBREW_DICTIONARY: Record<string, string> = {
  // Electronics & Gadgets
  "מקרן": "projector",
  "מקרן נייד": "mini projector",
  "מקרן חכם": "smart projector 4k android",
  "מקרנים": "projector",
  "אוזניות": "wireless earbuds",
  "אוזניות אלחוטיות": "wireless earbuds bluetooth",
  "אוזניות בלוטוס": "bluetooth headphones",
  "אוזניות גיימינג": "gaming headset",
  "שעון חכם": "smartwatch",
  "שעון": "smart watch",
  "שעונים": "smart watch",
  "צמיד כושר": "fitness tracker smart band",
  "רחפן": "drone 4k camera",
  "רחפנים": "drone with camera",
  "רמקול": "bluetooth speaker",
  "רמקול נייד": "portable bluetooth speaker",
  "רמקול בלוטוס": "bluetooth speaker waterproof",
  "מטען": "charger",
  "מטען מהיר": "fast charger 65w gan",
  "מטען נייד": "power bank 20000mah",
  "סוללה ניידת": "power bank",
  "סוללת גיבוי": "power bank",
  "כבל": "cable",
  "כבל טעינה": "charging cable type c",
  "כבל טייפ סי": "type c cable",
  "כבל לאייפון": "lightning cable iphone",
  "מעמד לטלפון": "phone holder desk stand",
  "מעמד לרכב": "car phone holder magsafe",
  "כיסוי לטלפון": "phone case shockproof",
  "מגן מסך": "tempered glass screen protector",
  "מצלמת רכב": "dash cam car camera 4k",
  "מצלמת דרך": "dash cam car dvr",
  "מצלמת אבטחה": "wifi security camera outdoor",
  "בייבי מוניטור": "baby monitor camera",
  "מוניטור לתינוק": "baby monitor video",
  "טאבלט": "tablet android",
  "סטרימר": "tv box android",
  "שואב אבק": "vacuum cleaner",
  "שואב רובוטי": "robot vacuum cleaner",
  "שואב אלחוטי": "cordless vacuum cleaner",
  "שואב לרכב": "car vacuum cleaner portable",

  // Home & Kitchen
  "תאורה": "led light",
  "פס לדים": "led strip rgb",
  "מנורת לילה": "night light",
  "מנורת שולחן": "desk lamp led",
  "מנורה": "lamp",
  "בלנדר": "portable blender smoothie",
  "נינג'ה": "portable blender",
  "משקל": "digital scale kitchen",
  "משקל אדם": "smart body scale",
  "ברז": "kitchen faucet",
  "מטבח": "kitchen gadgets",
  "סכין שף": "chef knife kitchen",
  "פותחן": "bottle opener",
  "ארגונית": "organizer storage box",
  "מדפים": "shelves storage",

  // Computers & Gaming
  "מקלדת": "mechanical keyboard",
  "מקלדת מכנית": "mechanical gaming keyboard",
  "עכבר": "wireless gaming mouse",
  "עכבר אלחוטי": "ergonomic wireless mouse",
  "פד לעכבר": "gaming mouse pad xl",
  "רכזת usb": "usb c hub hdmi",
  "מפצל usb": "usb c hub adapter",
  "כרטיס זיכרון": "micro sd card",
  "דיסק און קי": "usb flash drive 128gb",
  "כרטיס מסך": "graphics card",
  "אוזניות מחשב": "pc headset with microphone",
  "גיימינג": "gaming accessories",
  "מעמד למחשב נייד": "laptop stand adjustable",

  // Tools & Car
  "כלי עבודה": "tools set",
  "מברגה": "cordless drill brushless",
  "מקדחה": "electric drill",
  "מד לחץ אוויר": "tire inflator portable air pump",
  "משאבת אוויר": "air pump car tire",
  "בוסטר לרכב": "car jump starter power bank",
  "גלאי": "laser distance meter",

  // Fashion & Outdoors
  "שעון יד": "men luxury watch",
  "תיק גב": "backpack waterproof travel",
  "פאוץ'": "waist bag sling",
  "ארנק": "rfid wallet leather",
  "משקפי שמש": "polarized sunglasses uv400",
  "פנס": "led flashlight rechargeable",
  "פנס ראש": "headlamp led rechargeable",
  "אוהל": "camping tent",
  "תרמיל": "hiking backpack",
};

export function isHebrewQuery(query: string): boolean {
  return /[\u0590-\u05FF]/.test(query);
}

/**
 * Translates a Hebrew query into English e-commerce keywords.
 * First consults high-accuracy shopping dictionary, then falls back to public translation endpoint.
 */
export async function translateHebrewSearch(query: string): Promise<{
  query: string;
  originalQuery: string;
  wasTranslated: boolean;
}> {
  const trimmed = query.trim();
  if (!trimmed || !isHebrewQuery(trimmed)) {
    return { query: trimmed, originalQuery: trimmed, wasTranslated: false };
  }

  // 1. Direct dictionary match
  const lowerHe = trimmed.toLowerCase();
  if (ECOMMERCE_HEBREW_DICTIONARY[lowerHe]) {
    return {
      query: ECOMMERCE_HEBREW_DICTIONARY[lowerHe],
      originalQuery: trimmed,
      wasTranslated: true,
    };
  }

  // 2. Partial / Substring dictionary match
  for (const [heKey, enVal] of Object.entries(ECOMMERCE_HEBREW_DICTIONARY)) {
    if (lowerHe.includes(heKey)) {
      return {
        query: enVal,
        originalQuery: trimmed,
        wasTranslated: true,
      };
    }
  }

  // 3. Fallback: Fast Google Translate API (public, no key required)
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=iw&tl=en&dt=t&q=${encodeURIComponent(
      trimmed
    )}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
      next: { revalidate: 86400 },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && Array.isArray(data[0])) {
        const translatedSegments = data[0].map((item: any) => item[0]).filter(Boolean);
        const translatedResult = translatedSegments.join(" ").trim();
        if (translatedResult) {
          return {
            query: translatedResult,
            originalQuery: trimmed,
            wasTranslated: true,
          };
        }
      }
    }
  } catch (e) {
    console.warn("Hebrew translation endpoint error, using raw query:", e);
  }

  // Fallback: return original query
  return { query: trimmed, originalQuery: trimmed, wasTranslated: false };
}
