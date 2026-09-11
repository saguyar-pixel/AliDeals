import { NextRequest, NextResponse } from "next/server";
import { jsonDb } from "@/lib/db";
import { safeReadJson, safeWriteJson } from "@/lib/agent/storage-helper";
import { aliExpressApi } from "@/lib/aliexpress";

interface ClickRecord {
  id: string;
  timestamp: string;
  productId: string;
  productTitle: string;
  priceUsd: number;
  priceIls: number;
  pageSlug: string;
  linkType: string;
  destinationUrl: string;
  userAgent?: string;
  ipHash?: string;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.redirect(new URL("/", req.url), 302);
    }

    // Resolve canonical product
    const prod = jsonDb.getProductById(id) || jsonDb.getProductByAliId(id);

    // Extract query tracking parameters
    const searchParams = req.nextUrl.searchParams;
    const source = searchParams.get("source") || searchParams.get("from") || "direct";
    const ctaVariant = searchParams.get("cta") || "default";
    const pageSlug = searchParams.get("page") || "unknown";

    // Base destination URL
    let targetUrl = prod?.affiliateUrl || prod?.aliUrl;
    if (!targetUrl) {
      // Fallback if product not found in DB or generic alias requested
      if (id === "coupon" || id === "deal" || id === "global" || id === "aliexpress") {
        targetUrl = "https://s.click.aliexpress.com/e/_DkU2p9l";
      } else {
        targetUrl = /^\d+$/.test(id)
          ? `https://www.aliexpress.com/item/${id}.html`
          : "https://s.click.aliexpress.com/e/_DkU2p9l";
      }
    }

    // Guarantee affiliate link: If targetUrl is a raw item link, generate official affiliate link
    if (!targetUrl.includes("s.click.aliexpress.com") && !targetUrl.includes("/e/")) {
      try {
        const generated = await aliExpressApi.generateAffiliateLink(targetUrl, {
          subId1: "alideals",
          subId2: pageSlug.slice(0, 20),
          subId3: `${source}_${ctaVariant}`.slice(0, 20),
        });
        if (generated && (generated.includes("s.click.aliexpress.com") || generated.includes("/e/"))) {
          targetUrl = generated;
          // Cache in DB if product exists
          if (prod) {
            jsonDb.upsertProduct({ ...prod, affiliateUrl: generated, updatedAt: new Date().toISOString() });
          }
        }
      } catch {
        // fallback to targetUrl
      }
    }

    // Inject SubID & UTM tracking
    try {
      const urlObj = new URL(targetUrl);
      urlObj.searchParams.set("sub1", "alideals");
      urlObj.searchParams.set("sub2", pageSlug.slice(0, 30));
      urlObj.searchParams.set("sub3", `${source}_${ctaVariant}`.slice(0, 30));
      urlObj.searchParams.set("utm_source", "alideals");
      urlObj.searchParams.set("utm_medium", "affiliate");
      urlObj.searchParams.set("utm_campaign", pageSlug.slice(0, 30));
      targetUrl = urlObj.toString();
    } catch {
      // If URL parsing fails for any malformed link, proceed with targetUrl
    }

    // Server-Side Outbound Click Logging (100% resilient to AdBlock & Cloud Synced)
    try {
      const clicks = safeReadJson<ClickRecord[]>("analytics_clicks.json", []);
      const newEntry: ClickRecord = {
        id: `clk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        timestamp: new Date().toISOString(),
        productId: prod?.aliId || id,
        productTitle: prod?.titleHe || prod?.originalTitle || "מוצר אלי אקספרס",
        priceUsd: prod?.priceUsd || 0,
        priceIls: prod?.priceIls || 0,
        pageSlug,
        linkType: `${source}_${ctaVariant}`,
        destinationUrl: targetUrl,
        userAgent: req.headers.get("user-agent") || undefined,
      };
      clicks.unshift(newEntry);
      safeWriteJson("analytics_clicks.json", clicks.slice(0, 1000));

      const { supabaseDb } = await import("@/lib/db");
      if (supabaseDb.isConfigured()) {
        supabaseDb.recordClick({
          id: newEntry.id,
          timestamp: newEntry.timestamp,
          productId: newEntry.productId,
          productTitle: newEntry.productTitle,
          priceUsd: newEntry.priceUsd,
          priceIls: newEntry.priceIls,
          pageSlug: newEntry.pageSlug,
          linkType: "cta_button",
          destinationUrl: newEntry.destinationUrl,
          referrer: req.headers.get("referer") || undefined,
        }).catch(() => {});
      }
    } catch (logErr) {
      console.warn("Server click logging error:", logErr);
    }

    // 307 Temporary Redirect: ensures clean browser jump without caching affiliate destination
    return NextResponse.redirect(targetUrl, 307);
  } catch (err) {
    console.error("Redirect engine error:", err);
    return NextResponse.redirect(new URL("/", req.url), 302);
  }
}
