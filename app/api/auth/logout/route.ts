import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true, message: "התנתקת מהמערכת" });
  response.cookies.set("admin_token", "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
