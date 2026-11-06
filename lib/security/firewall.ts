import crypto from "crypto";
import { NextRequest } from "next/server";

// Valid AliExpress domains whitelist
export const ALLOWED_ALIEXPRESS_HOSTS = [
  "aliexpress.com",
  "www.aliexpress.com",
  "he.aliexpress.com",
  "m.aliexpress.com",
  "a.aliexpress.com",
  "s.click.aliexpress.com",
  "vi.aliexpress.com",
  "best.aliexpress.com",
];

// Private, loopback, link-local, metadata, and non-routable IP regex patterns (SSRF protection)
const PRIVATE_IP_REGEX =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[?::1\]?|\[?fc[0-9a-f]{2}:.*|\[?fd[0-9a-f]{2}:.*|\[?fe80:.*|\d+)$/i;

/**
 * Constant-time string comparison to prevent timing side-channel attacks.
 */
export function safeCompare(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string" || !a || !b) {
    return false;
  }
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Resolves the configured admin secret key.
 * Never falls back to a default password in production.
 */
export function getAdminSecret(): string | null {
  const configured = (process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "").trim();
  if (configured) {
    return configured;
  }
  if (process.env.NODE_ENV !== "production") {
    return "alideals2025";
  }
  return null;
}

/**
 * Creates an HMAC-SHA256 signed session token (`v1.<expiresAtMs>.<hexSignature>`)
 * so plaintext admin passwords are never stored in browser cookies.
 */
export function createAdminSessionToken(ttlMs: number = 14 * 24 * 60 * 60 * 1000): string | null {
  const secret = getAdminSecret();
  if (!secret) return null;

  const expiresAt = Date.now() + ttlMs;
  const payload = `alideals_session_v1:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `v1.${expiresAt}.${signature}`;
}

/**
 * Verifies an `admin_token` cookie value (signed `v1.<expiresAtMs>.<hexSignature>`).
 */
export function verifyAdminCookieValue(cookieValue?: string | null): boolean {
  if (!cookieValue || typeof cookieValue !== "string") return false;
  const secret = getAdminSecret();
  if (!secret) return false;

  const parts = cookieValue.split(".");
  if (parts.length === 3 && parts[0] === "v1") {
    const expiresAt = Number(parts[1]);
    const providedSig = parts[2];
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return false;
    }
    const expectedSig = crypto
      .createHmac("sha256", secret)
      .update(`alideals_session_v1:${expiresAt}`)
      .digest("hex");
    return safeCompare(providedSig, expectedSig);
  }

  return false;
}

/**
 * Verifies administrative access on an incoming API request.
 * Accepts either:
 *   1. Valid HMAC-signed `admin_token` HttpOnly session cookie
 *   2. Valid `x-admin-token` header matching `ADMIN_PASSWORD` (for server-to-server CLI tools)
 */
export function verifyAdminAccess(req: NextRequest): boolean {
  const secret = getAdminSecret();
  if (!secret) {
    return false;
  }

  const cookieToken = req.cookies.get("admin_token")?.value;
  if (cookieToken && verifyAdminCookieValue(cookieToken)) {
    return true;
  }

  const headerToken = req.headers.get("x-admin-token")?.trim();
  if (headerToken && (verifyAdminCookieValue(headerToken) || safeCompare(headerToken, secret))) {
    return true;
  }

  return false;
}

/**
 * Strictly verifies scheduled Cron requests using constant-time `CRON_SECRET` Bearer auth,
 * or falls back to verified admin credentials. Never trusts spoofable `x-vercel-cron` headers.
 */
export function verifyCronRequest(req: NextRequest): boolean {
  if (verifyAdminAccess(req)) {
    return true;
  }

  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) {
    return false;
  }

  const authHeader = (req.headers.get("authorization") || "").trim();
  if (!authHeader.toLowerCase().startsWith("bearer ")) {
    return false;
  }

  const bearerToken = authHeader.slice(7).trim();
  return safeCompare(bearerToken, cronSecret);
}

/**
 * Extracts best-effort client IP for rate limiting.
 */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

/**
 * 1. SSRF & Open Redirect Guard: Strictly validates that the URL is a genuine AliExpress HTTPS endpoint
 * and blocks any internal network, loopback, or metadata probing attempts.
 */
export function validateAndSanitizeAliExpressUrl(inputUrl: string): {
  isValid: boolean;
  sanitizedUrl?: string;
  error?: string;
} {
  const trimmed = String(inputUrl || "")
    .trim()
    .replace(/^[?&/ "'`]+/, "")
    .replace(/["'`]+$/, "");

  if (!trimmed) {
    return { isValid: false, error: "כתובת קישור ריקה." };
  }

  // Direct numeric item ID (10 to 20 digits)
  if (/^\d{10,20}$/.test(trimmed)) {
    return {
      isValid: true,
      sanitizedUrl: `https://www.aliexpress.com/item/${trimmed}.html`,
    };
  }

  try {
    const parsed = new URL(trimmed);

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { isValid: false, error: "פרוטוקול לא חוקי. חובה להשתמש ב-HTTPS." };
    }

    // Prevent embedded credentials in URL (e.g. https://aliexpress.com@evil.com)
    if (parsed.username || parsed.password) {
      return { isValid: false, error: "קישור מכיל פרטי הזדהות אסורים." };
    }

    const hostname = parsed.hostname.toLowerCase();

    if (PRIVATE_IP_REGEX.test(hostname)) {
      return { isValid: false, error: "ניסיון גישה לכתובת פנימית נחסם (SSRF Protection)." };
    }

    const isAllowed = ALLOWED_ALIEXPRESS_HOSTS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return {
        isValid: false,
        error: `דומיין לא מורשה (${hostname}). המערכת מקבלת אך ורק קישורים רשמיים של AliExpress.`,
      };
    }

    // Upgrade http -> https on verified AliExpress domains
    parsed.protocol = "https:";

    return { isValid: true, sanitizedUrl: parsed.toString() };
  } catch {
    // Only extract item ID fallback if string looks like an aliexpress path without scheme
    const aliHostMatch = trimmed.match(/^(?:www\.|he\.|m\.)?aliexpress\.com\/item\/(\d{10,20})\.html/i);
    if (aliHostMatch && aliHostMatch[1]) {
      return {
        isValid: true,
        sanitizedUrl: `https://www.aliexpress.com/item/${aliHostMatch[1]}.html`,
      };
    }
    return { isValid: false, error: "פורמט קישור לא תקין." };
  }
}

/**
 * 2. Path Traversal & Command Injection Sanitizer for Slugs
 */
export function sanitizeSlug(rawSlug: string, fallbackPrefix: string = "page"): string {
  if (!rawSlug || typeof rawSlug !== "string") {
    return `${fallbackPrefix}-${Date.now()}`;
  }

  let decoded = rawSlug;
  try {
    decoded = decodeURIComponent(rawSlug);
  } catch {
    decoded = rawSlug;
  }

  const cleaned = decoded
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9\u0590-\u05FF-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100)
    .replace(/-+$/, "");

  if (!cleaned) {
    return `${fallbackPrefix}-${Date.now()}`;
  }

  return cleaned;
}

/**
 * 3. Text Sanitizer against Prompt Injection & XSS Script Payloads
 */
export function sanitizePromptText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/vbscript:/gi, "")
    .replace(/\{\{.*?\}\}/g, "")
    .slice(0, 5000);
}

/**
 * 4. Safe JSON-LD / Inline Script Serializer
 * Escapes `<`, `>`, and `&` to prevent `</script><script>` breakout XSS.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

/**
 * 5. Defensive SVG Sanitizer
 * Strips `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`,
 * inline `on*` event handlers, and `javascript:` / `data:text/html` URIs.
 */
export function sanitizeSvgMarkup(rawSvg: string): string {
  if (!rawSvg || typeof rawSvg !== "string") return "";
  return rawSvg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<script[^>]*\/?>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<(iframe|object|embed|applet|meta|link|base)\b[^>]*>([\s\S]*?<\/\1>)?/gi, "")
    .replace(/\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(?:href|xlink:href|src|action|formaction)\s*=\s*(?:"\s*(?:javascript|vbscript|data:text\/html)[^"]*"|'\s*(?:javascript|vbscript|data:text\/html)[^']*')/gi, "");
}

/**
 * 6. Bounded In-Memory Sliding Window Rate Limiter
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_RATE_LIMIT_ENTRIES = 5000;

export function checkRateLimit(
  identifier: string,
  maxRequests = 30,
  windowMs = 60000
): { allowed: boolean; remaining: number } {
  const now = Date.now();

  if (rateLimitMap.size > MAX_RATE_LIMIT_ENTRIES) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (now > v.resetAt) rateLimitMap.delete(k);
    }
  }

  const record = rateLimitMap.get(identifier);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  record.count += 1;
  return { allowed: true, remaining: maxRequests - record.count };
}
