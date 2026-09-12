import { NextRequest, NextResponse } from "next/server";
import { generateRonAltText } from "@/lib/agent/ron-copywriter";
import { verifyAdminAccess } from "@/lib/security/firewall";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const body = await req.json();
    const productTitle = String(body.productTitle || body.title || "").trim();
    const category = String(body.category || "").trim();

    if (!productTitle) {
      return NextResponse.json({ error: "חסרה כותרת מוצר לניסוח Alt Text" }, { status: 400 });
    }

    const altText = await generateRonAltText(productTitle, category);

    return NextResponse.json({
      success: true,
      altText,
      message: "Alt Text שיווקי מנוסח בהצלחה ע״י הסוכן רון",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate Alt text" }, { status: 500 });
  }
}
