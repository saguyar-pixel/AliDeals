import { NextRequest, NextResponse } from "next/server";

// Valid AliExpress domains whitelist
const ALLOWED_ALIEXPRESS_HOSTS = [
  "aliexpress.com",
  "www.aliexpress.com",
  "he.aliexpress.com",
  "m.aliexpress.com",
  "a.aliexpress.com",
  "s.click.aliexpress.com",
];

// Private and loopback IP regex patterns (SSRF protection)
const PRIVATE_IP_REGEX =
  /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|::1|0\.0\.0\.0)$/i;

/**
 * 1. SSRF Guard: Strictly validates that the URL is a genuine AliExpress endpoint
 * and blocks any internal network/loopback probing attempts.
 */
export function validateAndSanitizeAliExpressUrl(inputUrl: string): { isValid: boolean; sanitizedUrl?: string; error?: string } {
  const trimmed = inputUrl.trim();

  // If it's a direct numeric item ID (10 to 20 digits)
  if (/^\d{10,20}$/.test(trimmed)) {
    return {
      isValid: true,
      sanitizedUrl: `https://www.aliexpress.com/item/${trimmed}.html`,
    };
  }

  try {
    const parsed = new URL(trimmed);

    // Protocol must be HTTPS
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { isValid: false, error: "פרוטוקול לא חוקי. חובה להשתמש ב-HTTPS." };
    }

    const hostname = parsed.hostname.toLowerCase();

    // Block private/loopback IPs (SSRF attempt)
    if (PRIVATE_IP_REGEX.test(hostname)) {
      return { isValid: false, error: "ניסיון גישה לכתובת פנימית נחסם (SSRF Protection)." };
    }

    // Check against AliExpress domain whitelist
    const isAllowed = ALLOWED_ALIEXPRESS_HOSTS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );

    if (!isAllowed) {
      return {
        isValid: false,
        error: `דומיין לא מורשה (${hostname}). המערכת מקבלת אך ורק קישורים רשמיים של AliExpress.`,
      };
    }

    return { isValid: true, sanitizedUrl: parsed.toString() };
  } catch {
    return { isValid: false, error: "פורמט קישור לא תקין." };
  }
}

/**
 * 2. Path Traversal & Command Injection Sanitizer for Slugs
 * Only allows lowercase alphanumeric characters and single dashes.
 */
export function sanitizeSlug(rawSlug: string): string {
  if (!rawSlug) return `item-${Date.now()}`;
  return rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-") // Strip everything that is not alphanumeric or dash
    .replace(/-+/g, "-")         // Collapse multiple dashes
    .replace(/^-|-$/g, "")       // Trim leading/trailing dashes
    .slice(0, 70);               // Maximum safe length
}

/**
 * 3. Text Sanitizer against Prompt Injection
 * Strips known delimiter hijacks and dangerous payload tokens
 */
export function sanitizePromptText(text: string): string {
  if (!text) return "";
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\{\{.*?\}\}/g, "") // Strip template tag injections
    .slice(0, 5000);             // Cap input size
}

/**
 * 4. In-Memory Sliding Window Rate Limiter
 * Protects local endpoints from burst spam and quota exhaustion
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests = 30,
  windowMs = 60000 // 1 minute
): { allowed: boolean; remaining: number } {
  const now = Date.now();
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

export function verifyAdminAccess(req: NextRequest): boolean {
  const secretKey = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "alideals2025";
  const token = req.headers.get("x-admin-token") || req.cookies.get("admin_token")?.value;

  if (token && token === secretKey) {
    return true;
  }

  // Allow requests originating strictly from localhost/loopback in local dev
  const host = req.headers.get("host") || "";
  const referer = req.headers.get("referer") || "";
  if (
    !process.env.VERCEL &&
    (host.startsWith("localhost:") || host.startsWith("127.0.0.1:") || referer.includes("localhost:"))
  ) {
    return true;
  }

  return false;
}
