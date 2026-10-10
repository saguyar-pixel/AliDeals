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
    const {
      query,
      urlOrId,
      nicheKeyword,
      minOrders = 100,
      minRating = 4.5,
      maxPrice = 270,
      minPrice,
      sortBy = "LAST_VOLUME_DESC",
      pageSize = 50,
      theme,
    } = body;

    const candidates: RadarCandidateProduct[] = [];

    // CASE A: Targeted single product by URL or ID
    if (urlOrId && String(urlOrId).trim()) {
      const targetInput = String(urlOrId).trim();
      let product: AliExpressProduct | null = null;
      try {
        product = await fetchAliExpressProduct(targetInput);
      } catch (fetchErr) {
        console.warn("[Radar Single Product] fetchAliExpressProduct failed, checking local database:", fetchErr);
      }

      // Check if product exists in local/Supabase DB
      if (!product) {
        const cleanId = targetInput.replace(/[^0-9]/g, "");
        const existing = (cleanId ? await supabaseDb.getProductByAliId(cleanId) : null) || (await supabaseDb.getProductById(targetInput));
        if (existing) {
          product = {
            aliId: existing.aliId,
            originalTitle: existing.originalTitle,
            titleHe: existing.titleHe || existing.originalTitle,
            descriptionHe: existing.descriptionHe || "",
            metaTitle: existing.metaTitle || existing.titleHe || existing.originalTitle,
            metaDescription: existing.metaDescription || existing.descriptionHe || "",
            tags: existing.tags || [],
            keyHighlightsHe: [],
            priceUsd: existing.priceUsd,
            priceIls: existing.priceIls,
            originalPriceUsd: existing.originalPriceUsd || undefined,
            discountPercent: existing.discountPercent,
            rating: existing.rating,
            ordersCount: existing.ordersCount,
            mainImage: existing.mainImage,
            galleryImages: existing.galleryImages,
            storeName: existing.storeName || "AliExpress Verified Store",
            sellerPositiveRate: existing.sellerPositiveRate || "97.5%",
            commissionRate: existing.commissionRate,
            aliUrl: existing.aliUrl,
            affiliateUrl: existing.affiliateUrl || existing.aliUrl,
            specifications: (existing.specifications as any) || {},
            reviewsSummary: (existing.reviewsSummary as any) || [],
          };
        }
      }

      if (!product) {
        return NextResponse.json(
          { error: "לא הצלחנו למשוך את פרטי המוצר מ-AliExpress ואינו קיים במאגר האתר. אנא ודא שהקישור או המזהה תקינים." },
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

      const collision = await evaluateProductCollision(product, matchedNiche.category, matchedNiche.archetype);
      const healthCheck = buildAliHealthCheck(product);
      const alonRationale = buildAlonRationale(product, matchedNiche, collision);

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

    // CASE B: Search query, niche search, or theme search
    let searchKeywords = "GaN charger";
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
      pageSize: Math.max(20, Math.min(100, pageSize)),
      sortBy: sortBy as any,
      maxPrice: maxPrice ? Math.min(maxPrice, 270) : 270,
      minPrice,
      minOrders,
      minRating,
      theme,
    });

    let products = searchRes.products || [];
    let isFallbackFromCatalog = false;

    // Resilient Fallback: If live AliExpress API returned 0 items, load from Supabase / jsonDb catalog
    if (products.length === 0) {
      try {
        const catalogProducts = await supabaseDb.getProducts();
        if (catalogProducts && catalogProducts.length > 0) {
          isFallbackFromCatalog = true;
          const lowerKeywords = searchKeywords.toLowerCase();
          const lowerNicheCat = (activeNiche.category || "").toLowerCase();

          let matched = catalogProducts.filter((p) => {
            const tHe = (p.titleHe || "").toLowerCase();
            const tOrig = (p.originalTitle || "").toLowerCase();
            const cat = (p.category || "").toLowerCase();
            const tags = (p.tags || []).map((t) => t.toLowerCase());

            return (
              tHe.includes(lowerKeywords) ||
              tOrig.includes(lowerKeywords) ||
              cat.includes(lowerNicheCat) ||
              tags.some((t) => t.includes(lowerKeywords))
            );
          });

          if (matched.length === 0) {
            matched = catalogProducts;
          }

          if (maxPrice) {
            matched = matched.filter((p) => (p.priceUsd || 0) <= maxPrice);
          }

          matched.sort((a, b) => (b.ordersCount || 0) - (a.ordersCount || 0));

          products = matched.slice(0, Math.max(10, Math.min(50, pageSize))).map((p) => ({
            aliId: p.aliId,
            originalTitle: p.originalTitle,
            titleHe: p.titleHe || p.originalTitle,
            priceUsd: p.priceUsd,
            priceIls: p.priceIls,
            originalPriceUsd: p.originalPriceUsd || undefined,
            discountPercent: p.discountPercent,
            rating: p.rating,
            ordersCount: p.ordersCount,
            mainImage: p.mainImage,
            galleryImages: p.galleryImages,
            storeName: p.storeName || "AliExpress Verified Store",
            sellerPositiveRate: p.sellerPositiveRate || "97.5%",
            commissionRate: p.commissionRate,
            aliUrl: p.aliUrl,
            affiliateUrl: p.affiliateUrl || p.aliUrl,
            specifications: (p.specifications as any) || {},
          }));
        }
      } catch (dbErr) {
        console.warn("[Radar Search] Catalog fallback error:", dbErr);
      }
    }

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

      const previousInSearch = candidates.map((c) => c.product);
      const collision = await evaluateProductCollision(fullProd, activeNiche.category, activeNiche.archetype, previousInSearch);
      const healthCheck = buildAliHealthCheck(fullProd);
      const alonRationale = buildAlonRationale(fullProd, activeNiche, collision);

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
      source: isFallbackFromCatalog ? "catalog" : "aliexpress_live",
      notice: isFallbackFromCatalog
        ? "חיפוש עלי-אקספרס החי לא החזיר תוצאות (ייתכן בשל מגבלת API או מזהה מעקב). הוצגו מוצרים ממאגר האתר לסקירה ואישור ידני (HITL)."
        : undefined,
      query: searchKeywords,
      translatedQuery: searchRes.translatedQuery,
      niche: activeNiche,
      count: candidates.length,
      totalFound: searchRes.totalFound ?? candidates.length,
      candidates,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Radar search failed";
    console.error("[Radar Search API Error]:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
