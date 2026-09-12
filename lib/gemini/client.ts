import { GoogleGenAI } from "@google/genai";
import { AgentRole } from "../agent/types";

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
 * Available Gemini Models for the Agent Team
 */
export const MODELS = {
  // Ultra-fast, multimodal, flagship hybrid reasoning model
  FLASH: "gemini-2.5-flash",
  // Latest 3.6 generation recommended by Google
  FLASH_3_6: "gemini-3.6-flash",
  // Lowest latency and token cost for quick data extraction
  FLASH_LITE: "gemini-2.5-flash-lite",
  // Deep reasoning for complex comparisons & deep market analysis
  PRO: "gemini-2.5-pro",
  // Fallbacks
  FLASH_2_0: "gemini-3.6-flash",
} as const;

export const DEFAULT_MODEL = MODELS.FLASH;
export const GEMINI_MODEL = DEFAULT_MODEL;

/**
 * Universal safe generator that auto-falls back to recommended models if one is deprecated
 */
export async function generateWithFallback(
  aiClient: GoogleGenAI,
  params: {
    contents: any;
    config?: any;
    preferredModel?: string;
  }
) {
  const modelsToTry = [
    params.preferredModel || MODELS.FLASH,
    MODELS.FLASH_3_6,
    "gemini-2.5-flash",
    "gemini-1.5-flash",
  ];

  let lastError: any = null;
  for (const model of Array.from(new Set(modelsToTry))) {
    try {
      const response = await aiClient.models.generateContent({
        model,
        contents: params.contents,
        config: params.config,
      });
      if (response) {
        return response;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`Model ${model} attempt failed, trying fallback:`, err?.message);
    }
  }
  throw lastError;
}

/**
 * Dynamic Model Router:
 * The Orchestrator assigns the optimal model per agent role and task complexity,
 * balancing creative depth with strict protection of the Free Tier limits.
 */
export function getModelForAgent(
  role: AgentRole,
  complexity: "standard" | "complex" = "standard"
): string {
  // If complex comparison (e.g. major TOP 5 guide), copywriter can use deeper reasoning
  if (role === "copywriter" && complexity === "complex") {
    // Default to Flash for free tier stability, or Pro if configured
    return process.env.GEMINI_PREFER_PRO === "true" ? MODELS.PRO : MODELS.FLASH;
  }

  // Data Analyst: Fast structured extraction
  if (role === "analyst") {
    return MODELS.FLASH;
  }

  // Creative Director & QA: Flash multimodal & deterministic output
  if (role === "creative" || role === "qa_officer") {
    return MODELS.FLASH;
  }

  // Orchestrator: Decision making & chat
  return MODELS.FLASH;
}
