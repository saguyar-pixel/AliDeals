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
  const isHighTier = data.priceUsd >= 75 && (data.priceIls ? data.priceIls <= 999 : data.priceUsd <= 270);
  const taxBadgeText = isTaxExempt
    ? "✓ פטור מלא ממכס ומע\"מ (מתחת ל-75$)"
    : isHighTier
    ? "💎 פרימיום שווה (עד 999 ₪) - כולל מע\"מ כחוק"
    : "מעל 75$ - ייתכן חיוב מע\"מ (17%)";
  const taxBadgeColor = isTaxExempt ? "#10B981" : isHighTier ? "#F59E0B" : "#EF4444";

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
 * Room and Domestic Atmosphere Mapping for Authentic Israeli Settings
 */
function getIsraeliDomesticSetting(category?: string): string {
  const cat = (category || "").toLowerCase();

  if (cat.includes("מטבח") || cat.includes("kitchen") || cat.includes("אוכל") || cat.includes("cooking")) {
    return "a bright, modern Israeli apartment kitchen with light quartz countertops, subtle espresso maker in the background, and gentle natural morning light";
  }
  if (cat.includes("רכב") || cat.includes("car") || cat.includes("auto")) {
    return "the clean, organized interior of a modern family car on a bright sunny Israeli day, photographed through the car window with warm ambient natural light";
  }
  if (cat.includes("מחשב") || cat.includes("אלקטרוניקה") || cat.includes("desk") || cat.includes("tech") || cat.includes("גאדג'ט")) {
    return "a contemporary sunlit home office desk in an Israeli apartment with warm Scandinavian wood, a clean laptop setup, and a small potted succulent in soft focus";
  }
  if (cat.includes("ספורט") || cat.includes("טיולים") || cat.includes("outdoor") || cat.includes("camping")) {
    return "a sunny Tel Aviv urban balcony or sun-drenched outdoor patio overlooking Mediterranean eucalyptus and clear blue skies";
  }
  if (cat.includes("בית") || cat.includes("home") || cat.includes("תאורה") || cat.includes("bedroom")) {
    return "a warm, sun-drenched Israeli living room with a comfortable linen sofa, warm wood parquet, indoor plants, and soft afternoon Mediterranean sunlight";
  }
  return "a stylish, sun-drenched contemporary Israeli apartment with natural light, clean minimalist interior design, and subtle indoor greenery";
}

/**
 * Maya's Realistic Lifestyle Generation Engine (No Hallucinations, Preserves Product Identity)
 * Produces photorealistic images of a person using the real product in a natural Israeli setting.
 */
export function buildMayaLifestylePrompt(
  product: AliExpressProduct,
  options?: {
    titleHe?: string;
    category?: string;
    persona?: "man" | "woman" | "family" | "neutral";
  }
): string {
  const persona = options?.persona || "woman";
  const personaDesc =
    persona === "man"
      ? "An attractive, realistic 30-year-old Israeli man with natural stubble, wearing a casual premium t-shirt"
      : persona === "woman"
      ? "A stylish, realistic 28-year-old Israeli woman with natural makeup, wearing casual contemporary home attire"
      : persona === "family"
      ? "A modern young Israeli couple in their welcoming home"
      : "A modern consumer in their twenties";

  const cleanTitle = options?.titleHe || product.titleHe || product.originalTitle;
  const settingDesc = getIsraeliDomesticSetting(options?.category || product.category);

  return `
Create an authentic, photorealistic editorial lifestyle photo of:
${personaDesc} naturally and comfortably interacting with and using the exact product shown in the reference image:
Product: ${cleanTitle}.
Setting: ${settingDesc}.

CRITICAL ANTI-HALLUCINATION AND FIDELITY RULES:
1. PRODUCT INTEGRITY: The product's physical shape, buttons, ports, logos, proportions, and exact color palette MUST match the reference image 100%. No extra fantasy dials, no distorted geometry.
2. NATURAL HUMAN INTERACTION: Anatomically correct hands with 5 fingers naturally holding or touching the product. No floating hands, no weird poses.
3. AUTHENTIC ENVIRONMENT: Set inside ${settingDesc}. Natural sunlit atmosphere, realistic Mediterranean lighting.
4. CAMERA AESTHETICS: Photographed on a Sony A7R V with 50mm f/1.8 lens, natural soft depth of field, sharp focus on the product and authentic human interaction.
5. NO TEXT / NO WATERMARKS: Clean, unbranded editorial photograph suitable for a premium consumer review publication.
  `.trim();
}

export interface MayaImageRequest {
  product: AliExpressProduct;
  titleHe?: string;
  category?: string;
  persona?: "man" | "woman" | "family" | "neutral";
}

export interface MayaImageResult {
  success: boolean;
  imageUrl: string;
  isAiGenerated: boolean;
  promptUsed?: string;
  modelUsed?: string;
  error?: string;
}

/**
 * Maya's Complete Automated Image Pipeline:
 * 1. Fetches product reference image from AliExpress CDN
 * 2. Injects rich Israeli domestic context + Hebrew title
 * 3. Calls Gemini Flash Image generation with multimodal image reference
 * 4. Uploads generated high-res image to Supabase Storage (bucket: product-media)
 * 5. Falls back seamlessly to the cleanest seller gallery image if AI quota is exhausted
 */
export async function generateMayaLifestyleImage(
  request: MayaImageRequest
): Promise<MayaImageResult> {
  const { product, titleHe, category, persona = "woman" } = request;

  // 1. Determine fallback clean seller image first
  let fallbackUrl = product.mainImage || "";
  if (product.galleryImages && product.galleryImages.length > 1) {
    // Gallery image #1 or #2 is usually the cleanest studio/lifestyle shot
    fallbackUrl = product.galleryImages[1] || product.galleryImages[0] || product.mainImage;
  }
  if (fallbackUrl.startsWith("//")) {
    fallbackUrl = `https:${fallbackUrl}`;
  }

  // 2. Fetch Reference Image as Buffer for Multimodal Grounding
  let referenceImageBase64: string | undefined = undefined;
  let referenceImageMimeType = "image/jpeg";

  let targetRefUrl = product.mainImage || "";
  if (targetRefUrl.startsWith("//")) {
    targetRefUrl = `https:${targetRefUrl}`;
  }

  if (targetRefUrl && targetRefUrl.startsWith("http")) {
    try {
      const imgRes = await fetch(targetRefUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        referenceImageBase64 = Buffer.from(arrayBuffer).toString("base64");
        referenceImageMimeType = imgRes.headers.get("content-type") || "image/jpeg";
      }
    } catch (fetchErr) {
      console.warn("[Maya Image Studio] Failed to fetch reference image for multimodal conditioning:", fetchErr);
    }
  }

  // 3. Build Rich Contextual Lifestyle Prompt
  const prompt = buildMayaLifestylePrompt(product, {
    titleHe,
    category,
    persona,
  });

  // 4. Try AI Image Generation via Gemini Image Models
  try {
    const { generateImageWithGemini } = await import("./client");
    const genResult = await generateImageWithGemini({
      prompt,
      referenceImageBase64,
      referenceImageMimeType,
      callerTag: "מיה (סטודיו לייפסטייל - Gemini Flash Image)",
    });

    if (genResult && genResult.buffer) {
      // 5. Upload to Supabase Storage
      const { supabaseDb } = await import("../db/supabase-db");
      if (supabaseDb.isConfigured()) {
        const fileName = `lifestyle/${product.aliId}_${Date.now()}.png`;
        const upload = await supabaseDb.uploadMedia(
          "product-media",
          fileName,
          genResult.buffer,
          genResult.mimeType || "image/png"
        );

        if (upload.success && upload.publicUrl) {
          try {
            const { addAgentLog } = await import("../agent/team-orchestrator");
            addAgentLog(
              "creative",
              "מיה",
              "success",
              `תמונת לייפסטייל ישראלית אותנטית הופקה בהצלחה באמצעות מודל ${genResult.modelUsed} ונשמרה ב-Storage!`,
              { publicUrl: upload.publicUrl, model: genResult.modelUsed }
            );
          } catch {}

          return {
            success: true,
            imageUrl: upload.publicUrl,
            isAiGenerated: true,
            promptUsed: prompt,
            modelUsed: genResult.modelUsed,
          };
        }
      }

      // If Supabase Storage is offline, return data URL as resilient backup
      const dataUrl = `data:${genResult.mimeType};base64,${genResult.base64}`;
      return {
        success: true,
        imageUrl: dataUrl,
        isAiGenerated: true,
        promptUsed: prompt,
        modelUsed: genResult.modelUsed,
      };
    }
  } catch (genErr: any) {
    console.warn("[Maya Image Studio] AI generation bypassed or failed, using clean seller gallery fallback:", genErr?.message);
    try {
      const { addAgentLog } = await import("../agent/team-orchestrator");
      addAgentLog(
        "creative",
        "מיה",
        "info",
        `הפקת לייפסטייל AI לא הייתה זמינה (${genErr?.message || "מכסה"}). שולבה תמונת מוצר נקייה מגלריית המוכר כגיבוי בטוח.`,
        { fallbackUrl }
      );
    } catch {}
  }

  // Graceful Fallback to seller's best gallery photo
  return {
    success: true,
    imageUrl: fallbackUrl,
    isAiGenerated: false,
    promptUsed: prompt,
  };
}
