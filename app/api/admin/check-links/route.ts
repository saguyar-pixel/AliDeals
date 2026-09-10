import { NextResponse } from "next/server";
import { checkAllProductLinks } from "@/lib/aliexpress/link-checker";

export async function POST() {
  try {
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
