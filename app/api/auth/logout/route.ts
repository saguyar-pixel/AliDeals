import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "התנתקת בהצלחה" });
  res.cookies.delete("admin_token");
  return res;
}
