import { NextRequest, NextResponse } from "next/server";
import { jsonDb, supabaseDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const menu = await supabaseDb.getNavigationMenu();
    return NextResponse.json(
      { success: true, menu, items: menu },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
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
    const menuItems = Array.isArray(body.menu) ? body.menu : (Array.isArray(body.items) ? body.items : null);
    if (!menuItems) {
      return NextResponse.json({ error: "פורמט תפריט לא תקין" }, { status: 400 });
    }

    await supabaseDb.saveNavigationMenu(menuItems);

    try {
      revalidatePath("/");
      revalidatePath("/", "layout");
      revalidatePath("/admin/navigation");
    } catch {}

    return NextResponse.json({
      success: true,
      message: "התפריט עודכן בהצלחה בענן וזמין מיידית באתר!",
      menu: menuItems,
      items: menuItems,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to update navigation" }, { status: 500 });
  }
}
