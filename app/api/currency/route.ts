import { NextResponse } from "next/server";
import { getUsdToIlsRate } from "@/lib/currency/rates";

export async function GET() {
  try {
    const rateData = await getUsdToIlsRate();
    return NextResponse.json({
      success: true,
      ...rateData,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to fetch currency rate";
    return NextResponse.json({ success: false, rate: 3.65, error: msg }, { status: 500 });
  }
}
