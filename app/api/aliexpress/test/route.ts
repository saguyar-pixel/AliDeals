import { NextRequest, NextResponse } from "next/server";
import { aliExpressApi } from "@/lib/aliexpress";

export async function GET() {
  try {
    const result = await aliExpressApi.testConnection();
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "שגיאה בבדיקת החיבור" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await aliExpressApi.testConnection(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "שגיאה בבדיקת החיבור" },
      { status: 500 }
    );
  }
}
