import { GoogleGenAI } from "@google/genai";
import { AgentRole } from "../agent/types";

function getApiKey(): string {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "placeholder_for_build";
}

export const ai = new GoogleGenAI({
  apiKey: getApiKey(),
});

export function getGenAI(): GoogleGenAI {
  return new GoogleGenAI({ apiKey: getApiKey() });
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
