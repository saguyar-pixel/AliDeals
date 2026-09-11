import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const pages = await supabaseDb.getPages();
    return NextResponse.json({ success: true, count: pages.length, pages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load pages" }, { status: 500 });
  }
}
