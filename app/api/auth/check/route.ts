import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/security/firewall";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (verifyAdminAccess(req)) {
    return NextResponse.json(
      { authenticated: true },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }

  return NextResponse.json(
    { authenticated: false },
    { status: 401, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
