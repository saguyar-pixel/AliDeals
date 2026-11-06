import { NextRequest, NextResponse } from "next/server";
import { checkAllProductLinks } from "@/lib/aliexpress/link-checker";
import { verifyAdminAccess } from "@/lib/security/firewall";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 401 });
    }

    const summary = await checkAllProductLinks();
    return NextResponse.json({
      success: true,
      ...summary,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to check links";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
