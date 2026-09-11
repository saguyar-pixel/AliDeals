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

// Helper: Convert snake_case Supabase product row to camelCase ProductRecord
function mapProductFromSupabase(row: any): ProductRecord {
  return {
    id: row.id,
    aliId: row.ali_id,
    originalTitle: row.original_title,
    titleHe: row.title_he,
    descriptionHe: row.description_he,
    metaTitle: row.meta_title,
    metaDescription: row.meta_description,
    category: row.category,
    tags: Array.isArray(row.tags) ? row.tags : [],
    priceUsd: Number(row.price_usd) || 0,
    priceIls: Number(row.price_ils) || 0,
    originalPriceUsd: row.original_price_usd ? Number(row.original_price_usd) : null,
    discountPercent: Number(row.discount_percent) || 0,
    rating: Number(row.rating) || 4.8,
    ordersCount: Number(row.orders_count) || 0,
    storeName: row.store_name,
    sellerPositiveRate: row.seller_positive_rate,
    commissionRate: Number(row.commission_rate) || 7.0,
    mainImage: row.main_image,
    galleryImages: row.gallery_images,
    specifications: row.specifications,
    reviewsSummary: row.reviews_summary,
    aliUrl: row.ali_url,
    affiliateUrl: row.affiliate_url,
    boughtTogetherIds: Array.isArray(row.bought_together_ids) ? row.bought_together_ids : (typeof row.bought_together_ids === "string" ? JSON.parse(row.bought_together_ids || "[]") : []),
    crossSellReason: row.cross_sell_reason || undefined,
    status: row.status,
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
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getProducts();

    try {
      const { data, error } = await client
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data) {
        console.warn("Supabase getProducts error, falling back to JSON:", error?.message);
        return jsonDb.getProducts();
      }

      return data.map(mapProductFromSupabase);
    } catch (err) {
      console.warn("Supabase getProducts exception:", err);
      return jsonDb.getProducts();
    }
  },

  async getProductById(id: string): Promise<ProductRecord | null> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getProductById(id) || null;

    try {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        return jsonDb.getProductById(id) || null;
      }
      return mapProductFromSupabase(data);
    } catch {
      return jsonDb.getProductById(id) || null;
    }
  },

  async getProductByAliId(aliId: string): Promise<ProductRecord | null> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getProductByAliId(aliId) || null;

    try {
      const { data, error } = await client
        .from("products")
        .select("*")
        .eq("ali_id", String(aliId))
        .maybeSingle();

      if (error || !data) {
        return jsonDb.getProductByAliId(aliId) || null;
      }
      return mapProductFromSupabase(data);
    } catch {
      return jsonDb.getProductByAliId(aliId) || null;
    }
  },

  async upsertProduct(p: Partial<ProductRecord>): Promise<ProductRecord | null> {
    // Keep local jsonDb in sync as immediate backup
    jsonDb.upsertProduct(p as ProductRecord);

    const client = getSupabaseServerClient();
    if (!client) return p as ProductRecord;

    try {
      const now = new Date().toISOString();
      const row: any = {
        id: p.id || `prod_${p.aliId}`,
        site_id: "alideals",
        ali_id: String(p.aliId),
        original_title: p.originalTitle || "",
        title_he: p.titleHe || null,
        description_he: p.descriptionHe || null,
        meta_title: p.metaTitle || null,
        meta_description: p.metaDescription || null,
        category: p.category || "אלקטרוניקה וגאדג'טים",
        tags: Array.isArray(p.tags) ? p.tags : [],
        price_usd: p.priceUsd || 0,
        price_ils: p.priceIls || 0,
        original_price_usd: p.originalPriceUsd || null,
        discount_percent: p.discountPercent || 0,
        rating: p.rating || 4.8,
        orders_count: p.ordersCount || 100,
        store_name: p.storeName || null,
        seller_positive_rate: p.sellerPositiveRate || null,
        commission_rate: p.commissionRate || 7.0,
        main_image: p.mainImage || "",
        gallery_images: typeof p.galleryImages === "string" ? JSON.parse(p.galleryImages || "[]") : p.galleryImages || [],
        specifications: typeof p.specifications === "string" ? JSON.parse(p.specifications || "{}") : p.specifications || {},
        reviews_summary: typeof p.reviewsSummary === "string" ? JSON.parse(p.reviewsSummary || "[]") : p.reviewsSummary || [],
        ali_url: p.aliUrl || "",
        affiliate_url: p.affiliateUrl || null,
        bought_together_ids: p.boughtTogetherIds || [],
        cross_sell_reason: p.crossSellReason || null,
        status: p.status || "active",
        updated_at: now,
      };

      let { data, error } = await client
        .from("products")
        .upsert(row, { onConflict: "ali_id" })
        .select()
        .single();

      if (error && (error.message.includes("sites") || error.message.includes("foreign key") || error.code === "23503")) {
        try {
          await client.from("sites").upsert({
            id: "alideals",
            domain: "ali-deals.co.il",
            name: "AliDeals ישראל",
            theme_color: "#ea580c",
          });
          const retry = await client
            .from("products")
            .upsert(row, { onConflict: "ali_id" })
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        } catch {}
      }

      if (error) {
        console.warn("Supabase upsertProduct error:", error.message);
        return p as ProductRecord;
      }
      return mapProductFromSupabase(data);
    } catch (err) {
      console.warn("Supabase upsertProduct exception:", err);
      return p as ProductRecord;
    }
  },

  async deleteProduct(aliId: string): Promise<boolean> {
    jsonDb.deleteProduct(aliId);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      const { error } = await client
        .from("products")
        .delete()
        .eq("ali_id", String(aliId));
      if (error) console.warn("Supabase deleteProduct error:", error.message);
      return !error;
    } catch {
      return true;
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

      if (error || !data) {
        console.warn("Supabase getPages error, falling back to JSON:", error?.message);
        return jsonDb.getPages();
      }

      if (data.length === 0) {
        return jsonDb.getPages();
      }

      return data.map(mapPageFromSupabase);
    } catch {
      return jsonDb.getPages();
    }
  },

  async getPageById(id: string): Promise<PageRecord | null> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getPageById(id) || null;

    try {
      const { data, error } = await client
        .from("pages")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        return jsonDb.getPageById(id) || null;
      }
      return mapPageFromSupabase(data);
    } catch {
      return jsonDb.getPageById(id) || null;
    }
  },

  async getPageBySlug(slug: string): Promise<PageRecord | null> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getPageBySlug(slug) || null;

    try {
      const { data, error } = await client
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data) {
        return jsonDb.getPageBySlug(slug) || null;
      }
      return mapPageFromSupabase(data);
    } catch {
      return jsonDb.getPageBySlug(slug) || null;
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

      if (error || !data) {
        return jsonDb.getPagesByType(type);
      }
      return data.map(mapPageFromSupabase);
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
      const row: any = {
        id: page.id || `page_${Date.now()}`,
        site_id: "alideals",
        slug: page.slug,
        type: page.type || "review",
        title: page.title || "",
        meta_title: page.metaTitle || page.title || "",
        meta_description: page.metaDescription || "",
        direct_answer_geo: page.directAnswerGeo || "",
        content_markdown: page.contentMarkdown || "",
        structured_data_json: typeof page.structuredDataJson === "string" ? JSON.parse(page.structuredDataJson || "{}") : page.structuredDataJson,
        featured_image: page.featuredImage || null,
        infographic_image: page.infographicImage || null,
        target_category: page.targetCategory || "אלקטרוניקה וגאדג'טים",
        tags: Array.isArray(page.tags) ? page.tags : [],
        product_ids: typeof page.productIds === "string" ? JSON.parse(page.productIds || "[]") : page.productIds || [],
        bought_together_ids: page.boughtTogetherIds || [],
        cross_sell_reason: page.crossSellReason || null,
        status: page.status || "published",
        views_count: page.viewsCount || 0,
        updated_at: now,
      };

      let { data, error } = await client
        .from("pages")
        .upsert(row, { onConflict: "slug" })
        .select()
        .single();

      // If failed due to missing site_id in sites table, auto-create site and retry
      if (error && (error.message.includes("sites") || error.message.includes("foreign key") || error.code === "23503")) {
        try {
          await client.from("sites").upsert({
            id: "alideals",
            domain: "ali-deals.co.il",
            name: "AliDeals ישראל",
            theme_color: "#ea580c",
          });
          const retry = await client
            .from("pages")
            .upsert(row, { onConflict: "slug" })
            .select()
            .single();
          data = retry.data;
          error = retry.error;
        } catch {}
      }

      if (error) {
        console.warn("Supabase upsertPage error:", error.message);
        return page as PageRecord;
      }
      return mapPageFromSupabase(data);
    } catch (err) {
      console.warn("Supabase upsertPage exception:", err);
      return page as PageRecord;
    }
  },

  async deletePage(idOrSlug: string): Promise<boolean> {
    jsonDb.deletePage(idOrSlug);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      // Find page first to get both id and slug
      const { data: page } = await client
        .from("pages")
        .select("id, slug")
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
        .maybeSingle();

      const pageId = page?.id || idOrSlug;
      const pageSlug = page?.slug || idOrSlug;

      // Delete cascade from page_products relational junction
      await client.from("page_products").delete().eq("page_id", pageId);

      // Delete from pages
      const { error } = await client
        .from("pages")
        .delete()
        .or(`id.eq.${pageId},slug.eq.${pageSlug},id.eq.${idOrSlug},slug.eq.${idOrSlug}`);

      return !error;
    } catch (err) {
      console.warn("Supabase deletePage exception:", err);
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

  // ==========================================
  // SITE SETTINGS
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
  async getCoupons(): Promise<CouponRecord[]> {
    const client = getSupabaseServerClient();
    if (!client) return jsonDb.getCoupons();

    try {
      const { data, error } = await client
        .from("coupons_deals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) return jsonDb.getCoupons();

      return data.map((c: any) => ({
        id: c.id,
        siteId: c.site_id || "alideals",
        code: c.code,
        titleHe: c.title_he,
        descriptionHe: c.description_he,
        discountAmount: c.discount_amount ? Number(c.discount_amount) : undefined,
        discountPercent: c.discount_percent ? Number(c.discount_percent) : undefined,
        minSpendUsd: c.min_spend_usd ? Number(c.min_spend_usd) : undefined,
        categoryId: c.category_id,
        affiliateUrl: c.affiliate_url,
        placements: Array.isArray(c.placements) ? c.placements : ["all"],
        targetCategoryIds: Array.isArray(c.target_category_ids) ? c.target_category_ids : [],
        targetProductIds: Array.isArray(c.target_product_ids) ? c.target_product_ids : [],
        clickCount: Number(c.click_count) || 0,
        isActive: Boolean(c.is_active),
        validFrom: c.valid_from,
        validTo: c.valid_to,
        createdAt: c.created_at,
      }));
    } catch {
      return jsonDb.getCoupons();
    }
  },

  async upsertCoupon(record: CouponRecord): Promise<CouponRecord> {
    jsonDb.upsertCoupon(record);

    const client = getSupabaseServerClient();
    if (!client) return record;

    try {
      await client.from("coupons_deals").upsert({
        id: record.id || `cpn_${Date.now()}`,
        site_id: "alideals",
        code: record.code.toUpperCase(),
        title_he: record.titleHe,
        description_he: record.descriptionHe || null,
        discount_amount: record.discountAmount || null,
        min_spend_usd: record.minSpendUsd || null,
        category_id: record.categoryId || null,
        affiliate_url: record.affiliateUrl || null,
        is_active: record.isActive,
        valid_from: record.validFrom || new Date().toISOString(),
        valid_to: record.validTo || null,
      }, { onConflict: "code" });
      return record;
    } catch {
      return record;
    }
  },

  async deleteCoupon(idOrCode: string): Promise<boolean> {
    jsonDb.deleteCoupon(idOrCode);

    const client = getSupabaseServerClient();
    if (!client) return true;

    try {
      await client
        .from("coupons_deals")
        .delete()
        .or(`id.eq.${idOrCode},code.eq.${idOrCode.toUpperCase()}`);
      return true;
    } catch {
      return true;
    }
  },

  // ==========================================
  // 301 REDIRECTS
  // ==========================================
  async getRedirects(): Promise<RedirectRecord[]> {
    return jsonDb.getRedirects();
  },

  async getRedirectBySource(sourcePath: string): Promise<RedirectRecord | undefined> {
    return jsonDb.getRedirectBySource(sourcePath);
  },

  async upsertRedirect(record: RedirectRecord): Promise<void> {
    jsonDb.upsertRedirect(record);
  },

  async deleteRedirect(idOrSource: string): Promise<void> {
    jsonDb.deleteRedirect(idOrSource);
  },

  // ==========================================
  // DYNAMIC NAVIGATION MENU
  // ==========================================
  async getNavigationMenu(): Promise<NavigationItemRecord[]> {
    return jsonDb.getNavigationMenu();
  },

  async saveNavigationMenu(menu: NavigationItemRecord[]): Promise<void> {
    jsonDb.saveNavigationMenu(menu);
  },
};
