import { NextRequest, NextResponse } from "next/server";
import { jsonDb, supabaseDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

export async function GET() {
  try {
    const menu = await supabaseDb.getNavigationMenu();
    return NextResponse.json({ success: true, menu });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch navigation" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל." }, { status: 403 });
    }

    const body = await req.json();
    if (!Array.isArray(body.menu)) {
      return NextResponse.json({ error: "פורמט תפריט לא תקין" }, { status: 400 });
    }

    await supabaseDb.saveNavigationMenu(body.menu);

    try {
      revalidatePath("/");
      revalidatePath("/admin/navigation");
    } catch {}

    return NextResponse.json({ success: true, message: "התפריט עודכן בהצלחה!", menu: body.menu });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update navigation" }, { status: 500 });
  }
}
