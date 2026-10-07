import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { aliExpressApi, fetchAliExpressProduct } from "@/lib/aliexpress";
import { supabaseDb } from "@/lib/db/supabase-db";
import { jsonDb } from "@/lib/db";
import {
  evaluateProductCollision,
  buildAliHealthCheck,
  buildAlonRationale,
  ISRAELI_DEMAND_NICHES,
  IsraeliNicheConfig,
  RadarCandidateProduct,
} from "@/lib/agent/alon-radar";
import { AliExpressProduct } from "@/lib/aliexpress/types";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: נדרשת הרשאת מנהל" }, { status: 403 });
    }

    const body = await req.json();
    const { query, urlOrId, nicheKeyword } = body;

    // 1. Fetch current catalog for anti-collision checks
    let existingProducts: any[] = [];
    if (supabaseDb.isConfigured()) {
      try {
        existingProducts = await supabaseDb.getProducts();
      } catch {
        existingProducts = jsonDb.getProducts();
      }
    } else {
      existingProducts = jsonDb.getProducts();
    }

    const candidates: RadarCandidateProduct[] = [];

    // CASE A: Targeted single product by URL or ID
    if (urlOrId && String(urlOrId).trim()) {
      const targetInput = String(urlOrId).trim();
      const product = await fetchAliExpressProduct(targetInput);

      if (!product) {
        return NextResponse.json(
          { error: "לא הצלחנו למשוך את פרטי המוצר מ-AliExpress. אנא ודא שהקישור או המזהה תקינים." },
          { status: 404 }
        );
      }

      // Determine matching niche
      const matchedNiche: IsraeliNicheConfig =
        ISRAELI_DEMAND_NICHES.find((n) =>
          n.keyword.toLowerCase().includes(targetInput.toLowerCase()) ||
          product.originalTitle.toLowerCase().includes(n.keyword.toLowerCase())
        ) || {
          keyword: "custom",
          category: "אלקטרוניקה וגאדג'טים",
          archetype: "ELECTRONICS",
          labelHe: "מוצר מותאם אישית (HITL)",
        };

      const collision = evaluateProductCollision(product, existingProducts);
      const healthCheck = buildAliHealthCheck(product);
      const alonRationale = buildAlonRationale(product, collision, matchedNiche);

      candidates.push({
        product,
        niche: matchedNiche,
        collision,
        alonRationale,
        healthCheck,
      });

      return NextResponse.json({
        success: true,
        mode: "single",
        count: 1,
        candidates,
      });
    }

    // CASE B: Search query or niche search
    let searchKeywords = "GaN charger fast charging";
    let activeNiche: IsraeliNicheConfig = ISRAELI_DEMAND_NICHES[0];

    if (nicheKeyword) {
      const found = ISRAELI_DEMAND_NICHES.find((n) => n.keyword === nicheKeyword || n.labelHe === nicheKeyword);
      if (found) {
        activeNiche = found;
        searchKeywords = found.keyword;
      } else {
        searchKeywords = nicheKeyword;
      }
    } else if (query && String(query).trim()) {
      searchKeywords = String(query).trim();
      // Match or create custom niche
      const found = ISRAELI_DEMAND_NICHES.find(
        (n) => n.keyword.toLowerCase().includes(searchKeywords.toLowerCase()) || n.labelHe.includes(searchKeywords)
      );
      if (found) {
        activeNiche = found;
      } else {
        activeNiche = {
          keyword: searchKeywords,
          category: "כללי ומבצעים",
          archetype: "ELECTRONICS",
          labelHe: `חיפוש חופשי: ${searchKeywords}`,
        };
      }
    }

    const searchRes = await aliExpressApi.searchProducts({
      keywords: searchKeywords,
      pageSize: 15,
      sortBy: "LAST_VOLUME_DESC",
      maxPrice: 75,
    });

    const products = searchRes.products || [];

    for (const partial of products) {
      if (!partial.aliId) continue;

      // Ensure full product data
      const fullProd: AliExpressProduct = {
        aliId: String(partial.aliId),
        originalTitle: partial.originalTitle || "AliExpress Product",
        priceUsd: partial.priceUsd || 15,
        priceIls: partial.priceIls || Math.round((partial.priceUsd || 15) * 3.65),
        originalPriceUsd: partial.originalPriceUsd,
        discountPercent: partial.discountPercent,
        rating: partial.rating || 4.8,
        ordersCount: partial.ordersCount || 100,
        mainImage: partial.mainImage || "",
        galleryImages: partial.galleryImages || [partial.mainImage || ""],
        storeName: partial.storeName || "AliExpress Verified Store",
        sellerPositiveRate: partial.sellerPositiveRate || "97.5%",
        commissionRate: partial.commissionRate || 0.07,
        aliUrl: partial.aliUrl || `https://www.aliexpress.com/item/${partial.aliId}.html`,
        affiliateUrl: partial.affiliateUrl || partial.aliUrl || "",
        specifications: partial.specifications || {},
      };

      const collision = evaluateProductCollision(fullProd, existingProducts);
      const healthCheck = buildAliHealthCheck(fullProd);
      const alonRationale = buildAlonRationale(fullProd, collision, activeNiche);

      candidates.push({
        product: fullProd,
        niche: activeNiche,
        collision,
        alonRationale,
        healthCheck,
      });
    }

    return NextResponse.json({
      success: true,
      mode: "search",
      query: searchKeywords,
      translatedQuery: searchRes.translatedQuery,
      niche: activeNiche,
      count: candidates.length,
      candidates,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Radar search failed";
    console.error("[Radar Search API Error]:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
