import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const expectedPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "alideals2025";
  const token = req.cookies.get("admin_token")?.value || req.headers.get("x-admin-token");

  if (token && token === expectedPassword) {
    return NextResponse.json({ authenticated: true });
  }

  // Local development convenience
  const host = req.headers.get("host") || "";
  if (!process.env.VERCEL && (host.startsWith("localhost:") || host.startsWith("127.0.0.1:"))) {
    return NextResponse.json({ authenticated: true, isLocalDev: true });
  }

  return NextResponse.json({ authenticated: false }, { status: 401 });
}
