import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
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
} from "./json-db";
import { analyticsDb } from "./analytics-db";
import {
  OutboundClickRecord,
  S2SConversionRecord,
  GscQueryRecord,
  Ga4PageStatRecord,
  SiteSettingsRecord,
} from "../analytics/types";
import { AgentLogEntry, OrchestratorMessage } from "../agent/types";

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
    tags: Array.isArray(row.tags) ? row.tags : [],
    productIds: typeof row.product_ids === "string" ? row.product_ids : JSON.stringify(row.product_ids || []),
    boughtTogetherIds: Array.isArray(row.bought_together_ids) ? row.bought_together_ids : (typeof row.bought_together_ids === "string" ? JSON.parse(row.bought_together_ids || "[]") : []),
    crossSellReason: row.cross_sell_reason || undefined,
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
    level: Number(row.level) || 0,
    sortOrder: Number(row.sort_order) || 0,
    isFeatured: Boolean(row.is_featured),
    tags: Array.isArray(row.tags) ? row.tags : [],
    aliCategoryId: row.ali_category_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const supabaseDb = {
  isConfigured(): boolean {
    return isSupabaseConfigured();
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
        .eq("ali_id", cleanAli)
        .maybeSingle();

      if (!data && !error) {
        const retry = await client
          .from("products")
          .select("*")
          .eq("id", `prod_${cleanAli}`)
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
        tags: Array.isArray(p.tags) ? p.tags : [],
        price_usd: Number(p.priceUsd) || 0,
        price_ils: Number(p.priceIls) || 0,
        original_price_usd: p.originalPriceUsd ? Number(p.originalPriceUsd) : null,
        discount_percent: Number(p.discountPercent) || 0,
        rating: Number(p.rating) || 4.8,
        orders_count: Number(p.ordersCount) || 100,
        store_name: p.storeName || null,
        seller_positive_rate: p.sellerPositiveRate || null,
        commission_rate: Number(p.commissionRate) || 7.0,
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

      // 3. Retry if a column is missing from Supabase products table (code 42703)
      if (res.error && res.error.code === "42703") {
        const colMatch = res.error.message.match(/column "([^"]+)" of relation "products" does not exist/);
        if (colMatch && colMatch[1]) {
          delete row[colMatch[1]];
          res = await client
            .from("products")
            .upsert(row, { onConflict: "ali_id" })
            .select()
            .maybeSingle();
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
    const clean = String(slug || "").trim();
    if (!clean) return null;

    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getPageBySlug(clean) || null;

    try {
      const { data, error } = await client
        .from("pages")
        .select("*")
        .eq("slug", clean)
        .maybeSingle();

      if (!error && data) {
        return mapPageFromSupabase(data);
      }

      // Fallback check review_pages
      try {
        const { data: revPage } = await client
          .from("review_pages")
          .select("*")
          .eq("slug", clean)
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

      return jsonDb.getPageBySlug(clean) || null;
    } catch {
      return jsonDb.getPageBySlug(clean) || null;
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

  async upsertPage(page: Partial<PageRecord>): Promise<PageRecord | null> {
    jsonDb.upsertPage(page as PageRecord);

    const client = getSupabaseServerClient();
    if (!client) return page as PageRecord;

    try {
      const now = new Date().toISOString();
      const cleanSlug = String(page.slug || "").trim();
      const cleanId = String(page.id || "").trim();

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
        title: page.title || "",
        meta_title: page.metaTitle || page.title || "",
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
      for (let attempt = 0; attempt < 6 && res?.error; attempt++) {
        const colMatch = res.error.message.match(/column "([^"]+)" of relation "pages" does not exist/i);
        if (colMatch && colMatch[1]) {
          console.warn(`Stripping missing column '${colMatch[1]}' from pages table and retrying...`);
          delete row[colMatch[1]];
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
            .insert(row)
            .select()
            .maybeSingle();
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
      }

      return res?.data ? mapPageFromSupabase(res.data) : (page as PageRecord);
    } catch (err: any) {
      console.error("Supabase upsertPage exception:", err);
      return page as PageRecord;
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

      const { data: pageById } = await client
        .from("pages")
        .select("id, slug")
        .eq("id", clean)
        .maybeSingle();

      if (pageById) {
        pageId = pageById.id;
        pageSlug = pageById.slug;
      } else {
        const { data: pageBySlug } = await client
          .from("pages")
          .select("id, slug")
          .eq("slug", clean)
          .maybeSingle();
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
      if (clean !== pageId && clean !== pageSlug) {
        await client.from("pages").delete().eq("id", clean);
        await client.from("pages").delete().eq("slug", clean);
      }

      // 4. Also delete from review_pages if exists
      try {
        await client.from("review_pages").delete().eq("slug", pageSlug || clean);
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
  async getSettings(): Promise<SiteSettingsRecord> {
    const client = getSupabaseServerClient();
    if (!client) return analyticsDb.getSettings();

    try {
      const { data, error } = await client
        .from("site_settings")
        .select("*")
        .eq("id", "singleton")
        .maybeSingle();

      if (error || !data) {
        return analyticsDb.getSettings();
      }

      if (data.gemini_api_key) {
        (globalThis as any)._cachedGeminiKey = data.gemini_api_key;
      }

      return {
        gaMeasurementId: data.ga_measurement_id || undefined,
        geminiApiKey: data.gemini_api_key || analyticsDb.getSettings().geminiApiKey,
        siteUrl: data.site_url || undefined,
        aliexpressAppKey: data.aliexpress_app_key || undefined,
        aliexpressAppSecret: data.aliexpress_app_secret || undefined,
        aliexpressDefaultTrackingId: data.aliexpress_default_tracking_id || "default",
        updatedAt: data.updated_at || new Date().toISOString(),
      };
    } catch {
      return analyticsDb.getSettings();
    }
  },

  async updateSettings(settings: Partial<SiteSettingsRecord>): Promise<SiteSettingsRecord> {
    const current = analyticsDb.updateSettings(settings);

    if (settings.geminiApiKey) {
      (globalThis as any)._cachedGeminiKey = settings.geminiApiKey;
    }

    const client = getSupabaseServerClient();
    if (!client) return current;

    try {
      const row = {
        id: "singleton",
        ga_measurement_id: current.gaMeasurementId,
        gemini_api_key: current.geminiApiKey,
        site_url: current.siteUrl,
        aliexpress_app_key: current.aliexpressAppKey,
        aliexpress_app_secret: current.aliexpressAppSecret,
        aliexpress_default_tracking_id: current.aliexpressDefaultTrackingId || "default",
        updated_at: new Date().toISOString(),
      };

      await client.from("site_settings").upsert(row, { onConflict: "id" });
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

  async getUgcSummary(productId: string): Promise<UgcSummary> {
    const defaultSummary: UgcSummary = {
      euPlugPercent: 98,
      avgDeliveryDays: 11,
      voltage220vPercent: 100,
      recommendedPercent: 96,
      totalVotes: 14,
    };

    try {
      const verifications = await this.getUgcVerifications(productId, true);
      if (!verifications || verifications.length === 0) {
        return defaultSummary;
      }

      const total = verifications.length;
      const euPlugCount = verifications.filter((v) => v.isEuPlug).length;
      const v220Count = verifications.filter((v) => v.voltage220vCompatible).length;
      const recommendedCount = verifications.filter((v) => v.isRecommended).length;
      const totalDays = verifications.reduce((sum, v) => sum + (v.deliveryDays || 11), 0);

      return {
        euPlugPercent: Math.round((euPlugCount / total) * 100),
        avgDeliveryDays: Math.round(totalDays / total) || 11,
        voltage220vPercent: Math.round((v220Count / total) * 100),
        recommendedPercent: Math.round((recommendedCount / total) * 100),
        totalVotes: total,
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
};
