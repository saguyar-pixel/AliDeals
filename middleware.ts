import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const encoder = new TextEncoder();

function constantTimeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  const bytesA = encoder.encode(a);
  const bytesB = encoder.encode(b);
  if (bytesA.length !== bytesB.length) return false;
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) {
    diff |= bytesA[i] ^ bytesB[i];
  }
  return diff === 0;
}

function getEdgeAdminSecret(): string | null {
  const configured = (process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "").trim();
  if (configured) return configured;
  if (process.env.NODE_ENV !== "production") return "alideals2025";
  return null;
}

async function verifyEdgeSessionToken(token: string, secret: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") {
    return false;
  }
  const expiresAt = Number(parts[1]);
  const providedSig = parts[2];
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
    return false;
  }

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(`alideals_session_v1:${expiresAt}`)
    );
    const expectedHex = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return constantTimeEqual(providedSig, expectedHex);
  } catch {
    return false;
  }
}

async function isAuthorizedAdminRequest(req: NextRequest): Promise<boolean> {
  const secret = getEdgeAdminSecret();
  if (!secret) return false;

  const cookieToken = req.cookies.get("admin_token")?.value;
  if (cookieToken && (await verifyEdgeSessionToken(cookieToken, secret))) {
    return true;
  }

  const headerToken = req.headers.get("x-admin-token")?.trim();
  if (headerToken) {
    if (await verifyEdgeSessionToken(headerToken, secret)) return true;
    if (constantTimeEqual(headerToken, secret)) return true;
  }

  return false;
}

function isAuthorizedCronRequest(req: NextRequest): boolean {
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!cronSecret) return false;
  const auth = (req.headers.get("authorization") || "").trim();
  if (!auth.toLowerCase().startsWith("bearer ")) return false;
  const token = auth.slice(7).trim();
  return constantTimeEqual(token, cronSecret);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Add noindex header on /admin UI routes (AdminAuthGate renders login screen when unauthenticated)
  if (pathname.startsWith("/admin")) {
    const res = NextResponse.next();
    res.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    res.headers.set("Cache-Control", "no-store, max-age=0");
    return res;
  }

  // 2. Allow legitimate Vercel Cron execution on /api/agent/run-task when signed with CRON_SECRET
  if (pathname === "/api/agent/run-task" && req.method === "GET" && isAuthorizedCronRequest(req)) {
    return NextResponse.next();
  }

  // 3. Enforce strict authentication on all administrative, AI agent, affiliate, analytics & test APIs
  const isProtectedApi =
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/agent") ||
    pathname.startsWith("/api/affiliate") ||
    pathname.startsWith("/api/analytics") ||
    pathname.startsWith("/api/gemini") ||
    pathname.startsWith("/api/aliexpress");

  if (isProtectedApi) {
    const authorized = await isAuthorizedAdminRequest(req);
    if (!authorized) {
      return NextResponse.json(
        { error: "גישה נדחתה: נדרשת התחברות מנהל מאומתת." },
        { status: 401 }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/agent/:path*",
    "/api/affiliate/:path*",
    "/api/analytics/:path*",
    "/api/gemini/:path*",
    "/api/aliexpress/:path*",
  ],
};
