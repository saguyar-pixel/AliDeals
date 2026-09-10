import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();

    const expectedPassword = process.env.ADMIN_PASSWORD || process.env.ADMIN_SECRET_KEY || "alideals2025";

    if (!password || password !== expectedPassword) {
      return NextResponse.json({ error: "סיסמת מנהל שגויה. נסה שוב." }, { status: 401 });
    }

    const response = NextResponse.json({ success: true, message: "התחברת בהצלחה!" });

    // Set auth cookie
    response.cookies.set("admin_token", expectedPassword, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      secure: process.env.NODE_ENV === "production",
    });

    return response;
  } catch {
    return NextResponse.json({ error: "שגיאה בביצוע התחברות" }, { status: 500 });
  }
}
