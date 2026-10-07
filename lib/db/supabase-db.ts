import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { sanitizeSlug } from "@/lib/security/firewall";
import {
  jsonDb,
  ProductRecord,
  PageRecord,
  CategoryRecord,
  PageProductRecord,
  PriceHistoryRecord,
  CouponRecord,
  AgentTaskRecord,
  UgcVerificationRecord,
  UgcSummary,
  CrossSellRecord,
  DismissedOrderRecord,
} from "./json-db";
import { analyticsDb } from "./analytics-db";
import {
  OutboundClickRecord,
  S2SConversionRecord,
  GscQueryRecord,
  Ga4PageStatRecord,
  SiteSettingsRecord,
  CustomCodeSnippet,
  CodeSnippetLogRecord,
} from "../analytics/types";
import { AgentLogEntry, OrchestratorMessage } from "../agent/types";
import { AffiliateOrder, AffiliateOrderItem } from "@/lib/aliexpress/types";

export type { UgcVerificationRecord, UgcSummary, CrossSellRecord };

// Helper: Convert snake_case Supabase product row to camelCase ProductRecord
function mapProductFromSupabase(row: any): ProductRecord {
  return {
    id: String(row.id || `prod_${row.ali_product_id || row.ali_id}`),
    aliId: String(row.ali_product_id || row.ali_id || row.id || ""),
    originalTitle: row.title || row.original_title,
    titleHe: row.hebrew_title || row.title_he,
    descriptionHe: row.description_he,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    category: row.category,
    archetype: row.archetype || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    priceUsd: Number(row.price_usd) || 0,
    priceIls: Number(row.price_ils) || 0,
    originalPriceUsd: row.original_price_usd ? Number(row.original_price_usd) : null,
    discountPercent: Number(row.discount_rate || row.discount_percent) || 0,
    rating: Number(row.rating) || 4.8,
    ordersCount: Number(row.orders_count) || 0,
    storeName: row.store_name,
    sellerPositiveRate: row.seller_positive_rate,
    commissionRate: Number(row.commission_rate) || 7.0,
    mainImage: row.main_image_url || row.main_image,
    galleryImages: Array.isArray(row.image_gallery) ? row.image_gallery : row.gallery_images,
    specifications: row.specifications,
    reviewsSummary: row.reviews_summary,
    aliUrl: row.ali_url,
    affiliateUrl: row.affiliate_url,
    boughtTogetherIds: Array.isArray(row.bought_together_ids) ? row.bought_together_ids : (typeof row.bought_together_ids === "string" ? JSON.parse(row.bought_together_ids || "[]") : []),
    crossSellReason: row.cross_sell_reason || undefined,
    isEuPlug: row.is_eu_plug !== undefined ? row.is_eu_plug : null,
    voltage220vCompatible: row.voltage_220v_compatible !== undefined ? row.voltage_220v_compatible : null,
    sizeWarning: row.size_warning || null,
    fabricComposition: row.fabric_composition || null,
    status: row.is_active !== undefined ? (row.is_active ? "active" : "inactive") : row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper: Convert snake_case Supabase page row to camelCase PageRecord
function mapPageFromSupabase(row: any): PageRecord {
  return {
    id: row.id,
    slug: row.slug,
    type: row.type,
    title: row.title,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    directAnswerGeo: row.direct_answer_geo,
    contentMarkdown: row.content_markdown,
    structuredDataJson: typeof row.structured_data_json === "string" ? row.structured_data_json : JSON.stringify(row.structured_data_json),
    featuredImage: row.featured_image,
    infographicImage: row.infographic_image,
    targetCategory: row.target_category,
    archetype: row.archetype || undefined,
    tags: Array.isArray(row.tags) ? row.tags : [],
    pros: Array.isArray(row.pros) ? row.pros : (typeof row.pros === "string" ? JSON.parse(row.pros || "[]") : []),
    cons: Array.isArray(row.cons) ? row.cons : (typeof row.cons === "string" ? JSON.parse(row.cons || "[]") : []),
    faqs: (() => {
      if (Array.isArray(row.faqs)) return row.faqs;
      if (typeof row.faqs === "string") {
        try { return JSON.parse(row.faqs); } catch {}
      }
      try {
        const s = typeof row.structured_data_json === "string" ? JSON.parse(row.structured_data_json) : row.structured_data_json;
        const faqPage = s?.["@graph"]?.find((g: any) => g["@type"] === "FAQPage") || (s?.["@type"] === "FAQPage" ? s : null);
        if (faqPage && Array.isArray(faqPage.mainEntity)) {
          return faqPage.mainEntity.map((q: any) => ({
            question: q.name,
            answer: q.acceptedAnswer?.text || "",
          }));
        }
      } catch {}
      return undefined;
    })(),
    productIds: typeof row.product_ids === "string" ? row.product_ids : JSON.stringify(row.product_ids || []),
    boughtTogetherIds: Array.isArray(row.bought_together_ids) ? row.bought_together_ids : (typeof row.bought_together_ids === "string" ? JSON.parse(row.bought_together_ids || "[]") : []),
    crossSellReason: row.cross_sell_reason || undefined,
    isEuPlug: row.is_eu_plug !== undefined ? row.is_eu_plug : null,
    voltage220vCompatible: row.voltage_220v_compatible !== undefined ? row.voltage_220v_compatible : null,
    sizeWarning: row.size_warning || null,
    fabricComposition: row.fabric_composition || null,
    alonRationale: row.alon_rationale || row.alonRationale || null,
    aliHealthCheck: typeof row.ali_health_check === "string" ? row.ali_health_check : (row.ali_health_check ? JSON.stringify(row.ali_health_check) : (row.aliHealthCheck || null)),
    status: row.status,
    viewsCount: Number(row.views_count) || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Helper: Convert snake_case Supabase category row to camelCase CategoryRecord
function mapCategoryFromSupabase(row: any): CategoryRecord {
  return {
    id: row.id,
    siteId: row.site_id || "alideals",
    parentId: row.parent_id || null,
    slug: row.slug,
    path: row.path || row.slug,
    nameHe: row.name_he,
    icon: row.icon,
    descriptionHe: row.description_he,
    archetype: row.archetype || undefined,
    level: Number(row.level) || 0,
    sortOrder: Number(row.sort_order) || 0,
    isFeatured: Boolean(row.is_featured),
    tags: Array.isArray(row.tags) ? row.tags : [],
    aliCategoryId: row.ali_category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Robustly extracts the name of a missing column from PostgreSQL or Supabase PostgREST error messages.
 * Handles:
 * - PostgREST (code PGRST204): "Could not find the 'bought_together_ids' column of 'pages' in the schema cache"
 * - PostgreSQL driver (code 42703): 'column "bought_together_ids" of relation "pages" does not exist'
 */
function extractMissingColumnName(error: any): string | null {
  if (!error) return null;
  const msg = String(error.message || "");

  // 1. PostgREST format
  const postgrestMatch = msg.match(/Could not find the '([^']+)' column/i);
  if (postgrestMatch && postgrestMatch[1]) {
    return postgrestMatch[1];
  }

  // 2. Direct PostgreSQL driver format
  const pgMatch = msg.match(/column "([^"]+)" of relation/i);
  if (pgMatch && pgMatch[1]) {
    return pgMatch[1];
  }

  return null;
}

export const supabaseDb = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
  },

  // ==========================================
  // STORAGE & MEDIA
  // ==========================================
  async uploadMedia(
    bucket: string,
    filePath: string,
    fileBuffer: Buffer | Uint8Array,
    contentType: string = "image/png"
  ): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    const client = getSupabaseServerClient();
    if (!client) {
      return { success: false, error: "Supabase client not configured" };
    }

    try {
      // 1. Attempt to ensure bucket exists
      try {
        const { data: buckets } = await client.storage.listBuckets();
        const exists = buckets?.some((b) => b.name === bucket);
        if (!exists) {
          await client.storage.createBucket(bucket, {
            public: true,
            fileSizeLimit: 10485760, // 10MB
          });
        }
      } catch {
        // Proceed even if bucket listing is restricted; bucket might already exist
      }

      // 2. Upload file with upsert
      const { error } = await client.storage.from(bucket).upload(filePath, fileBuffer, {
        contentType,
        upsert: true,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // 3. Obtain public URL
      const { data: urlData } = client.storage.from(bucket).getPublicUrl(filePath);
      return { success: true, publicUrl: urlData.publicUrl };
    } catch (err: any) {
      return { success: false, error: err.message || "Failed to upload media" };
    }
  },

  // ==========================================
  // PRODUCTS
  // ==========================================
  async getProducts(): Promise<ProductRecord[]> {
    const localProducts = jsonDb.getProducts() || [];
    const client = getSupabaseServerClient();
    if (!client) return localProducts;

    try {
      const { data, error } = await client
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) {
        console.warn("Supabase getProducts error, using JSON database fallback:", error?.message);
        return localProducts;
      }

      // Supabase is the Single Source of Truth (SSOT).
      // Deleted products stay deleted and are never resurrected from bundled static JSON.
      return data.map(mapProductFromSupabase);
    } catch (err) {
      console.warn("Supabase getProducts exception, using JSON database fallback:", err);
      return localProducts;
    }
  },

  async getProductById(id: string): Promise<ProductRecord | null> {
    const local = jsonDb.getProductById(id);
    const client = getSupabaseServerClient();
    if (!client) return local || null;

    try {
      const cleanId = String(id || "").trim();
      const rawAliId = cleanId.replace(/^prod_/, "");

      let { data, error } = await client
        .from("products")
        .select("*")
        .eq("id", cleanId)
        .maybeSingle();

      if (!data && !error && rawAliId) {
        const retry = await client
          .from("products")
          .select("*")
          .eq("ali_id", rawAliId)
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        return local || null;
      }
      return data ? mapProductFromSupabase(data) : null;
    } catch {
      return local || null;
    }
  },

  async getProductByAliId(aliId: string): Promise<ProductRecord | null> {
    const local = jsonDb.getProductByAliId(aliId);
    const client = getSupabaseServerClient();
    if (!client) return local || null;

    try {
      const cleanAli = String(aliId || "").trim();
      let { data, error } = await client
        .from("products")
        .select("*")
        .eq("ali_product_id", cleanAli)
        .maybeSingle();

      if (!data && !error) {
        const retry1 = await client
          .from("products")
          .select("*")
          .eq("ali_id", cleanAli)
          .maybeSingle();
        data = retry1.data;
        error = retry1.error;
      }

      if (!data && !error) {
        const retry2 = await client
          .from("products")
          .select("*")
          .eq("id", `prod_${cleanAli}`)
          .maybeSingle();
        data = retry2.data;
        error = retry2.error;
      }

      if (error) {
        return local || null;
      }
      return data ? mapProductFromSupabase(data) : null;
    } catch {
      return local || null;
    }
  },

  async incrementProductSales(aliId: string, quantity: number = 1, orderTime?: string): Promise<void> {
    const client = getSupabaseServerClient();
    const cleanAli = String(aliId || "").trim();
    const nowIso = orderTime || new Date().toISOString();

    // 1. Update local DB if present
    try {
      const localProd = jsonDb.getProductByAliId(cleanAli);
      if (localProd) {
        localProd.ordersCount = (localProd.ordersCount || 0) + quantity;
        jsonDb.upsertProduct(localProd);
      }
    } catch {}

    if (!client) return;

    try {
      const prod = await this.getProductByAliId(cleanAli);
      if (!prod) return;

      const currentOrders = (prod.ordersCount || 0) + quantity;
      await client
        .from("products")
        .update({
          orders_count: currentOrders,
          sales_count: currentOrders,
          last_order_at: nowIso,
          updated_at: new Date().toISOString(),
        })
        .or(`ali_product_id.eq.${cleanAli},ali_id.eq.${cleanAli},id.eq.${prod.id}`);
    } catch (err) {
      console.warn("incrementProductSales notice:", err);
    }
  },

  async upsertProduct(p: Partial<ProductRecord>): Promise<ProductRecord> {
    // 1. Keep local jsonDb in sync as immediate backup (persisted synchronously to disk/tmp)
    try {
      jsonDb.upsertProduct(p as ProductRecord);
    } catch (localErr) {
      console.warn("Local jsonDb backup write failed:", localErr);
    }

    const client = getSupabaseServerClient();
    if (!client) {
      if (isSupabaseConfigured()) {
        throw new Error("שגיאת תצורה: לא ניתן להתחבר לשרת Supabase. ודא שמפתחות הגישה מוגדרים ותקינים.");
      }
      return p as ProductRecord;
    }

    const cleanAliId = String(p.aliId || "").trim();
    const cleanId = p.id || `prod_${cleanAliId || Date.now()}`;
    const originalTitle = String(p.originalTitle || p.titleHe || "").trim();
    const mainImage = String(p.mainImage || "").trim();
    const aliUrl = String(p.aliUrl || "").trim() || (cleanAliId ? `https://www.aliexpress.com/item/${cleanAliId}.html` : "");

    // Required fields validation to match DB schema constraints
    if (!cleanAliId) {
      throw new Error("חובה לציין מזהה מוצר (aliId)");
    }
    if (!originalTitle) {
      throw new Error("חובה לציין כותרת למוצר");
    }
    if (!mainImage) {
      throw new Error("חובה להזין קישור לתמונת המוצר (mainImage)");
    }
    if (!aliUrl) {
      throw new Error("חובה להזין קישור למוצר בעליאקספרס (aliUrl)");
    }

    try {
      const now = new Date().toISOString();

      // Helper for safe JSON parsing
      const safeParse = (val: any, fallback: any) => {
        if (val === null || val === undefined) return fallback;
        if (typeof val === "object") return val;
        if (typeof val === "string") {
          try {
            return JSON.parse(val);
          } catch {
            return Array.isArray(fallback) ? [val] : fallback;
          }
        }
        return fallback;
      };

      // Postgres table schema strictly conforms to: id, site_id, ali_id, original_title, ...
      // Excludes bought_together_ids and cross_sell_reason which do not belong to products
      let safeRating = Number(p.rating) || 4.8;
      if (isNaN(safeRating) || safeRating <= 0) safeRating = 4.8;
      if (safeRating > 10) safeRating = (safeRating / 100) * 5;
      else if (safeRating > 5) safeRating = 5.0;
      safeRating = Math.min(5.0, Math.max(1.0, Math.round(safeRating * 100) / 100));

      let safeCommission = Number(p.commissionRate) || 7.0;
      if (isNaN(safeCommission) || safeCommission < 0) safeCommission = 7.0;
      safeCommission = Math.min(99.99, Math.max(0, Math.round(safeCommission * 100) / 100));

      let safePriceUsd = Math.min(999999.99, Math.max(0, Number(p.priceUsd) || 0));
      let safePriceIls = Math.min(999999.99, Math.max(0, Number(p.priceIls) || 0));
      let safeOrigUsd = p.originalPriceUsd ? Math.min(999999.99, Math.max(0, Number(p.originalPriceUsd))) : null;
      let safeDiscount = Math.min(100, Math.max(0, Number(p.discountPercent) || 0));
      let safeOrders = Math.min(2147483647, Math.max(0, Number(p.ordersCount) || 100));

      const row: any = {
        id: cleanId,
        site_id: "alideals",
        ali_id: cleanAliId,
        original_title: originalTitle,
        title_he: p.titleHe || null,
        description_he: p.descriptionHe || null,
        meta_title: p.metaTitle || null,
        meta_description: p.metaDescription || null,
        category: p.category || "אלקטרוניקה וגאדג'טים",
        archetype: p.archetype || "GENERAL",
        is_eu_plug: p.isEuPlug !== undefined ? p.isEuPlug : null,
        voltage_220v_compatible: p.voltage220vCompatible !== undefined ? p.voltage220vCompatible : null,
        size_warning: p.sizeWarning || null,
        fabric_composition: p.fabricComposition || null,
        tags: Array.isArray(p.tags) ? p.tags : [],
        price_usd: safePriceUsd,
        price_ils: safePriceIls,
        original_price_usd: safeOrigUsd,
        discount_percent: safeDiscount,
        rating: safeRating,
        orders_count: safeOrders,
        store_name: p.storeName || null,
        seller_positive_rate: p.sellerPositiveRate || null,
        commission_rate: safeCommission,
        main_image: mainImage,
        gallery_images: safeParse(p.galleryImages, [mainImage]),
        specifications: safeParse(p.specifications, {}),
        reviews_summary: safeParse(p.reviewsSummary, []),
        ali_url: aliUrl,
        affiliate_url: p.affiliateUrl || null,
        status: p.status || "active",
        updated_at: now,
      };

      // Check if site 'alideals' exists to prevent foreign key violation
      try {
        await client.from("sites").upsert({
          id: "alideals",
          domain: "ali-deals.co.il",
          name: "AliDeals ישראל",
          theme_color: "#ea580c",
        }, { onConflict: "id" });
      } catch {}

      // 1. Primary: Upsert with ali_id conflict
      let res = await client
        .from("products")
        .upsert(row, { onConflict: "ali_id" })
        .select()
        .maybeSingle();

      // 2. Retry if foreign key constraint failed on site_id
      if (res.error && (res.error.code === "23503" || res.error.message?.includes("foreign key") || res.error.message?.includes("sites"))) {
        delete row.site_id;
        res = await client
          .from("products")
          .upsert(row, { onConflict: "ali_id" })
          .select()
          .maybeSingle();
      }

      // 3. Retry if a column is missing from Supabase products table (PostgREST or PostgreSQL error)
      for (let attempt = 0; attempt < 15 && res?.error; attempt++) {
        const missingCol = extractMissingColumnName(res.error);
        if (missingCol && missingCol in row) {
          console.warn(`Stripping missing column '${missingCol}' from products table and retrying...`);
          delete row[missingCol];
          res = await client
            .from("products")
            .upsert(row, { onConflict: "ali_id" })
            .select()
            .maybeSingle();
        } else {
          break;
        }
      }

      // 4. Fallback: If upsert failed due to unique constraint or ID mismatch, try explicit find & update/insert
      if (res.error) {
        const { data: existing } = await client
          .from("products")
          .select("id")
          .eq("ali_id", cleanAliId)
          .maybeSingle();

        if (existing && existing.id) {
          res = await client
            .from("products")
            .update(row)
            .eq("id", existing.id)
            .select()
            .maybeSingle();
        } else {
          res = await client
            .from("products")
            .insert({ ...row, created_at: now })
            .select()
            .maybeSingle();
        }

        for (let attempt = 0; attempt < 15 && res?.error; attempt++) {
          const missingCol = extractMissingColumnName(res.error);
          if (missingCol && missingCol in row) {
            console.warn(`Stripping missing column '${missingCol}' from fallback products and retrying...`);
            delete row[missingCol];
            if (existing && existing.id) {
              res = await client
                .from("products")
                .update(row)
                .eq("id", existing.id)
                .select()
                .maybeSingle();
            } else {
              res = await client
                .from("products")
                .insert({ ...row, created_at: now })
                .select()
                .maybeSingle();
            }
          } else {
            break;
          }
        }
      }

      if (res.error) {
        console.error(`Supabase upsertProduct error for ali_id ${cleanAliId}:`, res.error.message, `[code: ${res.error.code}]`);
        throw new Error(`שגיאת שמירה במסד הנתונים Supabase: ${res.error.message} (קוד: ${res.error.code || "UNKNOWN"})`);
      }

      if (!res.data) {
        throw new Error(`מסד הנתונים Supabase לא החזיר רשומה שמורה עבור מוצר #${cleanAliId}`);
      }

      return mapProductFromSupabase(res.data);
    } catch (err: any) {
      console.error("Supabase upsertProduct exception:", err);
      throw err;
    }
  },

  async deleteProduct(idOrAliId: string, aliIdParam?: string): Promise<boolean> {
    const cleanId = String(idOrAliId || "").trim();
    const cleanAliId = String(aliIdParam || "").trim();
    const rawIdWithoutPrefix = cleanId.replace(/^prod_/, "");

    // 1. Delete from local jsonDb immediately
    if (cleanId) jsonDb.deleteProduct(cleanId);
    if (cleanAliId) jsonDb.deleteProduct(cleanAliId);
    if (rawIdWithoutPrefix && rawIdWithoutPrefix !== cleanId) {
      jsonDb.deleteProduct(rawIdWithoutPrefix);
      jsonDb.deleteProduct(`prod_${rawIdWithoutPrefix}`);
    }

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      // 2. Cascade delete from relational junctions
      const targets = Array.from(new Set([cleanId, cleanAliId, rawIdWithoutPrefix, `prod_${rawIdWithoutPrefix}`].filter(Boolean)));
      for (const t of targets) {
        await client.from("page_products").delete().eq("product_id", t);
        await client.from("product_price_history").delete().eq("product_id", t);
      }

      // 3. Delete from Supabase products table matching id OR ali_id
      let deleteError: any = null;
      if (cleanId) {
        const { error } = await client.from("products").delete().eq("id", cleanId);
        if (error) deleteError = error;
        const { error: err2 } = await client.from("products").delete().eq("ali_id", cleanId);
        if (err2) deleteError = err2;
      }
      if (cleanAliId) {
        const { error } = await client.from("products").delete().eq("ali_id", cleanAliId);
        if (error) deleteError = error;
        const { error: err2 } = await client.from("products").delete().eq("id", cleanAliId);
        if (err2) deleteError = err2;
      }
      if (rawIdWithoutPrefix) {
        await client.from("products").delete().eq("ali_id", rawIdWithoutPrefix);
        await client.from("products").delete().eq("id", rawIdWithoutPrefix);
        await client.from("products").delete().eq("id", `prod_${rawIdWithoutPrefix}`);
      }

      if (deleteError) {
        console.error("Supabase deleteProduct error:", deleteError);
        throw new Error(`שגיאה במחיקת מוצר מ-Supabase: ${deleteError.message}`);
      }

      return true;
    } catch (err: any) {
      console.warn("Supabase deleteProduct exception:", err?.message || err);
      throw err;
    }
  },

  // ==========================================
  // PAGES
  // ==========================================
  async getPages(): Promise<PageRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getPages();

    try {
      const { data, error } = await client
        .from("pages")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(mapPageFromSupabase);
      }

      // If pages table returned empty or errored, check if review_pages has entries
      try {
        const { data: revPages, error: revErr } = await client
          .from("review_pages")
          .select("*")
          .order("created_at", { ascending: false });

        if (!revErr && revPages && revPages.length > 0) {
          return revPages.map((rp: any) => ({
            id: rp.id,
            slug: rp.slug,
            type: "review",
            title: rp.seo_title || rp.slug,
            metaTitle: rp.seo_title,
            metaDescription: rp.seo_description,
            directAnswerGeo: rp.verdict || "",
            contentMarkdown: rp.content_html || "",
            productIds: JSON.stringify([rp.product_id]),
            status: rp.is_published ? "published" : "draft",
            viewsCount: Number(rp.view_count) || 0,
            createdAt: rp.created_at,
            updatedAt: rp.updated_at,
          }));
        }
      } catch {}

      if (data && data.length === 0) {
        return [];
      }

      return jsonDb.getPages();
    } catch {
      return jsonDb.getPages();
    }
  },

  async getPageById(id: string): Promise<PageRecord | null> {
    const clean = String(id || "").trim();
    if (!clean) return null;

    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getPageById(clean) || null;

    try {
      const { data, error } = await client
        .from("pages")
        .select("*")
        .or(`id.eq.${clean},slug.eq.${clean}`)
        .maybeSingle();

      if (!error && data) {
        return mapPageFromSupabase(data);
      }

      // Fallback check review_pages
      try {
        const { data: revPage } = await client
          .from("review_pages")
          .select("*")
          .or(`id.eq.${clean},slug.eq.${clean}`)
          .maybeSingle();

        if (revPage) {
          return {
            id: revPage.id,
            slug: revPage.slug,
            type: "review",
            title: revPage.seo_title || revPage.slug,
            metaTitle: revPage.seo_title,
            metaDescription: revPage.seo_description,
            directAnswerGeo: revPage.verdict || "",
            contentMarkdown: revPage.content_html || "",
            productIds: JSON.stringify([revPage.product_id]),
            status: revPage.is_published ? "published" : "draft",
            viewsCount: Number(revPage.view_count) || 0,
            createdAt: revPage.created_at,
            updatedAt: revPage.updated_at,
          };
        }
      } catch {}

      return jsonDb.getPageById(clean) || null;
    } catch {
      return jsonDb.getPageById(clean) || null;
    }
  },

  async getPageBySlug(slug: string): Promise<PageRecord | null> {
    const raw = String(slug || "").trim();
    if (!raw) return null;

    let decoded = raw;
    try {
      decoded = decodeURIComponent(raw);
    } catch {
      decoded = raw;
    }

    const client = getSupabaseServerClient();
    if (!client) {
      return jsonDb.getPageBySlug(decoded) || (raw !== decoded ? jsonDb.getPageBySlug(raw) : null);
    }

    try {
      let { data, error } = await client
        .from("pages")
        .select("*")
        .eq("slug", decoded)
        .maybeSingle();

      if (!data && raw !== decoded) {
        const retry = await client
          .from("pages")
          .select("*")
          .eq("slug", raw)
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (!error && data) {
        return mapPageFromSupabase(data);
      }

      // Fallback check review_pages
      try {
        let { data: revPage } = await client
          .from("review_pages")
          .select("*")
          .eq("slug", decoded)
          .maybeSingle();

        if (!revPage && raw !== decoded) {
          const revRetry = await client
            .from("review_pages")
            .select("*")
            .eq("slug", raw)
            .maybeSingle();
          revPage = revRetry.data;
        }

        if (revPage) {
          return {
            id: revPage.id,
            slug: revPage.slug,
            type: "review",
            title: revPage.seo_title || revPage.slug,
            metaTitle: revPage.seo_title,
            metaDescription: revPage.seo_description,
            directAnswerGeo: revPage.verdict || "",
            contentMarkdown: revPage.content_html || "",
            productIds: JSON.stringify([revPage.product_id]),
            status: revPage.is_published ? "published" : "draft",
            viewsCount: Number(revPage.view_count) || 0,
            createdAt: revPage.created_at,
            updatedAt: revPage.updated_at,
          };
        }
      } catch {}

      return jsonDb.getPageBySlug(decoded) || (raw !== decoded ? jsonDb.getPageBySlug(raw) : null);
    } catch {
      return jsonDb.getPageBySlug(decoded) || (raw !== decoded ? jsonDb.getPageBySlug(raw) : null);
    }
  },

  async getPagesByType(type: string): Promise<PageRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getPagesByType(type);

    try {
      const { data, error } = await client
        .from("pages")
        .select("*")
        .eq("type", type)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        return data.map(mapPageFromSupabase);
      }

      if (type === "review") {
        try {
          const { data: revPages } = await client
            .from("review_pages")
            .select("*")
            .order("created_at", { ascending: false });

          if (revPages && revPages.length > 0) {
            return revPages.map((rp: any) => ({
              id: rp.id,
              slug: rp.slug,
              type: "review",
              title: rp.seo_title || rp.slug,
              metaTitle: rp.seo_title,
              metaDescription: rp.seo_description,
              directAnswerGeo: rp.verdict || "",
              contentMarkdown: rp.content_html || "",
              productIds: JSON.stringify([rp.product_id]),
              status: rp.is_published ? "published" : "draft",
              viewsCount: Number(rp.view_count) || 0,
              createdAt: rp.created_at,
              updatedAt: rp.updated_at,
            }));
          }
        } catch {}
      }

      if (data && data.length === 0) {
        return [];
      }

      return jsonDb.getPagesByType(type);
    } catch {
      return jsonDb.getPagesByType(type);
    }
  },

  async upsertPage(page: Partial<PageRecord>): Promise<PageRecord> {
    const rawSlug = String(page.slug || page.title || "").trim();
    const cleanSlug = sanitizeSlug(rawSlug, "page");
    const cleanTitle = String(page.title || cleanSlug).trim();
    const cleanId = String(page.id || "").trim();

    if (!cleanTitle) {
      throw new Error("חובה לציין כותרת עבור העמוד");
    }
    if (!cleanSlug) {
      throw new Error("חובה לציין מזהה slug חוקי עבור העמוד");
    }

    // Keep local jsonDb in sync as immediate backup
    try {
      jsonDb.upsertPage({
        ...(page as PageRecord),
        slug: cleanSlug,
        title: cleanTitle,
      });
    } catch (localErr) {
      console.warn("Local jsonDb backup write failed for page:", localErr);
    }

    const client = getSupabaseServerClient();
    if (!client) {
      if (isSupabaseConfigured()) {
        throw new Error("שגיאת תצורה: לא ניתן להתחבר לשרת Supabase. ודא שמפתחות הגישה מוגדרים ותקינים.");
      }
      return {
        ...(page as PageRecord),
        slug: cleanSlug,
        title: cleanTitle,
      };
    }

    try {
      const now = new Date().toISOString();

      // 1. Identify existing page in Supabase by slug or ID to preserve consistent primary key
      let existingPageId: string | null = null;
      try {
        let findQuery = client.from("pages").select("id, slug");
        if (cleanId && cleanSlug) {
          findQuery = findQuery.or(`id.eq.${cleanId},slug.eq.${cleanSlug}`);
        } else if (cleanSlug) {
          findQuery = findQuery.eq("slug", cleanSlug);
        } else if (cleanId) {
          findQuery = findQuery.eq("id", cleanId);
        }
        const { data: existing } = await findQuery.maybeSingle();
        if (existing?.id) {
          existingPageId = existing.id;
        }
      } catch {}

      const row: any = {
        id: existingPageId || cleanId || `page_${Date.now()}`,
        site_id: "alideals",
        slug: cleanSlug,
        type: page.type || "review",
        title: cleanTitle,
        meta_title: page.metaTitle || cleanTitle,
        meta_description: page.metaDescription || "",
        direct_answer_geo: page.directAnswerGeo || "",
        content_markdown: page.contentMarkdown || "",
        structured_data_json: (() => {
          try {
            return typeof page.structuredDataJson === "string" ? JSON.parse(page.structuredDataJson || "{}") : page.structuredDataJson || {};
          } catch {
            return {};
          }
        })(),
        featured_image: page.featuredImage || null,
        infographic_image: page.infographicImage || null,
        target_category: page.targetCategory || "אלקטרוניקה וגאדג'טים",
        archetype: page.archetype || "GENERAL",
        pros: Array.isArray(page.pros) ? page.pros : [],
        cons: Array.isArray(page.cons) ? page.cons : [],
        is_eu_plug: page.isEuPlug !== undefined ? page.isEuPlug : null,
        voltage_220v_compatible: page.voltage220vCompatible !== undefined ? page.voltage220vCompatible : null,
        size_warning: page.sizeWarning || null,
        fabric_composition: page.fabricComposition || null,
        tags: Array.isArray(page.tags) ? page.tags : [],
        product_ids: (() => {
          try {
            return typeof page.productIds === "string" ? JSON.parse(page.productIds || "[]") : page.productIds || [];
          } catch {
            return [];
          }
        })(),
        bought_together_ids: page.boughtTogetherIds || [],
        cross_sell_reason: page.crossSellReason || null,
        alon_rationale: page.alonRationale || null,
        ali_health_check: page.aliHealthCheck || null,
        status: page.status || "published",
        views_count: page.viewsCount || 0,
        updated_at: now,
      };

      // 2. Ensure site "alideals" exists to prevent foreign key errors
      try {
        await client.from("sites").upsert({
          id: "alideals",
          domain: "ali-deals.co.il",
          name: "AliDeals ישראל",
          theme_color: "#ea580c",
        }, { onConflict: "id" });
      } catch {}

      // 3. Primary Upsert against pages table
      let res = await client
        .from("pages")
        .upsert(row, { onConflict: "slug" })
        .select()
        .maybeSingle();

      // 4. Missing Column Handling Loop (strips non-existent columns and retries)
      for (let attempt = 0; attempt < 15 && res?.error; attempt++) {
        const missingCol = extractMissingColumnName(res.error);
        if (missingCol && missingCol in row) {
          console.warn(`Stripping missing column '${missingCol}' from pages table and retrying...`);
          delete row[missingCol];
          res = await client
            .from("pages")
            .upsert(row, { onConflict: "slug" })
            .select()
            .maybeSingle();
        } else {
          break;
        }
      }

      // 5. Fallback: If upsert failed due to unique constraint or ID mismatch, try explicit update / insert
      if (res?.error) {
        console.warn("Supabase upsertPage onConflict failed, trying explicit update/insert:", res.error.message);
        if (existingPageId) {
          res = await client
            .from("pages")
            .update(row)
            .eq("id", existingPageId)
            .select()
            .maybeSingle();
        } else {
          res = await client
            .from("pages")
            .insert({ ...row, created_at: now })
            .select()
            .maybeSingle();
        }

        for (let attempt = 0; attempt < 15 && res?.error; attempt++) {
          const missingCol = extractMissingColumnName(res.error);
          if (missingCol && missingCol in row) {
            console.warn(`Stripping missing column '${missingCol}' from fallback pages and retrying...`);
            delete row[missingCol];
            if (existingPageId) {
              res = await client
                .from("pages")
                .update(row)
                .eq("id", existingPageId)
                .select()
                .maybeSingle();
            } else {
              res = await client
                .from("pages")
                .insert({ ...row, created_at: now })
                .select()
                .maybeSingle();
            }
          } else {
            break;
          }
        }
      }

      // 6. Dual-Sync into review_pages if this is a review page
      if (row.type === "review") {
        try {
          const productList = Array.isArray(row.product_ids) ? row.product_ids : [];
          const firstProductId = productList[0];
          if (firstProductId) {
            const { data: prodRow } = await client
              .from("products")
              .select("id")
              .or(`id.eq.${firstProductId},ali_id.eq.${firstProductId},ali_product_id.eq.${firstProductId}`)
              .maybeSingle();

            if (prodRow?.id) {
              await client.from("review_pages").upsert({
                slug: cleanSlug,
                product_id: prodRow.id,
                seo_title: row.meta_title || row.title,
                seo_description: row.meta_description || "",
                content_html: row.content_markdown || "",
                pros: Array.isArray(row.pros) ? row.pros : [],
                cons: Array.isArray(row.cons) ? row.cons : [],
                verdict: row.direct_answer_geo || null,
                is_published: row.status === "published",
                view_count: row.views_count || 0,
                updated_at: now,
              }, { onConflict: "slug" });
            }
          }
        } catch (revSyncErr) {
          // Ignore if review_pages schema does not match or table missing
        }
      }

      if (res?.error) {
        console.error("Supabase upsertPage final error:", res.error.message, `[code: ${res.error.code}]`);
        throw new Error(`שגיאת שמירה במסד הנתונים Supabase: ${res.error.message} (קוד: ${res.error.code || "UNKNOWN"})`);
      }

      if (!res?.data) {
        throw new Error(`מסד הנתונים Supabase לא החזיר רשומה שמורה עבור עמוד "${cleanSlug}"`);
      }

      return mapPageFromSupabase(res.data);
    } catch (err: any) {
      console.error("Supabase upsertPage exception:", err);
      throw err;
    }
  },

  async deletePage(idOrSlug: string): Promise<boolean> {
    const clean = String(idOrSlug || "").trim();
    if (!clean) return true;
    jsonDb.deletePage(clean);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      // 1. Direct lookup by id then slug
      let pageId = clean;
      let pageSlug = clean;

      let decoded = clean;
      try {
        decoded = decodeURIComponent(clean);
      } catch {
        decoded = clean;
      }

      const { data: pageById } = await client
        .from("pages")
        .select("id, slug")
        .eq("id", clean)
        .maybeSingle();

      if (pageById) {
        pageId = pageById.id;
        pageSlug = pageById.slug;
      } else {
        let { data: pageBySlug } = await client
          .from("pages")
          .select("id, slug")
          .eq("slug", decoded)
          .maybeSingle();

        if (!pageBySlug && decoded !== clean) {
          const retry = await client
            .from("pages")
            .select("id, slug")
            .eq("slug", clean)
            .maybeSingle();
          pageBySlug = retry.data;
        }

        if (pageBySlug) {
          pageId = pageBySlug.id;
          pageSlug = pageBySlug.slug;
        }
      }

      // 2. Cascade clean from page_products junction
      await client.from("page_products").delete().eq("page_id", pageId);

      // 3. Delete from pages table
      await client.from("pages").delete().eq("id", pageId);
      if (pageSlug) {
        await client.from("pages").delete().eq("slug", pageSlug);
      }
      if (decoded && decoded !== pageId && decoded !== pageSlug) {
        await client.from("pages").delete().eq("slug", decoded);
      }
      if (clean !== pageId && clean !== pageSlug && clean !== decoded) {
        await client.from("pages").delete().eq("id", clean);
        await client.from("pages").delete().eq("slug", clean);
      }

      // 4. Also delete from review_pages if exists
      try {
        await client.from("review_pages").delete().eq("slug", pageSlug || decoded || clean);
        await client.from("review_pages").delete().eq("id", pageId);
      } catch {}

      return true;
    } catch (err: any) {
      console.warn("Supabase deletePage exception:", err?.message || err);
      return true;
    }
  },

  async deletePages(idsOrSlugs: string[]): Promise<boolean> {
    jsonDb.deletePages(idsOrSlugs);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      for (const item of idsOrSlugs) {
        await this.deletePage(item);
      }
      return true;
    } catch (err) {
      console.warn("Supabase deletePages exception:", err);
      return true;
    }
  },

  async getPageProducts(pageIdOrSlug: string): Promise<PageProductRecord[]> {
    const clean = String(pageIdOrSlug || "").trim();
    if (!clean) return [];

    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getPageProducts(clean);

    try {
      let targetPageId = clean;
      const { data: pageRow } = await client
        .from("pages")
        .select("id")
        .or(`id.eq.${clean},slug.eq.${clean}`)
        .maybeSingle();

      if (pageRow?.id) {
        targetPageId = pageRow.id;
      }

      const { data, error } = await client
        .from("page_products")
        .select("*")
        .eq("page_id", targetPageId)
        .order("position", { ascending: true });

      if (error || !data) {
        return jsonDb.getPageProducts(targetPageId);
      }

      return data.map((r: any) => ({
        pageId: r.page_id,
        productId: r.product_id,
        position: Number(r.position) || 1,
        badge: r.badge || undefined,
        pros: Array.isArray(r.pros) ? r.pros : [],
        cons: Array.isArray(r.cons) ? r.cons : [],
        customReview: r.custom_review || undefined,
        createdAt: r.created_at,
      }));
    } catch {
      return jsonDb.getPageProducts(clean);
    }
  },

  async setPageProducts(
    pageIdOrSlug: string,
    products: Array<{
      productId: string;
      position?: number;
      badge?: string;
      pros?: string[];
      cons?: string[];
      customReview?: string;
    }>
  ): Promise<void> {
    const clean = String(pageIdOrSlug || "").trim();
    if (!clean || !products.length) return;

    // Local JSON backup
    try {
      jsonDb.setPageProducts(clean, products);
    } catch {}

    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      let targetPageId = clean;
      const { data: pageRow } = await client
        .from("pages")
        .select("id")
        .or(`id.eq.${clean},slug.eq.${clean}`)
        .maybeSingle();

      if (pageRow?.id) {
        targetPageId = pageRow.id;
      }

      // Clear existing junction rows
      await client.from("page_products").delete().eq("page_id", targetPageId);

      const rows = products.map((p, idx) => ({
        page_id: targetPageId,
        product_id: p.productId,
        position: p.position ?? idx + 1,
        badge: p.badge || null,
        pros: Array.isArray(p.pros) ? p.pros : [],
        cons: Array.isArray(p.cons) ? p.cons : [],
        custom_review: p.customReview || null,
        created_at: new Date().toISOString(),
      }));

      const { error } = await client.from("page_products").insert(rows);
      if (error) {
        console.warn("Supabase setPageProducts notice:", error.message);
      }
    } catch (err: any) {
      console.warn("Supabase setPageProducts exception:", err?.message || err);
    }
  },

  // ==========================================
  // CATEGORIES
  // ==========================================
  async getCategories(): Promise<CategoryRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getCategories();

    try {
      const { data, error } = await client
        .from("categories")
        .select("*")
        .order("name_he", { ascending: true });

      if (error || !data) {
        return jsonDb.getCategories();
      }
      return data.map(mapCategoryFromSupabase);
    } catch {
      return jsonDb.getCategories();
    }
  },

  async getCategoryBySlug(slug: string): Promise<CategoryRecord | null> {
    const local = jsonDb.getCategories().find((c) => c.slug === slug || c.nameHe === slug);
    const client = getSupabaseServerClient();
    if (!client) return local || null;

    try {
      const clean = String(slug || "").trim();
      let { data, error } = await client
        .from("categories")
        .select("*")
        .eq("slug", clean)
        .maybeSingle();

      if (!data && !error) {
        const retry = await client
          .from("categories")
          .select("*")
          .eq("name_he", clean)
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        return local || null;
      }
      return data ? mapCategoryFromSupabase(data) : null;
    } catch {
      return local || null;
    }
  },

  async upsertCategory(cat: Partial<CategoryRecord>): Promise<CategoryRecord> {
    jsonDb.upsertCategory(cat as CategoryRecord);

    const client = getSupabaseServerClient();
    if (!client) return cat as CategoryRecord;

    try {
      const now = new Date().toISOString();
      const cleanSlug = String(cat.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-");
      const id = cat.id || `cat_${cleanSlug}_${Date.now()}`;

      // Ensure site 'alideals' exists
      try {
        await client.from("sites").upsert({
          id: "alideals",
          domain: "ali-deals.co.il",
          name: "AliDeals ישראל",
          theme_color: "#ea580c",
        }, { onConflict: "id" });
      } catch {}

      const row: any = {
        id,
        site_id: "alideals",
        slug: cleanSlug,
        path: cat.path || cleanSlug,
        name_he: cat.nameHe || cleanSlug,
        icon: cat.icon || "🏷️",
        description_he: cat.descriptionHe || "",
        level: Number(cat.level) || 0,
        sort_order: Number(cat.sortOrder) || 0,
        is_featured: Boolean(cat.isFeatured),
        tags: Array.isArray(cat.tags) ? cat.tags : [],
        ali_category_id: cat.aliCategoryId || null,
        updated_at: now,
      };

      const { data, error } = await client
        .from("categories")
        .upsert(row, { onConflict: "slug" })
        .select()
        .maybeSingle();

      if (error) {
        console.warn("Supabase upsertCategory error:", error.message);
      }
      return data ? mapCategoryFromSupabase(data) : (cat as CategoryRecord);
    } catch (err) {
      console.warn("Supabase upsertCategory exception:", err);
      return cat as CategoryRecord;
    }
  },

  async deleteCategory(idOrSlug: string): Promise<boolean> {
    const clean = String(idOrSlug || "").trim();
    jsonDb.deleteCategory(clean);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client.from("categories").delete().eq("id", clean);
      await client.from("categories").delete().eq("slug", clean);
      return true;
    } catch (err) {
      console.warn("Supabase deleteCategory exception:", err);
      return true;
    }
  },

  // ==========================================
  // SITE SETTINGS (WITH IN-MEMORY CACHE)
  // ==========================================
  async getSettings(): Promise<SiteSettingsRecord> {
    // 0. Check in-memory fast cache (30s TTL)
    const now = Date.now();
    const globalCached = (globalThis as any)._siteSettingsCache as { data: SiteSettingsRecord; time: number } | undefined;
    if (globalCached && now - globalCached.time < 30_000) {
      return globalCached.data;
    }

    const client = getSupabaseServerClient();
    const localSettings = analyticsDb.getSettings();
    if (!client) return localSettings;

    try {
      // 1. Fetch site_settings table
      const { data, error } = await client
        .from("site_settings")
        .select("*")
        .eq("id", "singleton")
        .maybeSingle();

      let cloudGeminiKey = data?.gemini_api_key || undefined;
      let siteJsonSettings: any = {};

      // 2. Fetch sites table settings JSONB (100% schema resilient)
      try {
        const { data: siteData } = await client
          .from("sites")
          .select("settings")
          .eq("id", "alideals")
          .maybeSingle();
        if (siteData?.settings) {
          siteJsonSettings = siteData.settings;
          if (!cloudGeminiKey && siteData.settings.geminiApiKey) {
            cloudGeminiKey = siteData.settings.geminiApiKey;
          }
        }
      } catch {}

      // 3. Fallback check: environment variables
      if (!cloudGeminiKey) {
        cloudGeminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || undefined;
      }

      // 4. Fallback check: local analyticsDb
      if (!cloudGeminiKey) {
        cloudGeminiKey = localSettings.geminiApiKey || undefined;
      }

      if (cloudGeminiKey && !cloudGeminiKey.includes("placeholder")) {
        (globalThis as any)._cachedGeminiKey = cloudGeminiKey;
      }

      const merged: SiteSettingsRecord = {
        gaMeasurementId: data?.ga_measurement_id || siteJsonSettings.gaMeasurementId || localSettings.gaMeasurementId,
        geminiApiKey: cloudGeminiKey,
        siteUrl: data?.site_url || siteJsonSettings.siteUrl || localSettings.siteUrl || "https://ali-deals.co.il",
        aliexpressAppKey: data?.aliexpress_app_key || siteJsonSettings.aliexpressAppKey || localSettings.aliexpressAppKey,
        aliexpressAppSecret: data?.aliexpress_app_secret || siteJsonSettings.aliexpressAppSecret || localSettings.aliexpressAppSecret,
        aliexpressDefaultTrackingId: data?.aliexpress_default_tracking_id || siteJsonSettings.aliexpressDefaultTrackingId || localSettings.aliexpressDefaultTrackingId || "default",
        enableDealRequestWidget: siteJsonSettings.enableDealRequestWidget !== undefined ? siteJsonSettings.enableDealRequestWidget : localSettings.enableDealRequestWidget,
        dealRequestTelegramUrl: siteJsonSettings.dealRequestTelegramUrl || localSettings.dealRequestTelegramUrl,
        dealRequestTitle: siteJsonSettings.dealRequestTitle || localSettings.dealRequestTitle,
        // GTM & Custom Tracking Scripts
        gtmId: data?.gtm_id || siteJsonSettings.gtmId || localSettings.gtmId || undefined,
        gtmHeadScript: data?.gtm_head_script || siteJsonSettings.gtmHeadScript || localSettings.gtmHeadScript || undefined,
        gtmBodyScript: data?.gtm_body_script || siteJsonSettings.gtmBodyScript || localSettings.gtmBodyScript || undefined,
        customHeadScript: data?.custom_head_script || siteJsonSettings.customHeadScript || localSettings.customHeadScript || undefined,
        customBodyScript: data?.custom_body_script || siteJsonSettings.customBodyScript || localSettings.customBodyScript || undefined,
        updatedAt: data?.updated_at || siteJsonSettings.updatedAt || new Date().toISOString(),
      };

      // Cache in memory for 30s
      (globalThis as any)._siteSettingsCache = { data: merged, time: now };
      return merged;
    } catch {
      return localSettings;
    }
  },

  async updateSettings(settings: Partial<SiteSettingsRecord>): Promise<SiteSettingsRecord> {
    // Invalidate in-memory cache immediately
    (globalThis as any)._siteSettingsCache = undefined;

    const current = analyticsDb.updateSettings(settings);

    if (settings.geminiApiKey) {
      (globalThis as any)._cachedGeminiKey = settings.geminiApiKey;
    }

    const client = getSupabaseServerClient();
    if (!client) return current;

    // 1. Persist to sites table JSONB (guaranteed persistence across serverless cold starts)
    try {
      const { data: siteData } = await client
        .from("sites")
        .select("settings")
        .eq("id", "alideals")
        .maybeSingle();
      const existingSettings = siteData?.settings || {};
      const newSettings = {
        ...existingSettings,
        ...settings,
      };
      await client.from("sites").upsert({
        id: "alideals",
        domain: "ali-deals.co.il",
        name: "AliDeals ישראל",
        settings: newSettings,
      }, { onConflict: "id" });
    } catch (siteErr) {
      console.warn("Persisting settings to sites table JSONB warning:", siteErr);
    }

    // 2. Also persist to site_settings table
    try {
      const row: Record<string, any> = {
        id: "singleton",
        ga_measurement_id: current.gaMeasurementId,
        gemini_api_key: current.geminiApiKey,
        site_url: current.siteUrl,
        aliexpress_app_key: current.aliexpressAppKey,
        aliexpress_app_secret: current.aliexpressAppSecret,
        aliexpress_default_tracking_id: current.aliexpressDefaultTrackingId || "default",
        gtm_id: current.gtmId || null,
        gtm_head_script: current.gtmHeadScript || null,
        gtm_body_script: current.gtmBodyScript || null,
        custom_head_script: current.customHeadScript || null,
        custom_body_script: current.customBodyScript || null,
        updated_at: new Date().toISOString(),
      };

      let res = await client.from("site_settings").upsert(row, { onConflict: "id" });
      if (res.error && res.error.message?.includes("gemini_api_key")) {
        delete row.gemini_api_key;
        await client.from("site_settings").upsert(row, { onConflict: "id" });
      }
      return current;
    } catch {
      return current;
    }
  },

  async saveSettings(settings: Partial<SiteSettingsRecord>): Promise<SiteSettingsRecord> {
    return this.updateSettings(settings);
  },

  // ==========================================
  // OUTBOUND CLICKS
  // ==========================================
  async recordClick(click: OutboundClickRecord): Promise<boolean> {
    analyticsDb.recordClick(click);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client.from("outbound_clicks").insert({
        product_id: click.productId,
        product_title: click.productTitle,
        price_usd: click.priceUsd,
        price_ils: click.priceIls,
        page_slug: click.pageSlug,
        link_type: click.linkType,
        destination_url: click.destinationUrl,
        referrer: click.referrer || null,
      });
      return true;
    } catch {
      return true;
    }
  },

  async getClicks(limit = 100): Promise<OutboundClickRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return analyticsDb.getClicks(limit);

    try {
      const { data, error } = await client
        .from("outbound_clicks")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error || !data) return analyticsDb.getClicks(limit);

      return data.map((c: any) => ({
        id: c.id,
        timestamp: c.timestamp,
        productId: c.product_id,
        productTitle: c.product_title,
        priceUsd: Number(c.price_usd) || 0,
        priceIls: Number(c.price_ils) || 0,
        pageSlug: c.page_slug,
        linkType: c.link_type,
        destinationUrl: c.destination_url,
        referrer: c.referrer,
      }));
    } catch {
      return analyticsDb.getClicks(limit);
    }
  },

  async getClickSummary(): Promise<{ clickoutsCount: number; subIdBreakdown: Record<string, number> }> {
    const client = getSupabaseServerClient();
    if (!client) return analyticsDb.getSummary();

    const subIdBreakdown: Record<string, number> = {
      top5_card: 0,
      popup_featured: 0,
      category_grid: 0,
      product_review_cta: 0,
      live_search_result: 0,
      cross_sell_item: 0,
      cross_sell_bundle: 0,
    };

    try {
      // 1. Get exact total click count from outbound_clicks
      const countRes = await client.from("outbound_clicks").select("*", { count: "exact", head: true });
      const totalCount = countRes.count ?? 0;

      // 2. Fetch recent clicks to calculate subId breakdown
      const { data, error } = await client
        .from("outbound_clicks")
        .select("link_type, page_slug")
        .order("timestamp", { ascending: false })
        .limit(2000);

      if (!error && data && data.length > 0) {
        data.forEach((row: any) => {
          const type = row.link_type || "other";
          subIdBreakdown[type] = (subIdBreakdown[type] || 0) + 1;
        });
        return {
          clickoutsCount: totalCount > 0 ? totalCount : data.length,
          subIdBreakdown,
        };
      }

      if (totalCount === 0) {
        return analyticsDb.getSummary();
      }

      return { clickoutsCount: totalCount, subIdBreakdown };
    } catch {
      return analyticsDb.getSummary();
    }
  },

  // ==========================================
  // S2S CONVERSIONS
  // ==========================================
  async recordConversion(conversion: Omit<S2SConversionRecord, "id" | "timestamp">): Promise<S2SConversionRecord> {
    const local = analyticsDb.recordConversion(conversion);

    const client = getSupabaseServerClient();
    if (!client) return local;

    try {
      await client.from("conversions").insert({
        id: local.id,
        order_id: conversion.orderId,
        sub_id: conversion.subId || null,
        product_id: conversion.productId || null,
        product_title: conversion.productTitle || null,
        order_amount_usd: conversion.orderAmountUsd || 0,
        commission_usd: conversion.commissionUsd || 0,
        commission_ils: conversion.commissionIls || 0,
        status: conversion.status || "approved",
        source: conversion.source || "aliexpress",
        raw_payload: conversion.rawPayload || null,
      });
    } catch (e) {
      console.warn("Supabase recordConversion error:", e);
    }

    return local;
  },

  async getConversions(limit = 100): Promise<S2SConversionRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return analyticsDb.getConversions(limit);

    try {
      const { data, error } = await client
        .from("conversions")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (error || !data || data.length === 0) return analyticsDb.getConversions(limit);

      return data.map((c: any) => ({
        id: c.id,
        orderId: c.order_id,
        subId: c.sub_id,
        productId: c.product_id,
        productTitle: c.product_title,
        orderAmountUsd: Number(c.order_amount_usd) || 0,
        commissionUsd: Number(c.commission_usd) || 0,
        commissionIls: Number(c.commission_ils) || 0,
        status: c.status || "approved",
        source: c.source,
        rawPayload: c.raw_payload,
        timestamp: c.timestamp,
      }));
    } catch {
      return analyticsDb.getConversions(limit);
    }
  },

  // ==========================================
  // GSC QUERIES
  // ==========================================
  async getGscQueries(): Promise<GscQueryRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return analyticsDb.getGscQueries();

    try {
      const { data, error } = await client
        .from("gsc_queries")
        .select("*")
        .order("impressions", { ascending: false });

      if (error || !data) return analyticsDb.getGscQueries();

      return data.map((q: any) => ({
        id: q.id,
        query: q.query,
        page: q.page,
        clicks: Number(q.clicks) || 0,
        impressions: Number(q.impressions) || 0,
        ctr: Number(q.ctr) || 0,
        position: Number(q.position) || 0,
        opportunityType: q.opportunity_type,
        date: q.date,
        importedAt: q.imported_at,
      }));
    } catch {
      return analyticsDb.getGscQueries();
    }
  },

  async importGscQueries(queries: Array<Omit<GscQueryRecord, "id" | "importedAt">>): Promise<{ count: number }> {
    analyticsDb.importGscQueries(queries);

    const client = getSupabaseServerClient();
    if (!client) return { count: queries.length };

    try {
      const rows = queries.map((q, idx) => ({
        id: `gsc_${Date.now()}_${idx}`,
        query: String(q.query || "").trim(),
        page: q.page ? String(q.page).trim() : null,
        clicks: Number(q.clicks) || 0,
        impressions: Number(q.impressions) || 0,
        ctr: typeof q.ctr === "number" ? q.ctr : parseFloat(String(q.ctr || 0).replace("%", "")) || 0,
        position: typeof q.position === "number" ? q.position : parseFloat(String(q.position || 0)) || 0,
        date: q.date || null,
        imported_at: new Date().toISOString(),
      }));

      await client.from("gsc_queries").upsert(rows, { onConflict: "id" });
      return { count: rows.length };
    } catch {
      return { count: queries.length };
    }
  },

  async clearAnalytics(type: "all" | "clicks" | "gsc" | "ga4"): Promise<boolean> {
    analyticsDb.clearAnalytics(type);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      if (type === "all" || type === "clicks") {
        await client.from("outbound_clicks").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }
      if (type === "all" || type === "gsc") {
        await client.from("gsc_queries").delete().neq("id", "none");
      }
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // AGENT LOGS & MESSAGES
  // ==========================================
  async saveAgentLog(log: AgentLogEntry): Promise<boolean> {
    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client.from("agent_logs").insert({
        id: log.id,
        role: log.role,
        agent_name: log.agentName,
        level: log.level,
        message: log.message,
        metadata: log.metadata || {},
        created_at: new Date().toISOString(),
      });
      return true;
    } catch {
      return true;
    }
  },

  async getAgentLogs(limit = 100): Promise<AgentLogEntry[]> {
    const client = getSupabaseServerClient();
    if (!client) {
      const { safeReadJson } = await import("@/lib/agent/storage-helper");
      return safeReadJson<AgentLogEntry[]>("agent_logs.json", []).slice(0, limit);
    }

    try {
      const { data, error } = await client
        .from("agent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error || !data) {
        const { safeReadJson } = await import("@/lib/agent/storage-helper");
        return safeReadJson<AgentLogEntry[]>("agent_logs.json", []).slice(0, limit);
      }

      return data.map((row: any) => ({
        id: row.id,
        timestamp: new Date(row.created_at).toLocaleTimeString("he-IL", { hour12: false }),
        role: row.role,
        agentName: row.agent_name,
        level: row.level,
        message: row.message,
        metadata: row.metadata,
      }));
    } catch {
      const { safeReadJson } = await import("@/lib/agent/storage-helper");
      return safeReadJson<AgentLogEntry[]>("agent_logs.json", []).slice(0, limit);
    }
  },

  async saveAgentMessage(msg: OrchestratorMessage): Promise<boolean> {
    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client.from("agent_messages").insert({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        timestamp: msg.timestamp,
        created_at: new Date().toISOString(),
      });
      return true;
    } catch {
      return true;
    }
  },

  async getAgentMessages(limit = 50): Promise<OrchestratorMessage[]> {
    const client = getSupabaseServerClient();
    if (!client) {
      const { safeReadJson } = await import("@/lib/agent/storage-helper");
      return safeReadJson<OrchestratorMessage[]>("agent_messages.json", []).slice(0, limit);
    }

    try {
      const { data, error } = await client
        .from("agent_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error || !data) {
        const { safeReadJson } = await import("@/lib/agent/storage-helper");
        return safeReadJson<OrchestratorMessage[]>("agent_messages.json", []).slice(0, limit);
      }

      return data.map((row: any) => ({
        id: row.id,
        sender: row.sender,
        text: row.text,
        timestamp: row.timestamp,
      }));
    } catch {
      const { safeReadJson } = await import("@/lib/agent/storage-helper");
      return safeReadJson<OrchestratorMessage[]>("agent_messages.json", []).slice(0, limit);
    }
  },

  async clearAgentMessages(): Promise<boolean> {
    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client.from("agent_messages").delete().neq("id", "none");
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // PAGE PRODUCTS (RELATIONAL JUNCTION)
  // ==========================================
  async getPageProducts(pageId: string): Promise<PageProductRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from("page_products")
        .select("*")
        .eq("page_id", pageId)
        .order("position", { ascending: true });

      if (error || !data) return [];
      return data.map((row: any) => ({
        pageId: row.page_id,
        productId: row.product_id,
        position: Number(row.position) || 1,
        badge: row.badge,
        pros: Array.isArray(row.pros) ? row.pros : [],
        cons: Array.isArray(row.cons) ? row.cons : [],
        customReview: row.custom_review,
        createdAt: row.created_at,
      }));
    } catch {
      return [];
    }
  },

  async setPageProducts(
    pageId: string,
    items: Array<{ productId: string; position: number; badge?: string; pros?: string[]; cons?: string[]; customReview?: string }>
  ): Promise<boolean> {
    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client.from("page_products").delete().eq("page_id", pageId);
      if (items.length > 0) {
        const rows = items.map((it) => ({
          page_id: pageId,
          product_id: it.productId,
          position: it.position,
          badge: it.badge || null,
          pros: it.pros || [],
          cons: it.cons || [],
          custom_review: it.customReview || null,
        }));
        await client.from("page_products").insert(rows);
      }
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // PRICE HISTORY
  // ==========================================
  async recordPriceHistory(productId: string, priceUsd: number, priceIls: number): Promise<boolean> {
    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client.from("product_price_history").insert({
        product_id: productId,
        price_usd: priceUsd,
        price_ils: priceIls,
      });
      return true;
    } catch {
      return true;
    }
  },

  async getPriceHistory(productId: string, days = 30): Promise<PriceHistoryRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return [];

    try {
      const since = new Date(Date.now() - days * 86400000).toISOString();
      const { data, error } = await client
        .from("product_price_history")
        .select("*")
        .eq("product_id", productId)
        .gte("recorded_at", since)
        .order("recorded_at", { ascending: true });

      if (error || !data) return [];
      return data.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        priceUsd: Number(r.price_usd) || 0,
        priceIls: Number(r.price_ils) || 0,
        recordedAt: r.recorded_at,
      }));
    } catch {
      return [];
    }
  },

  // ==========================================
  // COUPONS & DEALS
  // ==========================================
  async getActiveCoupons(siteId = "alideals"): Promise<CouponRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from("coupons_deals")
        .select("*")
        .eq("site_id", siteId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error || !data) return [];
      return data.map((c: any) => ({
        id: c.id,
        siteId: c.site_id,
        code: c.code,
        titleHe: c.title_he,
        descriptionHe: c.description_he,
        discountAmount: Number(c.discount_amount) || 0,
        minSpendUsd: Number(c.min_spend_usd) || 0,
        categoryId: c.category_id,
        affiliateUrl: c.affiliate_url,
        isActive: c.is_active,
        validFrom: c.valid_from,
        validTo: c.valid_to,
        createdAt: c.created_at,
      }));
    } catch {
      return [];
    }
  },

  // ==========================================
  // GRADUATED AGENT TASKS QUEUE
  // ==========================================
  async createAgentTask(task: {
    siteId?: string;
    agentRole: string;
    taskType: string;
    priority?: number;
    payload: any;
    scheduledAt?: string;
  }): Promise<AgentTaskRecord | null> {
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const record: AgentTaskRecord = {
      id,
      siteId: task.siteId || "alideals",
      agentRole: task.agentRole,
      taskType: task.taskType,
      priority: task.priority || 2,
      status: "queued",
      payload: task.payload,
      scheduledAt: task.scheduledAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    const client = getSupabaseServerClient();
    if (!client) return record;

    try {
      await client.from("agent_tasks").insert({
        id: record.id,
        site_id: record.siteId,
        agent_role: record.agentRole,
        task_type: record.taskType,
        priority: record.priority,
        status: record.status,
        payload: record.payload,
        scheduled_at: record.scheduledAt,
      });
      return record;
    } catch {
      return record;
    }
  },

  async getPendingAgentTasks(limit = 10): Promise<AgentTaskRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return [];

    try {
      const now = new Date().toISOString();
      const { data, error } = await client
        .from("agent_tasks")
        .select("*")
        .in("status", ["queued", "throttled"])
        .lte("scheduled_at", now)
        .order("priority", { ascending: true })
        .order("scheduled_at", { ascending: true })
        .limit(limit);

      if (error || !data) return [];
      return data.map((t: any) => ({
        id: t.id,
        siteId: t.site_id,
        agentRole: t.agent_role,
        taskType: t.task_type,
        priority: t.priority,
        status: t.status,
        payload: t.payload,
        result: t.result,
        errorMessage: t.error_message,
        retryCount: t.retry_count,
        maxRetries: t.max_retries,
        scheduledAt: t.scheduled_at,
        startedAt: t.started_at,
        completedAt: t.completed_at,
        createdAt: t.created_at,
      }));
    } catch {
      return [];
    }
  },

  async updateAgentTaskStatus(
    id: string,
    status: AgentTaskRecord["status"],
    result?: any,
    errorMessage?: string
  ): Promise<boolean> {
    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      const now = new Date().toISOString();
      const updateData: any = {
        status,
      };

      if (status === "running") {
        updateData.started_at = now;
      } else if (status === "completed" || status === "failed") {
        updateData.completed_at = now;
        if (result !== undefined) updateData.result = result;
        if (errorMessage) updateData.error_message = errorMessage;
      }

      await client.from("agent_tasks").update(updateData).eq("id", id);
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // COUPONS
  // ==========================================
  async getCoupons(options?: { exitModalOnly?: boolean }): Promise<CouponRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) {
      const local = jsonDb.getCoupons();
      if (options?.exitModalOnly) {
        return local.filter((c) => c.isActive && (c.showInExitModal || c.placements?.includes("popup") || c.placements?.includes("all")));
      }
      return local;
    }

    try {
      // 1. Try public.coupons table
      let { data, error } = await client
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        let list: CouponRecord[] = data.map((c: any) => ({
          id: c.id,
          code: c.code,
          title: c.discount_value,
          titleHe: c.discount_value,
          descriptionHe: c.discount_value,
          discountText: c.discount_value,
          minSpendUsd: c.min_spend_usd ? Number(c.min_spend_usd) : undefined,
          affiliateUrl: c.affiliate_link,
          placements: c.show_in_exit_modal ? ["popup", "all"] : ["all"],
          clickCount: Number(c.usage_count) || 0,
          showInExitModal: Boolean(c.show_in_exit_modal),
          showSitewide: Boolean(c.show_sitewide),
          isActive: Boolean(c.is_active),
          expiresAt: c.expires_at,
          validTo: c.expires_at,
          createdAt: c.created_at,
        }));

        if (options?.exitModalOnly) {
          list = list.filter((c) => c.isActive && c.showInExitModal);
        }
        return list;
      }

      // 2. Fallback to coupons_deals table
      const legacyRes = await client
        .from("coupons_deals")
        .select("*")
        .order("created_at", { ascending: false });

      if (legacyRes.data && !legacyRes.error) {
        let list: CouponRecord[] = legacyRes.data.map((c: any) => ({
          id: c.id,
          siteId: c.site_id || "alideals",
          code: c.code,
          title: c.title_he,
          titleHe: c.title_he,
          descriptionHe: c.description_he,
          discountText: c.description_he || (c.discount_percent ? `${c.discount_percent}% הנחה` : undefined),
          discountAmount: c.discount_amount ? Number(c.discount_amount) : undefined,
          discountPercent: c.discount_percent ? Number(c.discount_percent) : undefined,
          minSpendUsd: c.min_spend_usd ? Number(c.min_spend_usd) : undefined,
          categoryId: c.category_id,
          affiliateUrl: c.affiliate_url,
          placements: Array.isArray(c.placements) ? c.placements : ["all"],
          targetCategoryIds: Array.isArray(c.target_category_ids) ? c.target_category_ids : [],
          targetProductIds: Array.isArray(c.target_product_ids) ? c.target_product_ids : [],
          clickCount: Number(c.click_count) || 0,
          showInExitModal: true,
          isActive: Boolean(c.is_active),
          validFrom: c.valid_from,
          validTo: c.valid_to,
          expiresAt: c.valid_to,
          createdAt: c.created_at,
        }));

        if (options?.exitModalOnly) {
          list = list.filter((c) => c.isActive);
        }
        return list;
      }

      return jsonDb.getCoupons();
    } catch {
      return jsonDb.getCoupons();
    }
  },

  async getCouponById(id: string): Promise<CouponRecord | null> {
    const local = jsonDb.getCoupons().find((c) => c.id === id || c.code.toUpperCase() === id.toUpperCase());
    const client = getSupabaseServerClient();
    if (!client) return local || null;

    try {
      const clean = String(id || "").trim();
      let { data, error } = await client
        .from("coupons_deals")
        .select("*")
        .eq("id", clean)
        .maybeSingle();

      if (!data && !error) {
        const retry = await client
          .from("coupons_deals")
          .select("*")
          .eq("code", clean.toUpperCase())
          .maybeSingle();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        return local || null;
      }
      if (!data) return null;

      return {
        id: data.id,
        siteId: data.site_id || "alideals",
        code: data.code,
        title: data.title_he,
        titleHe: data.title_he,
        descriptionHe: data.description_he,
        discountText: data.description_he || (data.discount_percent ? `${data.discount_percent}% הנחה` : undefined),
        discountAmount: data.discount_amount ? Number(data.discount_amount) : undefined,
        discountPercent: data.discount_percent ? Number(data.discount_percent) : undefined,
        minSpendUsd: data.min_spend_usd ? Number(data.min_spend_usd) : undefined,
        categoryId: data.category_id,
        affiliateUrl: data.affiliate_url,
        placements: Array.isArray(data.placements) ? data.placements : ["all"],
        targetCategoryIds: Array.isArray(data.target_category_ids) ? data.target_category_ids : [],
        targetProductIds: Array.isArray(data.target_product_ids) ? data.target_product_ids : [],
        clickCount: Number(data.click_count) || 0,
        showInExitModal: true,
        isActive: Boolean(data.is_active),
        validFrom: data.valid_from,
        validTo: data.valid_to,
        expiresAt: data.valid_to,
        createdAt: data.created_at,
      };
    } catch {
      return local || null;
    }
  },

  async upsertCoupon(record: CouponRecord): Promise<CouponRecord> {
    jsonDb.upsertCoupon(record);

    const client = getSupabaseServerClient();
    if (!client) return record;

    try {
      const cleanCode = String(record.code || "").trim().toUpperCase();
      const title = record.titleHe || record.title || `קופון ${cleanCode}`;
      const description = record.descriptionHe || record.discountText || null;
      const validTo = record.validTo || record.expiresAt || null;

      // Upsert to coupons_deals
      await client.from("coupons_deals").upsert({
        id: record.id || `cpn_${Date.now()}`,
        site_id: "alideals",
        code: cleanCode,
        title_he: title,
        description_he: description,
        discount_amount: record.discountAmount || null,
        discount_percent: record.discountPercent || null,
        min_spend_usd: record.minSpendUsd || null,
        category_id: record.categoryId || null,
        affiliate_url: record.affiliateUrl || null,
        is_active: record.isActive !== undefined ? Boolean(record.isActive) : true,
        valid_from: record.validFrom || new Date().toISOString(),
        valid_to: validTo,
      }, { onConflict: "code" });

      // Upsert to coupons table
      try {
        await client.from("coupons").upsert({
          code: cleanCode,
          discount_value: record.discountText || (record.discountAmount ? `$${record.discountAmount} הנחה` : "הנחה מיוחדת"),
          min_spend_usd: record.minSpendUsd || 0,
          expires_at: validTo,
          affiliate_link: record.affiliateUrl || null,
          is_active: record.isActive !== undefined ? Boolean(record.isActive) : true,
          show_in_exit_modal: Boolean(record.showInExitModal),
          show_sitewide: Boolean(record.showSitewide ?? true),
        }, { onConflict: "code" });
      } catch {}

      return record;
    } catch {
      return record;
    }
  },

  async deleteCoupon(idOrCode: string): Promise<boolean> {
    const clean = String(idOrCode || "").trim();
    jsonDb.deleteCoupon(clean);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client.from("coupons_deals").delete().eq("id", clean);
      await client.from("coupons_deals").delete().eq("code", clean.toUpperCase());
      try {
        await client.from("coupons").delete().eq("id", clean);
        await client.from("coupons").delete().eq("code", clean.toUpperCase());
      } catch {}
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // UGC VERIFICATIONS (ISRAELI COMMUNITY BADGES)
  // ==========================================
  async submitUgcVerification(data: {
    productId: string;
    isEuPlug?: boolean;
    deliveryDays?: number;
    voltage220vCompatible?: boolean;
    isRecommended?: boolean;
    buyerComment?: string;
  }): Promise<UgcVerificationRecord> {
    const cleanProdId = String(data.productId || "").trim();
    const newRecord: UgcVerificationRecord = {
      id: `ugc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      productId: cleanProdId,
      isEuPlug: data.isEuPlug ?? true,
      deliveryDays: data.deliveryDays ?? 11,
      voltage220vCompatible: data.voltage220vCompatible ?? true,
      isRecommended: data.isRecommended ?? true,
      buyerComment: data.buyerComment?.slice(0, 300) || undefined,
      isApproved: true, // Auto-approve for instant crowd feedback
      createdAt: new Date().toISOString(),
    };

    const client = getSupabaseServerClient();
    if (!client) return newRecord;

    try {
      let targetProductId = cleanProdId;
      const { data: prod } = await client
        .from("products")
        .select("id")
        .or(`id.eq.${cleanProdId},ali_id.eq.${cleanProdId},ali_product_id.eq.${cleanProdId}`)
        .maybeSingle();

      if (prod?.id) {
        targetProductId = prod.id;
      }

      await client.from("ugc_verifications").insert({
        product_id: targetProductId,
        is_eu_plug: newRecord.isEuPlug,
        delivery_days: newRecord.deliveryDays,
        voltage_220v_compatible: newRecord.voltage220vCompatible,
        is_recommended: newRecord.isRecommended,
        buyer_comment: newRecord.buyerComment || null,
        is_approved: true,
      });

      return newRecord;
    } catch (e) {
      console.warn("Supabase submitUgcVerification error:", e);
      return newRecord;
    }
  },

  async getUgcVerifications(productId?: string, onlyApproved = false): Promise<UgcVerificationRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return [];

    try {
      let query = client.from("ugc_verifications").select("*").order("created_at", { ascending: false });
      if (productId) {
        const { data: prod } = await client
          .from("products")
          .select("id")
          .or(`id.eq.${productId},ali_id.eq.${productId},ali_product_id.eq.${productId}`)
          .maybeSingle();
        const targetId = prod?.id || productId;
        query = query.eq("product_id", targetId);
      }
      if (onlyApproved) {
        query = query.eq("is_approved", true);
      }
      const { data, error } = await query;
      if (error || !data) return [];

      return data.map((r: any) => ({
        id: r.id,
        productId: r.product_id,
        isEuPlug: Boolean(r.is_eu_plug),
        deliveryDays: Number(r.delivery_days) || 11,
        voltage220vCompatible: Boolean(r.voltage220v_compatible),
        isRecommended: Boolean(r.is_recommended),
        buyerComment: r.buyer_comment || undefined,
        isApproved: Boolean(r.is_approved),
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  async approveUgcVerification(id: string, isApproved = true): Promise<boolean> {
    const client = getSupabaseServerClient();
    if (!client) return true;
    try {
      await client.from("ugc_verifications").update({ is_approved: isApproved }).eq("id", id);
      return true;
    } catch {
      return false;
    }
  },

  async deleteUgcVerification(id: string): Promise<boolean> {
    const client = getSupabaseServerClient();
    if (!client) return true;
    try {
      await client.from("ugc_verifications").delete().eq("id", id);
      return true;
    } catch {
      return false;
    }
  },

  async getUgcSummary(productId: string, archetypeParam?: string): Promise<UgcSummary> {
    let archetype = archetypeParam;
    if (!archetype) {
      try {
        const prod = await this.getProductById(productId);
        archetype = prod?.archetype;
      } catch {}
    }

    const isElec = archetype === "ELECTRONICS";
    const isFashion = archetype === "FASHION";

    const defaultSummary: UgcSummary = {
      euPlugPercent: isElec ? 98 : null,
      avgDeliveryDays: 11,
      voltage220vPercent: isElec ? 100 : null,
      recommendedPercent: 96,
      totalVotes: 14,
      sizeAccuracyPercent: isFashion ? 94 : null,
      fabricQualityPercent: isFashion ? 96 : null,
    };

    try {
      const verifications = await this.getUgcVerifications(productId, true);
      if (!verifications || verifications.length === 0) {
        return defaultSummary;
      }

      const total = verifications.length;
      const euPlugVotes = verifications.filter((v) => v.isEuPlug !== null && v.isEuPlug !== undefined);
      const euPlugCount = euPlugVotes.filter((v) => v.isEuPlug).length;

      const v220Votes = verifications.filter((v) => v.voltage220vCompatible !== null && v.voltage220vCompatible !== undefined);
      const v220Count = v220Votes.filter((v) => v.voltage220vCompatible).length;

      const sizeVotes = verifications.filter((v) => v.sizeAccuracy !== null && v.sizeAccuracy !== undefined);
      const totalSizeAcc = sizeVotes.reduce((sum, v) => sum + (v.sizeAccuracy || 95), 0);

      const fabricVotes = verifications.filter((v) => v.fabricQuality !== null && v.fabricQuality !== undefined);
      const totalFabricQual = fabricVotes.reduce((sum, v) => sum + (v.fabricQuality || 95), 0);

      const recommendedCount = verifications.filter((v) => v.isRecommended).length;
      const totalDays = verifications.reduce((sum, v) => sum + (v.deliveryDays || 11), 0);

      return {
        euPlugPercent: isElec
          ? (euPlugVotes.length > 0 ? Math.round((euPlugCount / euPlugVotes.length) * 100) : 98)
          : null,
        avgDeliveryDays: Math.round(totalDays / total) || 11,
        voltage220vPercent: isElec
          ? (v220Votes.length > 0 ? Math.round((v220Count / v220Votes.length) * 100) : 100)
          : null,
        recommendedPercent: Math.round((recommendedCount / total) * 100),
        totalVotes: total,
        sizeAccuracyPercent: isFashion
          ? (sizeVotes.length > 0 ? Math.round(totalSizeAcc / sizeVotes.length) : 94)
          : null,
        fabricQualityPercent: isFashion
          ? (fabricVotes.length > 0 ? Math.round(totalFabricQual / fabricVotes.length) : 96)
          : null,
      };
    } catch {
      return defaultSummary;
    }
  },

  // ==========================================
  // PRODUCT CROSS SELLS
  // ==========================================
  async getCrossSells(parentProductId: string): Promise<CrossSellRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return [];

    try {
      const { data, error } = await client
        .from("product_cross_sells")
        .select("*")
        .eq("parent_product_id", parentProductId)
        .order("display_order", { ascending: true });

      if (error || !data) return [];
      return data.map((r: any) => ({
        id: r.id,
        parentProductId: r.parent_product_id,
        relatedProductId: r.related_product_id,
        recommendationReason: r.recommendation_reason || undefined,
        displayOrder: Number(r.display_order) || 1,
        createdAt: r.created_at,
      }));
    } catch {
      return [];
    }
  },

  // ==========================================
  // 301 REDIRECTS (100% CLOUD SUPABASE)
  // ==========================================
  async getRedirects(): Promise<RedirectRecord[]> {
    const local = jsonDb.getRedirects();
    const client = getSupabaseServerClient();
    if (!client) return local;

    try {
      // 1. Try dedicated redirects table
      const { data, error } = await client
        .from("redirects")
        .select("*")
        .order("created_at", { ascending: false });

      if (data && !error && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          sourcePath: r.source_path,
          targetPath: r.target_path,
          statusCode: Number(r.status_code) || 301,
          createdAt: r.created_at,
        }));
      }

      // 2. Try from sites table settings JSONB
      const { data: site } = await client
        .from("sites")
        .select("settings")
        .eq("id", "alideals")
        .maybeSingle();

      if (site?.settings?.redirects && Array.isArray(site.settings.redirects)) {
        return site.settings.redirects;
      }

      return local;
    } catch {
      return local;
    }
  },

  async getRedirectBySource(sourcePath: string): Promise<RedirectRecord | undefined> {
    const cleanPath = sourcePath.toLowerCase().replace(/\/+$/, "");
    const client = getSupabaseServerClient();

    if (client) {
      try {
        const { data, error } = await client
          .from("redirects")
          .select("*")
          .eq("source_path", cleanPath)
          .maybeSingle();

        if (data && !error) {
          return {
            id: data.id,
            sourcePath: data.source_path,
            targetPath: data.target_path,
            statusCode: Number(data.status_code) || 301,
            createdAt: data.created_at,
          };
        }

        const { data: site } = await client
          .from("sites")
          .select("settings")
          .eq("id", "alideals")
          .maybeSingle();

        if (site?.settings?.redirects && Array.isArray(site.settings.redirects)) {
          const match = site.settings.redirects.find((r: any) => r.sourcePath?.toLowerCase().replace(/\/+$/, "") === cleanPath);
          if (match) return match;
        }
      } catch {}
    }

    return jsonDb.getRedirectBySource(sourcePath);
  },

  async upsertRedirect(record: RedirectRecord): Promise<void> {
    jsonDb.upsertRedirect(record);

    const client = getSupabaseServerClient();
    if (!client) return;

    const cleanSource = record.sourcePath.toLowerCase().replace(/\/+$/, "");

    try {
      // 1. Try dedicated redirects table
      const res = await client.from("redirects").upsert({
        id: record.id || `redir_${Date.now()}`,
        site_id: "alideals",
        source_path: cleanSource,
        target_path: record.targetPath,
        status_code: record.statusCode || 301,
        created_at: record.createdAt || new Date().toISOString(),
      }, { onConflict: "site_id,source_path" });

      if (res.error) {
        throw res.error;
      }
    } catch {
      // 2. Fallback: Save inside sites settings JSONB (100% cloud persistent)
      try {
        const { data: site } = await client.from("sites").select("settings").eq("id", "alideals").maybeSingle();
        const settings = site?.settings || {};
        const redirs = Array.isArray(settings.redirects) ? [...settings.redirects] : [];
        const idx = redirs.findIndex((r: any) => r.sourcePath?.toLowerCase().replace(/\/+$/, "") === cleanSource);
        if (idx >= 0) {
          redirs[idx] = { ...redirs[idx], ...record, sourcePath: cleanSource };
        } else {
          redirs.unshift({ ...record, sourcePath: cleanSource });
        }
        await client.from("sites").upsert({
          id: "alideals",
          domain: "ali-deals.co.il",
          name: "AliDeals ישראל",
          settings: { ...settings, redirects: redirs },
        }, { onConflict: "id" });
      } catch (err) {
        console.warn("Supabase upsertRedirect cloud error:", err);
      }
    }
  },

  async deleteRedirect(idOrSource: string): Promise<void> {
    const clean = String(idOrSource || "").trim().toLowerCase();
    jsonDb.deleteRedirect(clean);

    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      await client.from("redirects").delete().eq("id", clean);
      await client.from("redirects").delete().eq("source_path", clean);

      // Also clean from sites settings JSONB
      const { data: site } = await client.from("sites").select("settings").eq("id", "alideals").maybeSingle();
      if (site?.settings?.redirects && Array.isArray(site.settings.redirects)) {
        const filtered = site.settings.redirects.filter(
          (r: any) => r.id !== clean && r.sourcePath?.toLowerCase() !== clean
        );
        await client.from("sites").update({ settings: { ...site.settings, redirects: filtered } }).eq("id", "alideals");
      }
    } catch {}
  },

  // ==========================================
  // DYNAMIC NAVIGATION MENU (100% CLOUD SUPABASE)
  // ==========================================
  async getNavigationMenu(): Promise<NavigationItemRecord[]> {
    const local = jsonDb.getNavigationMenu();
    const client = getSupabaseServerClient();
    if (!client) return local;

    try {
      // 1. Check dedicated navigation_menus table
      const { data: menuData, error: menuErr } = await client
        .from("navigation_menus")
        .select("items")
        .eq("id", "main_menu")
        .maybeSingle();

      if (!menuErr && menuData && Array.isArray(menuData.items)) {
        return menuData.items;
      }

      // 2. Check sites settings JSONB
      const { data: siteData } = await client
        .from("sites")
        .select("settings")
        .eq("id", "alideals")
        .maybeSingle();

      if (siteData?.settings?.navigation_menu && Array.isArray(siteData.settings.navigation_menu)) {
        return siteData.settings.navigation_menu;
      }

      // 3. Check site_settings table
      const { data: settingsData } = await client
        .from("site_settings")
        .select("*")
        .eq("id", "singleton")
        .maybeSingle();

      if (settingsData?.navigation_menu && Array.isArray(settingsData.navigation_menu)) {
        return settingsData.navigation_menu;
      }

      return local;
    } catch {
      return local;
    }
  },

  async saveNavigationMenu(menu: NavigationItemRecord[]): Promise<void> {
    jsonDb.saveNavigationMenu(menu);

    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      const now = new Date().toISOString();

      // 1. Save to dedicated navigation_menus table
      try {
        await client.from("navigation_menus").upsert({
          id: "main_menu",
          site_id: "alideals",
          items: menu,
          updated_at: now,
        }, { onConflict: "id" });
      } catch (err) {
        console.warn("Navigation table upsert notice:", err);
      }

      // 2. Save to sites settings JSONB (guaranteed cloud fallback)
      try {
        const { data: site } = await client.from("sites").select("settings").eq("id", "alideals").maybeSingle();
        const currentSettings = site?.settings || {};
        await client.from("sites").upsert({
          id: "alideals",
          domain: "ali-deals.co.il",
          name: "AliDeals ישראל",
          settings: { ...currentSettings, navigation_menu: menu },
        }, { onConflict: "id" });
      } catch {}
    } catch (e) {
      console.warn("Supabase saveNavigationMenu cloud error:", e);
    }
  },

  // ==========================================
  // AFFILIATE ORDERS & LIVE INGESTION
  // ==========================================
  async saveAffiliateOrders(orders: AffiliateOrder[]): Promise<{ savedOrders: number; savedItems: number; newItems: AffiliateOrderItem[] }> {
    if (!orders || !orders.length) return { savedOrders: 0, savedItems: 0, newItems: [] };

    // 1. Immediately persist into JSON DB (guaranteed local/ephemeral persistence)
    try {
      jsonDb.saveAffiliateOrders(orders);
    } catch (e) {
      console.warn("jsonDb.saveAffiliateOrders notice:", e);
    }

    const client = getSupabaseServerClient();
    if (!client) {
      const allItems = jsonDb.getAffiliateOrderItems();
      return { savedOrders: orders.length, savedItems: allItems.length, newItems: [] };
    }

    let savedOrders = 0;
    let savedItems = 0;
    const newItems: AffiliateOrderItem[] = [];

    // Helper for safe ISO date parsing
    const safeIso = (input?: any): string => {
      if (!input) return new Date().toISOString();
      if (typeof input === "string") {
        const clean = input.trim();
        if (!clean) return new Date().toISOString();
        const normalized = clean.includes(" ") && !clean.includes("T") ? clean.replace(" ", "T") : clean;
        const d = new Date(normalized);
        if (!isNaN(d.getTime())) return d.toISOString();
        const d2 = new Date(clean);
        if (!isNaN(d2.getTime())) return d2.toISOString();
      } else if (input instanceof Date && !isNaN(input.getTime())) {
        return input.toISOString();
      } else if (typeof input === "number") {
        const d = new Date(input);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      return new Date().toISOString();
    };

    // Also persist entire orders array into sites.settings.affiliate_orders as cloud JSONB backup
    try {
      const { data: site } = await client.from("sites").select("settings").eq("id", "alideals").maybeSingle();
      const currentSettings = site?.settings || {};
      const existingBackup: AffiliateOrder[] = Array.isArray(currentSettings.affiliate_orders) ? currentSettings.affiliate_orders : [];
      const backupMap = new Map<string, AffiliateOrder>();
      for (const o of existingBackup) if (o.orderNumber) backupMap.set(o.orderNumber, o);
      for (const o of orders) if (o.orderNumber) backupMap.set(o.orderNumber, o);
      await client.from("sites").upsert({
        id: "alideals",
        domain: "ali-deals.co.il",
        name: "AliDeals ישראל",
        settings: { ...currentSettings, affiliate_orders: Array.from(backupMap.values()) },
      }, { onConflict: "id" });
    } catch (e) {
      console.warn("affiliate_orders cloud JSONB backup notice:", e);
    }

    for (const ord of orders) {
      if (!ord.orderNumber) continue;
      try {
        const orderTimeIso = safeIso(ord.orderTime);
        const { data: orderData, error: orderErr } = await client
          .from("affiliate_orders")
          .upsert({
            order_number: ord.orderNumber,
            order_status: ord.orderStatus || "Payment Completed",
            paid_amount_usd: ord.paidAmountUsd || 0,
            commission_amount_usd: ord.commissionAmountUsd || 0,
            sub_id: ord.subId || null,
            order_time: orderTimeIso,
            raw_api_payload: ord.rawApiPayload || {},
            updated_at: new Date().toISOString(),
          }, { onConflict: "order_number" })
          .select("id")
          .maybeSingle();

        if (orderErr) {
          console.warn("Supabase upsert affiliate_order notice:", orderErr.message);
        }

        const orderId = orderData?.id;
        savedOrders++;

        for (const it of ord.items || []) {
          if (!it.productId) continue;
          try {
            const { data: existingItem } = await client
              .from("affiliate_order_items")
              .select("id, article_generation_status, generated_page_id")
              .eq("order_number", ord.orderNumber)
              .eq("product_id", it.productId)
              .maybeSingle();

            if (!existingItem) {
              const { data: insertedItem, error: itemErr } = await client
                .from("affiliate_order_items")
                .insert({
                  order_id: orderId || null,
                  order_number: ord.orderNumber,
                  product_id: it.productId,
                  product_title: it.productTitle,
                  product_image_url: it.productImageUrl,
                  product_count: it.productCount || 1,
                  sale_price_usd: it.salePriceUsd || 0,
                  commission_rate: it.commissionRate || 0,
                  commission_usd: it.commissionUsd || 0,
                  product_ref_id: it.productRefId || null,
                  article_generation_status: it.articleGenerationStatus || "pending",
                })
                .select("*")
                .maybeSingle();

              if (!itemErr && insertedItem) {
                savedItems++;
                newItems.push({
                  ...it,
                  id: insertedItem.id,
                  articleGenerationStatus: insertedItem.article_generation_status,
                });
              } else {
                savedItems++;
              }
            } else {
              savedItems++;
            }
          } catch (itemErr) {
            console.warn("Supabase insert affiliate_order_item notice:", itemErr);
          }
        }
      } catch (e) {
        console.warn("Error saving affiliate order:", ord.orderNumber, e);
      }
    }

    return { savedOrders, savedItems, newItems };
  },

  async getAffiliateOrders(limit: number = 100): Promise<AffiliateOrder[]> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getAffiliateOrders();

    try {
      // 1. Fetch orders table
      const { data: ordersData, error: ordersErr } = await client
        .from("affiliate_orders")
        .select("*")
        .order("order_time", { ascending: false })
        .limit(limit);

      if (ordersErr || !ordersData || ordersData.length === 0) {
        // Fallback: check sites.settings.affiliate_orders JSONB or jsonDb
        try {
          const { data: site } = await client.from("sites").select("settings").eq("id", "alideals").maybeSingle();
          if (Array.isArray(site?.settings?.affiliate_orders) && site.settings.affiliate_orders.length > 0) {
            return site.settings.affiliate_orders.map((o: any) => {
              let p = Number(o.paidAmountUsd) || 0;
              let c = Number(o.commissionAmountUsd) || 0;
              if (o.rawApiPayload?.paid_amount && Number(o.rawApiPayload.paid_amount) === p && p > 0) {
                p = Math.round((p / 100) * 100) / 100;
              }
              if (o.rawApiPayload?.estimated_paid_commission && Number(o.rawApiPayload.estimated_paid_commission) === c && c > 0) {
                c = Math.round((c / 100) * 100) / 100;
              }
              return {
                ...o,
                paidAmountUsd: p,
                commissionAmountUsd: c,
                items: (o.items || []).map((it: any) => {
                  let ip = Number(it.salePriceUsd) || 0;
                  let ic = Number(it.commissionUsd) || 0;
                  if (o.rawApiPayload?.paid_amount && Number(o.rawApiPayload.paid_amount) === ip && ip > 0) {
                    ip = Math.round((ip / 100) * 100) / 100;
                  }
                  if (o.rawApiPayload?.estimated_paid_commission && Number(o.rawApiPayload.estimated_paid_commission) === ic && ic > 0) {
                    ic = Math.round((ic / 100) * 100) / 100;
                  }
                  return {
                    ...it,
                    salePriceUsd: ip,
                    commissionUsd: ic,
                  };
                }),
              };
            });
          }
        } catch {}
        return jsonDb.getAffiliateOrders();
      }

      // 2. Fetch items decoupled to avoid missing PostgREST foreign key relationship errors (PGRST200)
      const orderNumbers = ordersData.map((o: any) => o.order_number).filter(Boolean);
      let itemsMap: Record<string, any[]> = {};
      if (orderNumbers.length > 0) {
        const { data: itemsData, error: itemsErr } = await client
          .from("affiliate_order_items")
          .select("*")
          .in("order_number", orderNumbers);

        if (!itemsErr && itemsData) {
          for (const it of itemsData) {
            if (!itemsMap[it.order_number]) itemsMap[it.order_number] = [];
            itemsMap[it.order_number].push(it);
          }
        }
      }

      // 3. Fallback merge with jsonDb items if relational table had none
      const jsonDbOrders = jsonDb.getAffiliateOrders();
      const jsonDbMap = new Map<string, AffiliateOrder>();
      for (const j of jsonDbOrders) {
        if (j.orderNumber) jsonDbMap.set(j.orderNumber, j);
      }

      return ordersData.map((row: any) => {
        let rawItems = itemsMap[row.order_number] || [];
        if (rawItems.length === 0 && jsonDbMap.has(row.order_number)) {
          const jOrder = jsonDbMap.get(row.order_number);
          rawItems = (jOrder?.items || []).map((it) => ({
            id: it.id,
            order_number: it.orderNumber,
            product_id: it.productId,
            product_title: it.productTitle,
            product_image_url: it.productImageUrl,
            product_count: it.productCount,
            sale_price_usd: it.salePriceUsd,
            commission_rate: it.commissionRate,
            commission_usd: it.commissionUsd,
            product_ref_id: it.productRefId,
            article_generation_status: it.articleGenerationStatus,
            generated_page_id: it.generatedPageId,
            created_at: it.createdAt,
          }));
        }

        let paidUsd = Number(row.paid_amount_usd) || 0;
        let commUsd = Number(row.commission_amount_usd) || 0;
        if (row.raw_api_payload?.paid_amount && Number(row.raw_api_payload.paid_amount) === paidUsd && paidUsd > 0) {
          paidUsd = Math.round((paidUsd / 100) * 100) / 100;
        }
        if (row.raw_api_payload?.estimated_paid_commission && Number(row.raw_api_payload.estimated_paid_commission) === commUsd && commUsd > 0) {
          commUsd = Math.round((commUsd / 100) * 100) / 100;
        }

        return {
          id: row.id,
          orderNumber: row.order_number,
          orderStatus: row.order_status,
          paidAmountUsd: paidUsd,
          commissionAmountUsd: commUsd,
          subId: row.sub_id || undefined,
          orderTime: row.order_time,
          rawApiPayload: row.raw_api_payload,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          items: rawItems.map((it: any) => {
            let itemPrice = Number(it.sale_price_usd) || 0;
            let itemComm = Number(it.commission_usd) || 0;
            if (row.raw_api_payload?.paid_amount && Number(row.raw_api_payload.paid_amount) === itemPrice && itemPrice > 0) {
              itemPrice = Math.round((itemPrice / 100) * 100) / 100;
            }
            if (row.raw_api_payload?.estimated_paid_commission && Number(row.raw_api_payload.estimated_paid_commission) === itemComm && itemComm > 0) {
              itemComm = Math.round((itemComm / 100) * 100) / 100;
            }
            return {
              id: it.id,
              orderNumber: it.order_number || row.order_number,
              productId: it.product_id,
              productTitle: it.product_title,
              productImageUrl: it.product_image_url,
              productCount: Number(it.product_count) || 1,
              salePriceUsd: itemPrice,
              commissionRate: Number(it.commission_rate) || 0,
              commissionUsd: itemComm,
              productRefId: it.product_ref_id || undefined,
              articleGenerationStatus: it.article_generation_status,
              generatedPageId: it.generated_page_id || undefined,
              createdAt: it.created_at,
            };
          }),
        };
      });
    } catch (err) {
      console.warn("getAffiliateOrders exception, falling back to jsonDb:", err);
      return jsonDb.getAffiliateOrders();
    }
  },

  async getAffiliateOrderItems(options?: { status?: string; limit?: number }): Promise<AffiliateOrderItem[]> {
    const client = getSupabaseServerClient();
    if (!client) {
      let items = jsonDb.getAffiliateOrderItems();
      if (options?.status) items = items.filter((i) => i.articleGenerationStatus === options.status);
      if (options?.limit) items = items.slice(0, options.limit);
      return items;
    }

    try {
      let query = client
        .from("affiliate_order_items")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(options?.limit || 100);

      if (options?.status) {
        query = query.eq("article_generation_status", options.status);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        let items = jsonDb.getAffiliateOrderItems();
        if (options?.status) items = items.filter((i) => i.articleGenerationStatus === options.status);
        if (options?.limit) items = items.slice(0, options.limit);
        return items;
      }

      return data.map((it: any) => ({
        id: it.id,
        orderNumber: it.order_number,
        productId: it.product_id,
        productTitle: it.product_title,
        productImageUrl: it.product_image_url,
        productCount: Number(it.product_count) || 1,
        salePriceUsd: Number(it.sale_price_usd) || 0,
        commissionRate: Number(it.commission_rate) || 0,
        commissionUsd: Number(it.commission_usd) || 0,
        productRefId: it.product_ref_id || undefined,
        articleGenerationStatus: it.article_generation_status,
        generatedPageId: it.generated_page_id || undefined,
        createdAt: it.created_at,
      }));
    } catch {
      let items = jsonDb.getAffiliateOrderItems();
      if (options?.status) items = items.filter((i) => i.articleGenerationStatus === options.status);
      if (options?.limit) items = items.slice(0, options.limit);
      return items;
    }
  },

  async updateOrderItemStatus(
    itemIdOrOrderNumber: string,
    status: "already_exists" | "pending" | "generating" | "completed" | "failed" | "dismissed",
    generatedPageId?: string,
    productRefId?: string,
    productId?: string
  ): Promise<void> {
    if (!itemIdOrOrderNumber) return;

    // 1. Sync to jsonDb
    try {
      jsonDb.updateOrderItemStatus(itemIdOrOrderNumber, productId, status, generatedPageId, productRefId);
    } catch (e) {
      console.warn("jsonDb.updateOrderItemStatus notice:", e);
    }

    const client = getSupabaseServerClient();
    if (!client) return;

    try {
      const updateData: any = {
        article_generation_status: status,
      };
      if (generatedPageId) updateData.generated_page_id = generatedPageId;
      if (productRefId) updateData.product_ref_id = productRefId;

      // Try by id first
      const { data: byId } = await client
        .from("affiliate_order_items")
        .update(updateData)
        .eq("id", itemIdOrOrderNumber)
        .select("id");

      if (!byId || byId.length === 0) {
        // Try by order_number and optional product_id
        let q = client.from("affiliate_order_items").update(updateData).eq("order_number", itemIdOrOrderNumber);
        if (productId) q = q.eq("product_id", productId);
        await q;
      }
    } catch (e) {
      console.warn("updateOrderItemStatus error:", e);
    }
  },

  // ==========================================
  // DISMISSED ORDERS & PREVENTION
  // ==========================================
  async getDismissedOrders(): Promise<DismissedOrderRecord[]> {
    const local = jsonDb.getDismissedOrders();
    const client = getSupabaseServerClient();
    if (!client) return local;

    try {
      const { data: site } = await client
        .from("sites")
        .select("settings")
        .eq("id", "alideals")
        .maybeSingle();

      const cloud: DismissedOrderRecord[] = Array.isArray(site?.settings?.dismissed_orders)
        ? site.settings.dismissed_orders
        : [];

      // Merge local and cloud dismissed records
      const combined = [...local];
      for (const c of cloud) {
        const exists = combined.some(
          (x) =>
            (c.orderNumber && x.orderNumber === c.orderNumber) ||
            (c.productId && x.productId === c.productId) ||
            (c.slug && x.slug === c.slug)
        );
        if (!exists) combined.push(c);
      }
      return combined;
    } catch (e) {
      console.warn("getDismissedOrders notice:", e);
      return local;
    }
  },

  async dismissOrder(data: { orderNumber?: string; productId?: string; slug?: string; reason?: string }): Promise<void> {
    const cleanOrder = String(data.orderNumber || "").trim();
    const cleanProd = String(data.productId || "").trim();
    const cleanSlug = String(data.slug || "").trim();

    // 1. Save to JSON DB
    try {
      jsonDb.dismissOrder({
        orderNumber: cleanOrder || undefined,
        productId: cleanProd || undefined,
        slug: cleanSlug || undefined,
        reason: data.reason,
      });
    } catch (e) {
      console.warn("jsonDb.dismissOrder notice:", e);
    }

    // 2. Mark order item status in Supabase if orderNumber or productId provided
    const client = getSupabaseServerClient();
    if (client) {
      try {
        if (cleanOrder || cleanProd) {
          let q = client
            .from("affiliate_order_items")
            .update({ article_generation_status: "dismissed" });
          if (cleanOrder && cleanProd) {
            q = q.eq("order_number", cleanOrder).eq("product_id", cleanProd);
          } else if (cleanOrder) {
            q = q.eq("order_number", cleanOrder);
          } else if (cleanProd) {
            q = q.eq("product_id", cleanProd);
          }
          await q;
        }

        // 3. Persist into sites.settings.dismissed_orders in Supabase
        const { data: site } = await client
          .from("sites")
          .select("settings")
          .eq("id", "alideals")
          .maybeSingle();

        const currentSettings = site?.settings || {};
        const existingDismissed: DismissedOrderRecord[] = Array.isArray(currentSettings.dismissed_orders)
          ? currentSettings.dismissed_orders
          : [];

        const alreadyInCloud = existingDismissed.some(
          (d) =>
            (cleanOrder && d.orderNumber === cleanOrder) ||
            (cleanProd && d.productId === cleanProd) ||
            (cleanSlug && d.slug === cleanSlug)
        );

        if (!alreadyInCloud && (cleanOrder || cleanProd || cleanSlug)) {
          existingDismissed.push({
            orderNumber: cleanOrder || undefined,
            productId: cleanProd || undefined,
            slug: cleanSlug || undefined,
            dismissedAt: new Date().toISOString(),
            reason: data.reason || "dismissed_by_user",
          });

          await client.from("sites").upsert({
            id: "alideals",
            domain: "ali-deals.co.il",
            name: "AliDeals ישראל",
            settings: { ...currentSettings, dismissed_orders: existingDismissed },
          }, { onConflict: "id" });
        }
      } catch (e) {
        console.warn("cloud dismissOrder notice:", e);
      }
    }
  },

  async isOrderOrProductDismissed(orderNumber?: string, productId?: string, slug?: string): Promise<boolean> {
    const cleanOrder = String(orderNumber || "").trim();
    const cleanProd = String(productId || "").trim();
    const cleanSlug = String(slug || "").trim();

    if (!cleanOrder && !cleanProd && !cleanSlug) return false;

    // Check fast local JSON first
    if (jsonDb.isOrderOrProductDismissed(cleanOrder, cleanProd, cleanSlug)) {
      return true;
    }

    // Check Supabase
    try {
      const client = getSupabaseServerClient();
      if (!client) return false;

      const { data: site } = await client
        .from("sites")
        .select("settings")
        .eq("id", "alideals")
        .maybeSingle();

      const cloud: DismissedOrderRecord[] = Array.isArray(site?.settings?.dismissed_orders)
        ? site.settings.dismissed_orders
        : [];

      return cloud.some(
        (d) =>
          (cleanOrder && d.orderNumber === cleanOrder) ||
          (cleanProd && d.productId === cleanProd) ||
          (cleanSlug && d.slug === cleanSlug)
      );
    } catch {
      return false;
    }
  },

  // ==========================================
  // DYNAMIC CODE SNIPPETS & AUDIT TRAIL
  // ==========================================
  async getCodeSnippets(options?: { activeOnly?: boolean }): Promise<CustomCodeSnippet[]> {
    const now = Date.now();
    const cacheKey = options?.activeOnly ? "_activeCodeSnippetsCache" : "_allCodeSnippetsCache";
    const cached = (globalThis as any)[cacheKey] as { data: CustomCodeSnippet[]; time: number } | undefined;
    if (cached && now - cached.time < 30_000) {
      return cached.data;
    }

    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getCodeSnippets(options);

    try {
      let query = client
        .from("custom_code_snippets")
        .select("*")
        .order("created_at", { ascending: true });

      if (options?.activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error || !data || data.length === 0) {
        try {
          const { data: site } = await client
            .from("sites")
            .select("settings")
            .eq("id", "alideals")
            .maybeSingle();

          const cloudList: CustomCodeSnippet[] = Array.isArray(site?.settings?.code_snippets)
            ? site.settings.code_snippets
            : [];
          if (cloudList.length > 0) {
            const res = options?.activeOnly ? cloudList.filter((s) => s.isActive) : cloudList;
            (globalThis as any)[cacheKey] = { data: res, time: now };
            return res;
          }
        } catch {}

        const local = jsonDb.getCodeSnippets(options);
        (globalThis as any)[cacheKey] = { data: local, time: now };
        return local;
      }

      const mapped: CustomCodeSnippet[] = data.map((row: any) => ({
        id: row.id,
        title: row.title,
        code: row.code,
        placement: row.placement || "head",
        category: row.category || "custom",
        targetPages: row.target_pages || "all",
        isActive: Boolean(row.is_active),
        notes: row.notes || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      (globalThis as any)[cacheKey] = { data: mapped, time: now };
      return mapped;
    } catch (e) {
      console.warn("getCodeSnippets error:", e);
      return jsonDb.getCodeSnippets(options);
    }
  },

  async getCodeSnippetById(id: string): Promise<CustomCodeSnippet | null> {
    const list = await this.getCodeSnippets();
    return list.find((s) => s.id === id) || null;
  },

  async upsertCodeSnippet(
    snippet: Partial<CustomCodeSnippet>,
    logDescription?: string,
    actor = "admin"
  ): Promise<CustomCodeSnippet> {
    (globalThis as any)._activeCodeSnippetsCache = undefined;
    (globalThis as any)._allCodeSnippetsCache = undefined;

    const id = snippet.id || `snip_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const existing = await this.getCodeSnippetById(id);
    const isNew = !existing;

    const fullSnippet: CustomCodeSnippet = {
      id,
      title: snippet.title ? String(snippet.title).trim() : (existing?.title || "קוד חדש"),
      code: snippet.code !== undefined ? String(snippet.code) : (existing?.code || ""),
      placement: snippet.placement || existing?.placement || "head",
      category: snippet.category || existing?.category || "custom",
      targetPages: snippet.targetPages || existing?.targetPages || "all",
      isActive: snippet.isActive !== undefined ? Boolean(snippet.isActive) : (existing ? existing.isActive : true),
      notes: snippet.notes !== undefined ? snippet.notes : existing?.notes,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    // 1. Local JSON DB
    try {
      jsonDb.upsertCodeSnippet(fullSnippet);
    } catch (e) {
      console.warn("jsonDb.upsertCodeSnippet notice:", e);
    }

    // 2. Audit Log Record
    const action: "created" | "updated" = isNew ? "created" : "updated";
    const desc = logDescription || (isNew ? `נוצר מקטע קוד חדש: "${fullSnippet.title}"` : `עודכן מקטע קוד: "${fullSnippet.title}"`);
    let diffSummary = "";
    if (!isNew && existing) {
      const changes: string[] = [];
      if (existing.title !== fullSnippet.title) changes.push(`כותרת שונתה`);
      if (existing.placement !== fullSnippet.placement) changes.push(`מיקום: ${fullSnippet.placement}`);
      if (existing.isActive !== fullSnippet.isActive) changes.push(fullSnippet.isActive ? "הופעל" : "הושבת");
      if (existing.code !== fullSnippet.code) changes.push(`הקוד עודכן (${fullSnippet.code.length} תווים)`);
      diffSummary = changes.join(", ");
    } else {
      diffSummary = `מיקום: ${fullSnippet.placement}, ${fullSnippet.code.length} תווים`;
    }

    const logEntry: CodeSnippetLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      snippetId: fullSnippet.id,
      snippetTitle: fullSnippet.title,
      action,
      description: desc,
      diffSummary,
      timestamp: now,
      actor,
    };

    try {
      jsonDb.addCodeSnippetLog(logEntry);
    } catch {}

    const client = getSupabaseServerClient();
    if (!client) return fullSnippet;

    // 3. Supabase custom_code_snippets table
    try {
      await client.from("custom_code_snippets").upsert({
        id: fullSnippet.id,
        title: fullSnippet.title,
        code: fullSnippet.code,
        placement: fullSnippet.placement,
        category: fullSnippet.category,
        target_pages: fullSnippet.targetPages,
        is_active: fullSnippet.isActive,
        notes: fullSnippet.notes || null,
        created_at: fullSnippet.createdAt,
        updated_at: fullSnippet.updatedAt,
      }, { onConflict: "id" });

      // 4. Supabase custom_code_logs table
      await client.from("custom_code_logs").insert({
        id: logEntry.id,
        snippet_id: logEntry.snippetId,
        snippet_title: logEntry.snippetTitle,
        action: logEntry.action,
        description: logEntry.description,
        diff_summary: logEntry.diffSummary,
        actor: logEntry.actor || "admin",
        timestamp: logEntry.timestamp,
      });

      // 5. Cloud JSONB backup in sites table
      try {
        const { data: site } = await client.from("sites").select("settings").eq("id", "alideals").maybeSingle();
        const settings = site?.settings || {};
        const existingSnippets: CustomCodeSnippet[] = Array.isArray(settings.code_snippets) ? [...settings.code_snippets] : [];
        const sIdx = existingSnippets.findIndex((s) => s.id === fullSnippet.id);
        if (sIdx >= 0) existingSnippets[sIdx] = fullSnippet;
        else existingSnippets.unshift(fullSnippet);

        const existingLogs: CodeSnippetLogRecord[] = Array.isArray(settings.code_snippet_logs) ? [...settings.code_snippet_logs] : [];
        existingLogs.unshift(logEntry);

        await client.from("sites").upsert({
          id: "alideals",
          domain: "ali-deals.co.il",
          name: "AliDeals ישראל",
          settings: {
            ...settings,
            code_snippets: existingSnippets,
            code_snippet_logs: existingLogs.slice(0, 300),
          },
        }, { onConflict: "id" });
      } catch (backupErr) {
        console.warn("Cloud JSONB backup notice:", backupErr);
      }
    } catch (e) {
      console.warn("Supabase upsertCodeSnippet error:", e);
    }

    return fullSnippet;
  },

  async toggleCodeSnippet(id: string, isActive: boolean, actor = "admin"): Promise<boolean> {
    (globalThis as any)._activeCodeSnippetsCache = undefined;
    (globalThis as any)._allCodeSnippetsCache = undefined;

    const snippet = await this.getCodeSnippetById(id);
    if (!snippet) return false;

    return (await this.upsertCodeSnippet(
      { ...snippet, isActive },
      isActive ? `הקוד "${snippet.title}" הופעל` : `הקוד "${snippet.title}" הושבת`,
      actor
    )) !== null;
  },

  async deleteCodeSnippet(id: string, actor = "admin"): Promise<boolean> {
    (globalThis as any)._activeCodeSnippetsCache = undefined;
    (globalThis as any)._allCodeSnippetsCache = undefined;

    const existing = await this.getCodeSnippetById(id);
    const title = existing?.title || id;

    // 1. Delete from local JSON DB
    try {
      jsonDb.deleteCodeSnippet(id);
    } catch {}

    // 2. Audit Log
    const now = new Date().toISOString();
    const logEntry: CodeSnippetLogRecord = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      snippetId: id,
      snippetTitle: title,
      action: "deleted",
      description: `מקטע הקוד "${title}" נמחק מהמערכת`,
      timestamp: now,
      actor,
    };

    try {
      jsonDb.addCodeSnippetLog(logEntry);
    } catch {}

    const client = getSupabaseServerClient();
    if (!client) return true;

    // 3. Delete from Supabase
    try {
      await client.from("custom_code_snippets").delete().eq("id", id);
      await client.from("custom_code_logs").insert({
        id: logEntry.id,
        snippet_id: logEntry.snippetId,
        snippet_title: logEntry.snippetTitle,
        action: logEntry.action,
        description: logEntry.description,
        diff_summary: logEntry.diffSummary,
        actor: logEntry.actor || "admin",
        timestamp: logEntry.timestamp,
      });

      // 4. Cloud JSONB backup update
      try {
        const { data: site } = await client.from("sites").select("settings").eq("id", "alideals").maybeSingle();
        const settings = site?.settings || {};
        const existingSnippets: CustomCodeSnippet[] = Array.isArray(settings.code_snippets) ? settings.code_snippets : [];
        const filtered = existingSnippets.filter((s) => s.id !== id);

        const existingLogs: CodeSnippetLogRecord[] = Array.isArray(settings.code_snippet_logs) ? [...settings.code_snippet_logs] : [];
        existingLogs.unshift(logEntry);

        await client.from("sites").upsert({
          id: "alideals",
          domain: "ali-deals.co.il",
          name: "AliDeals ישראל",
          settings: {
            ...settings,
            code_snippets: filtered,
            code_snippet_logs: existingLogs.slice(0, 300),
          },
        }, { onConflict: "id" });
      } catch {}
      return true;
    } catch (e) {
      console.warn("deleteCodeSnippet error:", e);
      return false;
    }
  },

  async getCodeSnippetLogs(limit = 100): Promise<CodeSnippetLogRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getCodeSnippetLogs(limit);

    try {
      const { data, error } = await client
        .from("custom_code_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        return data.map((r: any) => ({
          id: r.id,
          snippetId: r.snippet_id,
          snippetTitle: r.snippet_title,
          action: r.action,
          description: r.description,
          diffSummary: r.diff_summary || undefined,
          timestamp: r.timestamp,
          actor: r.actor || "admin",
        }));
      }

      try {
        const { data: site } = await client.from("sites").select("settings").eq("id", "alideals").maybeSingle();
        if (Array.isArray(site?.settings?.code_snippet_logs) && site.settings.code_snippet_logs.length > 0) {
          return site.settings.code_snippet_logs.slice(0, limit);
        }
      } catch {}

      return jsonDb.getCodeSnippetLogs(limit);
    } catch {
      return jsonDb.getCodeSnippetLogs(limit);
    }
  },
};

