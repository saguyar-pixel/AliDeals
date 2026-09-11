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
  // Lowest latency and token cost for quick data extraction
  FLASH_LITE: "gemini-2.5-flash-lite",
  // Deep reasoning for complex comparisons & deep market analysis
  PRO: "gemini-2.5-pro",
  // Fallback stable
  FLASH_2_0: "gemini-2.0-flash",
} as const;

export const DEFAULT_MODEL = MODELS.FLASH;
export const GEMINI_MODEL = DEFAULT_MODEL;

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
