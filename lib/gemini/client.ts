import { GoogleGenAI } from "@google/genai";
import { AgentRole } from "../agent/types";
import { safeReadJson, safeWriteJson } from "../agent/storage-helper";

export function setCachedGeminiKey(key: string | undefined | null) {
  if (key && typeof key === "string" && key.trim().length > 5 && !key.includes("placeholder")) {
    (globalThis as any)._cachedGeminiKey = key.trim();
  }
}

export function getApiKey(): string {
  // 1. Dynamic in-memory cache (populated by Supabase or admin settings)
  const cached = (globalThis as any)._cachedGeminiKey;
  if (cached && typeof cached === "string" && !cached.includes("placeholder")) {
    return cached;
  }
  // 2. Process environment variables
  if (process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes("placeholder")) {
    return process.env.GEMINI_API_KEY;
  }
  if (process.env.GOOGLE_API_KEY && !process.env.GOOGLE_API_KEY.includes("placeholder")) {
    return process.env.GOOGLE_API_KEY;
  }
  // 3. Local storage fallback
  try {
    const { analyticsDb } = require("../db/analytics-db");
    const settings = analyticsDb.getSettings();
    if (settings?.geminiApiKey && !settings.geminiApiKey.includes("placeholder")) {
      (globalThis as any)._cachedGeminiKey = settings.geminiApiKey;
      return settings.geminiApiKey;
    }
  } catch {}
  return "placeholder_for_build";
}

export async function getApiKeyAsync(): Promise<string> {
  const syncKey = getApiKey();
  if (syncKey && !syncKey.includes("placeholder")) {
    return syncKey;
  }
  try {
    const { supabaseDb } = await import("../db/supabase-db");
    const settings = await supabaseDb.getSettings();
    if (settings?.geminiApiKey && !settings.geminiApiKey.includes("placeholder")) {
      (globalThis as any)._cachedGeminiKey = settings.geminiApiKey;
      return settings.geminiApiKey;
    }
  } catch {}
  return syncKey;
}

export async function isGeminiConfigured(): Promise<boolean> {
  const key = await getApiKeyAsync();
  return Boolean(key && key.length > 5 && !key.includes("placeholder"));
}

export function isGeminiConfiguredSync(): boolean {
  const key = getApiKey();
  return Boolean(key && key.length > 5 && !key.includes("placeholder"));
}

export const ai = new GoogleGenAI({
  apiKey: getApiKey(),
});

export function getGenAI(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getApiKey() });
}

export async function getGenAIAsync(): Promise<GoogleGenAI> {
  const apiKey = await getApiKeyAsync();
  return new GoogleGenAI({ apiKey });
}

/**
 * Model Quota Configuration based on user's active Google AI Studio limits:
 * - gemini-3.6-flash: 5 RPM, 250K TPM, 20 RPD (Tier 1: Highest quality)
 * - gemini-3-flash: 5 RPM, 250K TPM, 20 RPD (Tier 2: Premium backup)
 * - gemini-3.5-flash-lite: 15 RPM, 250K TPM, 500 RPD (Tier 3: Workhorse primary)
 * - gemini-3.1-flash-lite: 15 RPM, 250K TPM, 500 RPD (Tier 4: Workhorse secondary)
 * - gemini-2.5-flash-lite: 10 RPM, 250K TPM, 20 RPD (Tier 5: API safety net)
 * Note: gemini-2.5-pro and gemini-3.1-pro have 0 quota and are excluded.
 */
export interface ModelQuotaConfig {
  id: string;
  name: string;
  dailyLimit: number;
  rpm: number;
  tier: number;
  roleDescription: string;
}

export const WATERFALL_MODELS: ModelQuotaConfig[] = [
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    dailyLimit: 20,
    rpm: 5,
    tier: 1,
    roleDescription: "איכות שיא לקופי, סקירות מעמיקות ו-GEO (20/יום, 5/דקה)",
  },
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    dailyLimit: 20,
    rpm: 5,
    tier: 2,
    roleDescription: "גיבוי פרימיום מהיר (20/יום, 5/דקה)",
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash-Lite",
    dailyLimit: 500,
    rpm: 15,
    tier: 3,
    roleDescription: "סוס עבודה ראשי – קטלוג, סקירות ולופים (500/יום, 15/דקה)",
  },
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash-Lite",
    dailyLimit: 500,
    rpm: 15,
    tier: 4,
    roleDescription: "סוס עבודה משני – גיבוי מסיבי (500/יום, 15/דקה)",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    dailyLimit: 20,
    rpm: 10,
    tier: 5,
    roleDescription: "רשת ביטחון API אחרונה (20/יום, 10/דקה)",
  },
];

export const TOTAL_DAILY_CAPACITY = WATERFALL_MODELS.reduce((acc, m) => acc + m.dailyLimit, 0); // 1,060

export const IMAGE_MODELS = {
  FLASH_3_1_IMAGE: "gemini-3.1-flash-image",
  FLASH_2_5_IMAGE: "gemini-2.5-flash-image",
  IMAGEN_3: "imagen-3.0-generate-002",
} as const;

/**
 * Backward-compatible MODELS constant
 */
export const MODELS = {
  FLASH_3_6: "gemini-3.6-flash",
  FLASH_3: "gemini-3-flash",
  FLASH_3_5_LITE: "gemini-3.5-flash-lite",
  FLASH_3_1_LITE: "gemini-3.1-flash-lite",
  FLASH_LITE: "gemini-2.5-flash-lite",
  // Image Models:
  IMAGE_FLASH_3_1: "gemini-3.1-flash-image",
  IMAGE_FLASH_2_5: "gemini-2.5-flash-image",
  IMAGEN_3: "imagen-3.0-generate-002",
  // Aliases:
  FLASH: "gemini-3.6-flash",
  PRO: "gemini-3.6-flash", // Routed to 3.6-flash because 2.5-pro has 0 quota
  FLASH_3_5: "gemini-3.5-flash-lite",
} as const;

export const DEFAULT_MODEL = MODELS.FLASH_3_6;
export const GEMINI_MODEL = DEFAULT_MODEL;

/* =========================================================================
   CIRCUIT BREAKER & QUOTA TRACKER
   Tracks daily calls per model and trips models when exhausted until UTC midnight.
   ========================================================================= */

interface CircuitBreakerState {
  date: string; // YYYY-MM-DD UTC
  modelCounts: Record<string, number>;
  exhaustedModels: Record<string, { exhaustedAt: number; unlockAt: number; reason: string }>;
  soloCallsToday: number;
  teamCallsToday: number;
  enrichmentCallsToday: number;
}

const CIRCUIT_BREAKER_FILE = "gemini_circuit_breaker.json";

function getTodayUtcString(): string {
  return new Date().toISOString().split("T")[0];
}

function getMidnightUtc(): number {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.getTime();
}

export function getCircuitBreakerState(): CircuitBreakerState {
  const today = getTodayUtcString();
  const defaultState: CircuitBreakerState = {
    date: today,
    modelCounts: {},
    exhaustedModels: {},
    soloCallsToday: 0,
    teamCallsToday: 0,
    enrichmentCallsToday: 0,
  };

  const state = safeReadJson<CircuitBreakerState>(CIRCUIT_BREAKER_FILE, defaultState);

  // Daily reset at midnight UTC
  if (state.date !== today) {
    state.date = today;
    state.modelCounts = {};
    state.exhaustedModels = {};
    state.soloCallsToday = 0;
    state.teamCallsToday = 0;
    state.enrichmentCallsToday = 0;
    safeWriteJson(CIRCUIT_BREAKER_FILE, state);
  }

  return state;
}

export function saveCircuitBreakerState(state: CircuitBreakerState): void {
  safeWriteJson(CIRCUIT_BREAKER_FILE, state);
}

export function isModelExhausted(modelId: string): boolean {
  const state = getCircuitBreakerState();
  const exhaust = state.exhaustedModels[modelId];
  if (exhaust) {
    if (Date.now() < exhaust.unlockAt) {
      return true;
    }
  }
  const config = WATERFALL_MODELS.find((m) => m.id === modelId);
  if (config && (state.modelCounts[modelId] || 0) >= config.dailyLimit) {
    return true;
  }
  return false;
}

export function markModelExhausted(modelId: string, reason: string = "Quota limit reached"): void {
  const state = getCircuitBreakerState();
  const unlockAt = getMidnightUtc();
  state.exhaustedModels[modelId] = {
    exhaustedAt: Date.now(),
    unlockAt,
    reason,
  };
  saveCircuitBreakerState(state);
}

export function recordModelUsage(modelId: string, callerTag?: string): void {
  const state = getCircuitBreakerState();
  state.modelCounts[modelId] = (state.modelCounts[modelId] || 0) + 1;

  const tag = (callerTag || "").toLowerCase();
  if (tag.includes("סולו") || tag.includes("solo")) {
    state.soloCallsToday = (state.soloCallsToday || 0) + 1;
  } else if (tag.includes("קטלוג") || tag.includes("enrichment")) {
    state.enrichmentCallsToday = (state.enrichmentCallsToday || 0) + 1;
  } else {
    state.teamCallsToday = (state.teamCallsToday || 0) + 1;
  }

  saveCircuitBreakerState(state);
}

export function getWaterfallStatus() {
  const state = getCircuitBreakerState();
  const models = WATERFALL_MODELS.map((m) => {
    const calls = state.modelCounts[m.id] || 0;
    const isExhausted = isModelExhausted(m.id);
    return {
      id: m.id,
      name: m.name,
      dailyLimit: m.dailyLimit,
      rpm: m.rpm,
      tier: m.tier,
      roleDescription: m.roleDescription,
      callsToday: calls,
      isExhausted,
      remainingToday: Math.max(0, m.dailyLimit - calls),
    };
  });

  const totalCallsToday = Object.values(state.modelCounts).reduce((a, b) => a + b, 0);
  const activeModel = models.find((m) => !m.isExhausted) || null;

  return {
    models,
    totalCallsToday,
    totalDailyCapacity: TOTAL_DAILY_CAPACITY,
    activeModelId: activeModel?.id || "offline_template",
    activeModelName: activeModel?.name || "מנוע תבניות אופליין (ללא מכסה)",
    soloCallsToday: state.soloCallsToday || 0,
    teamCallsToday: state.teamCallsToday || 0,
    enrichmentCallsToday: state.enrichmentCallsToday || 0,
  };
}

export interface GenerateFallbackOptions {
  contents: any;
  config?: any;
  preferredModel?: string;
  callerTag?: string; // e.g. "רוֹן (סולו CMS)", "אלון (צ'אט צוות)", "דנה (ניתוח CRO)", "העשרת קטלוג"
}

/**
 * Universal safe generator that cascades intelligently through the Waterfall:
 * 1. gemini-3.6-flash (Tier 1: 20 RPD)
 * 2. gemini-3-flash (Tier 2: 20 RPD)
 * 3. gemini-3.5-flash-lite (Tier 3: 500 RPD)
 * 4. gemini-3.1-flash-lite (Tier 4: 500 RPD)
 * 5. gemini-2.5-flash-lite (Tier 5: 20 RPD)
 * Immediately bypasses exhausted models without network round-trips.
 */
export async function generateWithFallback(
  aiClient: GoogleGenAI,
  params: GenerateFallbackOptions
) {
  // If aiClient does not have a valid key, try to refresh via getGenAIAsync()
  let client = aiClient;
  const currentKey = getApiKey();
  if (!currentKey || currentKey.includes("placeholder")) {
    const asyncKey = await getApiKeyAsync();
    if (asyncKey && !asyncKey.includes("placeholder")) {
      client = new GoogleGenAI({ apiKey: asyncKey });
    }
  }

  // Build the prioritized model cascade
  const modelsToTry: string[] = [];
  if (params.preferredModel && WATERFALL_MODELS.some((m) => m.id === params.preferredModel)) {
    modelsToTry.push(params.preferredModel);
  }
  WATERFALL_MODELS.forEach((m) => {
    if (!modelsToTry.includes(m.id)) {
      modelsToTry.push(m.id);
    }
  });

  let lastError: any = null;
  const callerLabel = params.callerTag || "סוכן AliDeals";

  for (let i = 0; i < modelsToTry.length; i++) {
    const modelId = modelsToTry[i];

    // Check circuit breaker before making request
    if (isModelExhausted(modelId)) {
      console.log(`[Model Waterfall] Skipping ${modelId} - circuit breaker active (exhausted until midnight UTC)`);
      continue;
    }

    try {
      const response = await client.models.generateContent({
        model: modelId,
        contents: params.contents,
        config: params.config,
      });

      if (response) {
        // Record successful call in circuit breaker
        recordModelUsage(modelId, params.callerTag);

        // Also notify cadence manager for unified daily tracking
        try {
          const { recordGeminiCall } = await import("../agent/cadence-manager");
          recordGeminiCall(params.callerTag);
        } catch {}

        // Log if fallback was triggered from tier 1
        if (i > 0) {
          console.info(`[Model Waterfall] ${callerLabel}: Successful generation via fallback model ${modelId} (Tier ${i + 1})`);
        }

        return response;
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err || "");
      const isQuotaHit =
        err?.status === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota") ||
        errMsg.includes("Quota exceeded");

      if (isQuotaHit) {
        console.warn(`[Model Waterfall] ${modelId} hit quota limit (429/RESOURCE_EXHAUSTED). Tripping circuit breaker until midnight UTC.`);
        markModelExhausted(modelId, errMsg);

        // Notify Agent Log feed about the fallback trip
        try {
          const { addAgentLog } = await import("../agent/team-orchestrator");
          addAgentLog(
            "orchestrator",
            "אלון (מפל מודלים)",
            "warning",
            `[מפל מודלים] מודל ${modelId} הגיע לתקרת מכסה יומית. המערכת עוברת אוטומטית למודל הבא במפל.`,
            { trippedModel: modelId, caller: callerLabel }
          );
        } catch {}
      } else {
        console.warn(`[Model Waterfall] Attempt with ${modelId} failed (${errMsg}). Trying next model in waterfall...`);
      }
    }
  }

  throw lastError || new Error("כל מודלי ה-Gemini במפל מוצו או אינם זמינים כרגע.");
}

/**
 * Dynamic Model Router:
 * The Orchestrator assigns the optimal starting model per agent role.
 * Starts with Tier 1 (gemini-3.6-flash) for maximum quality Hebrew and SEO.
 */
export function getModelForAgent(
  role: AgentRole,
  complexity: "standard" | "complex" = "standard"
): string {
  if (role === "creative") {
    return IMAGE_MODELS.FLASH_3_1_IMAGE;
  }
  // Always start at Tier 1 (gemini-3.6-flash); waterfall will auto-cascade to 3.5-flash-lite (500 RPD) if needed
  return "gemini-3.6-flash";
}

export interface GenerateImageOptions {
  prompt: string;
  referenceImageBase64?: string;
  referenceImageMimeType?: string;
  preferredModel?: string;
  callerTag?: string;
}

export interface GeneratedImageResult {
  base64: string;
  mimeType: string;
  buffer: Buffer;
  modelUsed: string;
}

/**
 * Universal safe image generator using Google Gen AI SDK
 * Cascades: gemini-3.1-flash-image -> gemini-2.5-flash-image -> imagen-3.0-generate-002
 */
export async function generateImageWithGemini(
  options: GenerateImageOptions
): Promise<GeneratedImageResult> {
  const client = await getGenAIAsync();
  const modelsToTry = [
    options.preferredModel,
    IMAGE_MODELS.FLASH_3_1_IMAGE,
    IMAGE_MODELS.FLASH_2_5_IMAGE,
    IMAGE_MODELS.IMAGEN_3,
  ].filter(Boolean) as string[];

  let lastError: any = null;
  const callerLabel = options.callerTag || "מיה (קריאייטיב סטודיו)";

  for (const modelId of modelsToTry) {
    if (isModelExhausted(modelId)) {
      console.log(`[Gemini Image Studio] Skipping ${modelId} - circuit breaker active`);
      continue;
    }

    try {
      // Build content parts
      const parts: any[] = [];
      if (options.referenceImageBase64) {
        parts.push({
          inlineData: {
            data: options.referenceImageBase64,
            mimeType: options.referenceImageMimeType || "image/jpeg",
          },
        });
      }
      parts.push({ text: options.prompt });

      const response = await client.models.generateContent({
        model: modelId,
        contents: [
          {
            role: "user",
            parts,
          },
        ],
        config: {
          responseModalities: ["IMAGE"],
        },
      });

      const candidates = response.candidates || [];
      for (const candidate of candidates) {
        const contentParts = candidate.content?.parts || [];
        for (const part of contentParts) {
          if (part.inlineData?.data) {
            const base64 = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || "image/png";
            const buffer = Buffer.from(base64, "base64");

            recordModelUsage(modelId, callerLabel);
            console.info(`[Gemini Image Studio] Successfully generated lifestyle image using ${modelId}`);

            return {
              base64,
              mimeType,
              buffer,
              modelUsed: modelId,
            };
          }
        }
      }
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err || "");
      if (
        err?.status === 429 ||
        errMsg.includes("429") ||
        errMsg.includes("RESOURCE_EXHAUSTED") ||
        errMsg.includes("quota")
      ) {
        markModelExhausted(modelId, errMsg);
      }
      console.warn(`[Gemini Image Studio] Attempt with ${modelId} failed: ${errMsg}. Trying fallback model...`);
    }
  }

  throw lastError || new Error("כל מודלי הפקת התמונות של Gemini אינם זמינים כרגע.");
}
