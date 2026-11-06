import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  createAdminSessionToken,
  getAdminSecret,
  getClientIp,
  safeCompare,
} from "@/lib/security/firewall";

export async function POST(req: NextRequest) {
  try {
    const clientIp = getClientIp(req);
    const rate = checkRateLimit(`admin_login:${clientIp}`, 5, 60_000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "יותר מדי ניסיונות התחברות. אנא המתן דקה ונסה שוב." },
        { status: 429 }
      );
    }

    const expectedPassword = getAdminSecret();
    if (!expectedPassword) {
      return NextResponse.json(
        {
          error:
            "שגיאת אבטחה: משתנה הסביבה ADMIN_PASSWORD אינו מוגדר בשרת הייצור. הגדר אותו ב-Vercel ונסה שוב.",
        },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const password = typeof body?.password === "string" ? body.password.trim() : "";

    if (!password || !safeCompare(password, expectedPassword)) {
      return NextResponse.json({ error: "סיסמת מנהל שגויה. נסה שוב." }, { status: 401 });
    }

    const sessionToken = createAdminSessionToken();
    if (!sessionToken) {
      return NextResponse.json({ error: "שגיאה ביצירת אסימון התחברות" }, { status: 500 });
    }

    const response = NextResponse.json({ success: true, message: "התחברת בהצלחה!" });

    // Store signed session token in HttpOnly cookie (never expose raw password to JS)
    response.cookies.set("admin_token", sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 14, // 14 days
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "שגיאה בביצוע התחברות" }, { status: 500 });
  }
}
