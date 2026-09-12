import { db, clicksTracking } from "../db";

export interface TrackingParams {
  pageId?: string;
  productId?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  gclid?: string;
  fbclid?: string;
}

/**
 * Format dynamic SubIDs for AliExpress Portals Affiliate link
 * sub_id_1 = traffic source (e.g. facebook, google, tiktok, organic)
 * sub_id_2 = campaign name or adset (e.g. hy300_retargeting)
 * sub_id_3 = click identifier (e.g. gclid / fbclid / timestamp)
 */
export function buildSubIds(params: TrackingParams) {
  const subId1 = params.utmSource || "organic";
  const subId2 = params.utmCampaign || "general";
  const subId3 = params.gclid || params.fbclid || `c_${Date.now()}`;

  return { subId1, subId2, subId3 };
}

/**
 * Log outbound affiliate click to the database for arbitrage analytics
 */
export async function logAffiliateClick(params: TrackingParams) {
  const { subId1, subId2, subId3 } = buildSubIds(params);

  try {
    const id = `click_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    db.insert(clicksTracking)
      .values({
        id,
        pageId: params.pageId || null,
        productId: params.productId || null,
        subId1,
        subId2,
        subId3,
        utmSource: params.utmSource || null,
        utmMedium: params.utmMedium || null,
        utmCampaign: params.utmCampaign || null,
        clickedAt: new Date().toISOString(),
      })
      .run();

    // Persist to Supabase outbound_clicks table (Cloud SSOT)
    import("../db/supabase-db")
      .then(({ supabaseDb }) => {
        supabaseDb.recordClick({
          productId: params.productId || "direct",
          productTitle: params.productId ? `Product ${params.productId}` : "AliExpress Link",
          priceUsd: 0,
          priceIls: 0,
          pageSlug: params.pageId || "direct",
          linkType: subId1 || "direct",
          destinationUrl: "",
          referrer: params.utmSource,
        }).catch(() => {});
      })
      .catch(() => {});

    return { id, subId1, subId2, subId3 };
  } catch (err) {
    console.error("Failed to log affiliate click to DB:", err);
    return { id: "", subId1, subId2, subId3 };
  }
}
