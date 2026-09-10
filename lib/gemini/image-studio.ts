import { AliExpressProduct } from "../aliexpress/types";

export interface InfographicData {
  title: string;
  badge: string; // e.g. "בחירת העורכים"
  priceIls: number;
  priceUsd: number;
  rating: number;
  ordersCount: number;
  features: string[];
  taxBadge: string;
  productImageUrl: string;
}

/**
 * Maya's Hebrew Infographic Engine (100% vector sharpness, zero font hallucinations)
 */
export function generateHebrewInfographicSvg(data: InfographicData): string {
  const isTaxExempt = data.priceUsd < 75;
  const taxBadgeText = isTaxExempt ? "✓ פטור מלא ממכס ומע\"מ (מתחת ל-75$)" : "מעל 75$ - ייתכן חיוב מע\"מ (17%)";
  const taxBadgeColor = isTaxExempt ? "#10B981" : "#F59E0B";

  const safeTitle = (data.title || "מוצר אלי אקספרס").slice(0, 45);
  const safeFeatures = (data.features || [
    "איכות חומרים גבוהה",
    "שקע אירופאי (EU) תואם לישראל",
    "משלוח מעקב מהיר לישראל",
  ]).slice(0, 3);

  let safeImageUrl = String(data.productImageUrl || "");
  if (safeImageUrl.startsWith("//")) {
    safeImageUrl = `https:${safeImageUrl}`;
  }

  return `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="100%" height="100%" direction="rtl" style="font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A" />
      <stop offset="50%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.95" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.5" />
    </filter>
    <clipPath id="productClip">
      <rect x="50" y="100" width="550" height="600" rx="24" />
    </clipPath>
  </defs>

  <rect width="1200" height="800" fill="url(#bgGrad)" />

  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#334155" stroke-width="0.75" stroke-opacity="0.4" />
  </pattern>
  <rect width="1200" height="800" fill="url(#grid)" />

  <rect x="50" y="30" width="1100" height="50" rx="12" fill="#1E293B" fill-opacity="0.6" stroke="#334155" />
  <text x="1120" y="62" font-size="20" font-weight="bold" fill="#FF4747" text-anchor="end">AliDeals.co.il</text>
  <text x="960" y="62" font-size="16" fill="#94A3B8" text-anchor="end">| סקירת מפרט ואינפוגרפיקה רשמית</text>

  <g filter="url(#shadow)">
    <rect x="50" y="100" width="550" height="600" rx="24" fill="#FFFFFF" stroke="#334155" stroke-width="2" />
    <image href="${safeImageUrl}" x="50" y="100" width="550" height="600" preserveAspectRatio="xMidYMid meet" clip-path="url(#productClip)" />
  </g>

  <g transform="translate(80, 130)">
    <rect width="180" height="44" rx="22" fill="#0F172A" fill-opacity="0.85" stroke="#E2E8F0" stroke-width="1" />
    <text x="155" y="28" font-size="16" font-weight="bold" fill="#FBBF24" text-anchor="end">★ ${data.rating} / 5</text>
    <text x="25" y="28" font-size="13" fill="#E2E8F0">(${data.ordersCount}+ רכשו)</text>
  </g>

  <g transform="translate(640, 100)">
    <rect width="510" height="600" rx="24" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    <rect x="30" y="30" width="160" height="36" rx="8" fill="#FF4747" />
    <text x="110" y="54" font-size="15" font-weight="bold" fill="#FFFFFF" text-anchor="middle">👑 ${data.badge}</text>

    <text x="480" y="115" font-size="26" font-weight="bold" fill="#FFFFFF" text-anchor="end">${safeTitle}</text>

    <g transform="translate(30, 140)">
      <rect width="450" height="85" rx="16" fill="#0F172A" stroke="#334155" />
      <text x="430" y="40" font-size="15" fill="#94A3B8" text-anchor="end">מחיר מבצע עדכני באלי אקספרס</text>
      <text x="430" y="70" font-size="32" font-weight="bold" fill="#38BDF8" text-anchor="end">₪${data.priceIls}</text>
      <text x="280" y="70" font-size="20" fill="#94A3B8">($${data.priceUsd})</text>
    </g>

    <g transform="translate(30, 240)">
      <rect width="450" height="50" rx="12" fill="${taxBadgeColor}" fill-opacity="0.15" stroke="${taxBadgeColor}" stroke-width="1.5" />
      <text x="430" y="32" font-size="16" font-weight="bold" fill="${taxBadgeColor}" text-anchor="end">${taxBadgeText}</text>
    </g>

    <text x="480" y="330" font-size="18" font-weight="bold" fill="#E2E8F0" text-anchor="end">יתרונות מרכזיים שנבדקו:</text>

    ${safeFeatures
      .map(
        (feat, index) => `
      <g transform="translate(30, ${350 + index * 55})">
        <rect width="450" height="44" rx="10" fill="#1E293B" stroke="#334155" />
        <circle cx="425" cy="22" r="10" fill="#FF4747" />
        <text x="425" y="27" font-size="13" font-weight="bold" fill="#FFFFFF" text-anchor="middle">✓</text>
        <text x="400" y="27" font-size="15" font-weight="500" fill="#F1F5F9" text-anchor="end">${feat.slice(0, 42)}</text>
      </g>
    `
      )
      .join("")}

    <g transform="translate(30, 520)">
      <rect width="450" height="50" rx="12" fill="#0F172A" stroke="#38BDF8" stroke-width="1" stroke-dasharray="4" />
      <text x="430" y="31" font-size="14" fill="#38BDF8" font-weight="bold" text-anchor="end">🇮🇱 תאימות מלאה לישראל: שקע EU + משלוח עם מספר מעקב</text>
    </g>
  </g>
</svg>
  `.trim();
}

/**
 * Maya's Realistic Lifestyle Generation Engine (No Hallucinations, Preserves Product Identity)
 * Produces photorealistic images of a man or woman using the real product in a natural Israeli setting.
 */
export function buildMayaLifestylePrompt(
  product: AliExpressProduct,
  persona: "man" | "woman" | "family" = "woman"
): string {
  const personaDesc =
    persona === "man"
      ? "An attractive, realistic 30-year-old Israeli man with natural stubble, wearing casual modern clothing"
      : persona === "woman"
      ? "A stylish, realistic 28-year-old Israeli woman with natural makeup, wearing casual contemporary home attire"
      : "A modern young Israeli couple in their home";

  return `
Create an authentic, photorealistic editorial lifestyle photo of:
${personaDesc} naturally and comfortably using and interacting with the exact product shown in the reference image:
Product: ${product.originalTitle}.

CRITICAL ANTI-HALLUCINATION AND FIDELITY RULES:
1. PRODUCT INTEGRITY: The product's physical shape, buttons, ports, logos, proportions, and exact color palette MUST match the reference image 100%. No extra fantasy dials, no distorted geometry.
2. NATURAL HUMAN INTERACTION: Anatomically correct hands with 5 fingers naturally holding or touching the product. No floating hands, no weird poses.
3. AUTHENTIC ENVIRONMENT: Set inside a warm, beautiful contemporary sunlit apartment with wooden furniture, indoor plants, and natural morning/afternoon sunlight.
4. CAMERA AESTHETICS: Photographed on a Sony A7R V with 50mm f/1.8 lens, natural soft depth of field, sharp focus on the product and user's joyful authentic facial expression.
5. NO TEXT / NO WATERMARKS: Clean, unbranded editorial photograph suitable for a premium consumer review publication.
  `.trim();
}
