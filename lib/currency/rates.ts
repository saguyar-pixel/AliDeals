/**
 * Live Currency Exchange Rate Service for AliDeals
 * Fetches real-time USD to ILS exchange rate with 12-hour caching and safe fallback
 */

interface CachedRate {
  rate: number;
  updatedAt: string;
  source: string;
}

let cachedRate: CachedRate = {
  rate: 3.65,
  updatedAt: new Date().toISOString(),
  source: "default",
};

let lastFetchTimestamp = 0;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export async function getUsdToIlsRate(): Promise<CachedRate> {
  const now = Date.now();

  // Return cached if fresh
  if (now - lastFetchTimestamp < CACHE_TTL_MS && cachedRate.source !== "default") {
    return cachedRate;
  }

  try {
    // Open reliable public exchange rates endpoint
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      next: { revalidate: 43200 }, // 12h Next.js cache
      headers: { "User-Agent": "AliDeals-Currency-Bot/1.0" },
    });

    if (res.ok) {
      const data = await res.json();
      const ils = data?.rates?.ILS;
      if (typeof ils === "number" && ils > 2.5 && ils < 5.5) {
        cachedRate = {
          rate: Math.round(ils * 100) / 100,
          updatedAt: new Date().toISOString(),
          source: "open.er-api.com",
        };
        lastFetchTimestamp = now;
        return cachedRate;
      }
    }
  } catch (err) {
    console.warn("Currency rate fetch failed, falling back to cached/default rate:", err);
  }

  return cachedRate;
}

/**
 * Synchronous helper using the current cached rate
 */
export function getCurrentIlsRate(): number {
  return cachedRate.rate;
}

export function convertUsdToIls(usd: number, customRate?: number): number {
  const rate = customRate || cachedRate.rate;
  return Math.round(usd * rate * 10) / 10;
}

export function convertIlsToUsd(ils: number, customRate?: number): number {
  const rate = customRate || cachedRate.rate;
  return Math.round((ils / rate) * 100) / 100;
}
