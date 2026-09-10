import { jsonDb } from "@/lib/db";

export interface LinkCheckResult {
  productId: string;
  aliId: string;
  title: string;
  url: string;
  status: "ok" | "broken" | "redirect_issue" | "timeout";
  httpCode?: number;
  checkedAt: string;
  error?: string;
}

export async function checkSingleProductLink(
  productId: string,
  targetUrl: string,
  title: string,
  aliId: string
): Promise<LinkCheckResult> {
  const now = new Date().toISOString();
  if (!targetUrl || !targetUrl.startsWith("http")) {
    return {
      productId,
      aliId,
      title,
      url: targetUrl || "",
      status: "broken",
      error: "כתובת קישור חסרה או אינה תקינה",
      checkedAt: now,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    // Use HEAD first for speed and bandwidth efficiency
    const res = await fetch(targetUrl, {
      method: "HEAD",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      },
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (res.status >= 200 && res.status < 400) {
      return {
        productId,
        aliId,
        title,
        url: targetUrl,
        status: "ok",
        httpCode: res.status,
        checkedAt: now,
      };
    } else if (res.status === 404 || res.status === 410) {
      return {
        productId,
        aliId,
        title,
        url: targetUrl,
        status: "broken",
        httpCode: res.status,
        error: "המוצר הוסר מ-AliExpress (שגיאה 404/410)",
        checkedAt: now,
      };
    } else {
      return {
        productId,
        aliId,
        title,
        url: targetUrl,
        status: "redirect_issue",
        httpCode: res.status,
        error: `מענה שרת: ${res.status}`,
        checkedAt: now,
      };
    }
  } catch (err: unknown) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    return {
      productId,
      aliId,
      title,
      url: targetUrl,
      status: isTimeout ? "timeout" : "broken",
      error: isTimeout ? "פסק זמן בבדיקת השרת (Timeout)" : (err instanceof Error ? err.message : "שגיאת רשת"),
      checkedAt: now,
    };
  }
}

export async function checkAllProductLinks(): Promise<{
  totalChecked: number;
  brokenCount: number;
  results: LinkCheckResult[];
}> {
  const products = jsonDb.getAllProducts().filter((p) => p.status !== "inactive");
  const results: LinkCheckResult[] = [];

  for (const prod of products) {
    const targetUrl = prod.affiliateUrl || prod.aliUrl;
    const result = await checkSingleProductLink(
      prod.id,
      targetUrl,
      prod.titleHe || prod.originalTitle,
      prod.aliId
    );
    results.push(result);
  }

  const brokenCount = results.filter((r) => r.status === "broken").length;

  return {
    totalChecked: results.length,
    brokenCount,
    results,
  };
}
