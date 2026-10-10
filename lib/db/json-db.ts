import fs from "fs";
import path from "path";
import { CustomCodeSnippet, CodeSnippetLogRecord } from "../analytics/types";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDirExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  // Check /tmp first for serverless runtime modifications
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const tmpPath = path.join("/tmp", filename);
    if (fs.existsSync(tmpPath)) {
      try {
        const raw = fs.readFileSync(tmpPath, "utf8");
        return JSON.parse(raw) as T;
      } catch (e) {
        console.warn(`Failed reading /tmp/${filename}:`, e);
      }
    }
  }

  ensureDirExists();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
    } catch {
      // Ignore read-only fs error on cloud
    }
    return defaultValue;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Failed to read ${filename}, using default`, err);
    return defaultValue;
  }
}

function writeJsonFile<T>(filename: string, data: T): void {
  // Always update /tmp if running in serverless cloud
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    console.warn(`[JSON-DB] Notice: Running in serverless environment. File /tmp/${filename} is ephemeral and will not persist across container lifecycles. Ensure Supabase DB is connected for permanent storage.`);
    try {
      const tmpPath = path.join("/tmp", filename);
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.warn(`Failed writing /tmp/${filename}:`, e);
    }
  }

  try {
    ensureDirExists();
    const filePath = path.join(DATA_DIR, filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn(`Local write to ${filename} failed (expected on read-only serverless):`, err);
  }
}

import { CategoryArchetype } from "@/lib/categories/archetypes";
import type { AffiliateOrder, AffiliateOrderItem } from "@/lib/aliexpress/types";

export interface DismissedOrderRecord {
  orderNumber?: string;
  productId?: string;
  slug?: string;
  dismissedAt: string;
  reason?: string;
}

export interface ProductRecord {
  id: string;
  aliId: string;
  originalTitle: string;
  titleHe?: string | null;
  descriptionHe?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  category?: string | null;
  archetype?: CategoryArchetype | string;
  tags?: string[];
  priceUsd: number;
  priceIls: number;
  originalPriceUsd?: number | null;
  discountPercent?: number;
  rating?: number;
  ordersCount?: number;
  storeName?: string | null;
  commissionRate?: number;
  mainImage: string;
  galleryImages: any; // JSON string or Array
  specifications?: any; // JSON string or Object
  reviewsSummary?: any; // JSON string or Array
  aliUrl: string;
  affiliateUrl?: string | null;
  boughtTogetherIds?: string[]; // IDs of 1-3 complementary products
  crossSellReason?: string; // Compelling copy explaining why to buy together
  isEuPlug?: boolean | null;
  voltage220vCompatible?: boolean | null;
  sizeWarning?: string | null;
  fabricComposition?: string | null;
  status?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PageRecord {
  id: string;
  slug: string;
  type: string; // 'review' | 'top5' | 'category' | 'deal'
  title: string;
  metaTitle: string;
  metaDescription: string;
  directAnswerGeo: string;
  contentMarkdown: string;
  structuredDataJson?: string | null;
  featuredImage?: string | null;
  infographicImage?: string | null;
  targetCategory?: string | null;
  archetype?: CategoryArchetype | string;
  tags?: string[];
  pros?: string[];
  cons?: string[];
  faqs?: Array<{ question: string; answer: string }>;
  productIds: string; // JSON string array
  boughtTogetherIds?: string[]; // IDs of 1-3 complementary products
  crossSellReason?: string; // Compelling copy explaining why to buy together
  isEuPlug?: boolean | null;
  voltage220vCompatible?: boolean | null;
  sizeWarning?: string | null;
  fabricComposition?: string | null;
  alonRationale?: string | null;
  aliHealthCheck?: string | null;
  status?: string;
  viewsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRecord {
  id: string;
  siteId?: string;
  parentId?: string | null;
  nameHe: string;
  slug: string;
  path?: string;
  icon?: string;
  descriptionHe?: string;
  archetype?: CategoryArchetype | string;
  level?: number;
  sortOrder?: number;
  isFeatured?: boolean;
  tags: string[];
  aliCategoryId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PageProductRecord {
  pageId: string;
  productId: string;
  position: number;
  badge?: string;
  pros?: string[];
  cons?: string[];
  customReview?: string;
  createdAt?: string;
}

export interface PriceHistoryRecord {
  id?: number;
  productId: string;
  priceUsd: number;
  priceIls: number;
  recordedAt: string;
}

export interface CouponRecord {
  id: string;
  siteId?: string;
  code: string;
  titleHe?: string;
  title?: string;
  descriptionHe?: string;
  discountText?: string;
  discountAmount?: number;
  discountPercent?: number;
  minSpendUsd?: number;
  categoryId?: string;
  affiliateUrl?: string;
  placements?: string[]; // ["all", "popup", "category", "product_page"]
  targetCategoryIds?: string[];
  targetProductIds?: string[];
  clickCount?: number;
  showInExitModal?: boolean;
  showSitewide?: boolean;
  usageCount?: number;
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
  expiresAt?: string;
  createdAt?: string;
}

export interface UgcVerificationRecord {
  id: string;
  productId: string;
  isEuPlug?: boolean | null;
  deliveryDays: number;
  voltage220vCompatible?: boolean | null;
  isRecommended: boolean;
  sizeAccuracy?: number | null;
  fabricQuality?: number | null;
  buyerComment?: string;
  isApproved: boolean;
  createdAt: string;
}

export interface UgcSummary {
  euPlugPercent?: number | null;
  avgDeliveryDays: number;
  voltage220vPercent?: number | null;
  recommendedPercent: number;
  totalVotes: number;
  sizeAccuracyPercent?: number | null;
  fabricQualityPercent?: number | null;
}

export interface CrossSellRecord {
  id: string;
  parentProductId: string;
  relatedProductId: string;
  recommendationReason?: string;
  displayOrder: number;
  createdAt?: string;
}

export interface RedirectRecord {
  id: string;
  sourcePath: string; // e.g. "/reviews/old-slug"
  targetPath: string; // e.g. "/" or "/categories/electronics"
  statusCode: number; // 301
  createdAt: string;
}

export interface NavigationItemRecord {
  id: string;
  label: string;
  href: string;
  icon?: string;
  subtitle?: string;
  isDropdown?: boolean;
  placement: "header_nav" | "hero_pills" | "footer_links";
  sortOrder: number;
  isActive: boolean;
  children?: Array<{
    id: string;
    label: string;
    href: string;
    icon?: string;
    subtitle?: string;
    sortOrder: number;
  }>;
}

export interface AgentTaskRecord {
  id: string;
  siteId?: string;
  agentRole: string;
  taskType: string;
  priority: number;
  status: "queued" | "running" | "completed" | "throttled" | "failed";
  payload: any;
  result?: any;
  errorMessage?: string;
  retryCount?: number;
  maxRetries?: number;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt?: string;
}

function getProductsList(): ProductRecord[] {
  return readJsonFile<ProductRecord[]>("products.json", []);
}

function getPagesList(): PageRecord[] {
  return readJsonFile<PageRecord[]>("pages.json", []);
}

function getCategoriesList(): CategoryRecord[] {
  return readJsonFile<CategoryRecord[]>("categories.json", []);
}

export const jsonDb = {
  // Products
  getProducts(): ProductRecord[] {
    return getProductsList();
  },
  getAllProducts(): ProductRecord[] {
    return getProductsList();
  },
  getProductByAliId(aliId: string): ProductRecord | undefined {
    return getProductsList().find((p) => p.aliId === aliId);
  },
  getProductById(id: string): ProductRecord | undefined {
    return getProductsList().find((p) => p.id === id);
  },
  upsertProduct(record: ProductRecord): void {
    const list = getProductsList();
    const cleanAliId = String(record.aliId || "").trim();
    // Enforce Deduplication: check aliId first, then record ID
    const index = list.findIndex(
      (p) => (cleanAliId && String(p.aliId).trim() === cleanAliId) || p.id === record.id
    );
    const now = new Date().toISOString();
    if (index >= 0) {
      list[index] = {
        ...list[index],
        ...record,
        id: list[index].id || record.id,
        aliId: cleanAliId || list[index].aliId,
        createdAt: list[index].createdAt || now,
        updatedAt: now,
      };
    } else {
      list.unshift({
        ...record,
        id: record.id || `prod_${cleanAliId || Date.now()}`,
        aliId: cleanAliId,
        createdAt: record.createdAt || now,
        updatedAt: now,
      });
    }
    writeJsonFile("products.json", list);
  },
  deleteProduct(idOrAliId: string): void {
    const list = getProductsList().filter((p) => p.id !== idOrAliId && p.aliId !== idOrAliId);
    writeJsonFile("products.json", list);
  },

  // Pages
  getPages(): PageRecord[] {
    return getPagesList();
  },
  getAllPages(): PageRecord[] {
    return getPagesList();
  },
  getPageBySlug(slug: string): PageRecord | undefined {
    if (!slug) return undefined;
    let decoded = slug;
    try {
      decoded = decodeURIComponent(slug);
    } catch {}
    return getPagesList().find((p) => p.slug === slug || p.slug === decoded);
  },
  getPageById(id: string): PageRecord | undefined {
    return getPagesList().find((p) => p.id === id);
  },
  getPagesByType(type: string): PageRecord[] {
    return getPagesList().filter((p) => p.type === type);
  },
  upsertPage(record: PageRecord): void {
    const list = getPagesList();
    const index = list.findIndex((p) => p.slug === record.slug || p.id === record.id);
    const now = new Date().toISOString();
    if (index >= 0) {
      list[index] = {
        ...list[index],
        ...record,
        id: list[index].id || record.id,
        createdAt: list[index].createdAt || now,
        updatedAt: now,
      };
    } else {
      list.unshift({
        ...record,
        id: record.id || `page_${Date.now()}`,
        createdAt: record.createdAt || now,
        updatedAt: now,
      });
    }
    writeJsonFile("pages.json", list);
  },
  deletePage(idOrSlug: string): void {
    const list = getPagesList().filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug);
    writeJsonFile("pages.json", list);
  },
  deletePages(idsOrSlugs: string[]): void {
    const targetSet = new Set(idsOrSlugs);
    const list = getPagesList().filter((p) => !targetSet.has(p.id) && !targetSet.has(p.slug));
    writeJsonFile("pages.json", list);
  },

  // Page Products Junction
  getPageProducts(pageId: string): PageProductRecord[] {
    const all = readJsonFile<PageProductRecord[]>("page_products.json", []);
    return all.filter((pp) => pp.pageId === pageId);
  },
  setPageProducts(
    pageId: string,
    products: Array<{
      productId: string;
      position?: number;
      badge?: string;
      pros?: string[];
      cons?: string[];
      customReview?: string;
    }>
  ): void {
    const all = readJsonFile<PageProductRecord[]>("page_products.json", []);
    const remaining = all.filter((pp) => pp.pageId !== pageId);
    const now = new Date().toISOString();
    const newItems: PageProductRecord[] = products.map((p, idx) => ({
      pageId,
      productId: p.productId,
      position: p.position ?? idx + 1,
      badge: p.badge,
      pros: p.pros,
      cons: p.cons,
      customReview: p.customReview,
      createdAt: now,
    }));
    writeJsonFile("page_products.json", [...remaining, ...newItems]);
  },

  // Categories & Tags
  getCategories(): CategoryRecord[] {
    return getCategoriesList();
  },
  getAllCategories(): CategoryRecord[] {
    return getCategoriesList();
  },
  getCategoryBySlug(slug: string): CategoryRecord | undefined {
    return getCategoriesList().find((c) => c.slug === slug);
  },
  getCategoryById(id: string): CategoryRecord | undefined {
    return getCategoriesList().find((c) => c.id === id);
  },
  upsertCategory(record: CategoryRecord): void {
    const list = getCategoriesList();
    const index = list.findIndex((c) => c.id === record.id || c.slug === record.slug);
    if (index >= 0) {
      list[index] = { ...list[index], ...record };
    } else {
      list.push(record);
    }
    writeJsonFile("categories.json", list);
  },
  deleteCategory(idOrSlug: string): void {
    const list = getCategoriesList().filter((c) => c.id !== idOrSlug && c.slug !== idOrSlug);
    writeJsonFile("categories.json", list);
  },
  getAllTags(): string[] {
    const tagsSet = new Set<string>();
    getCategoriesList().forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t) => tagsSet.add(t));
      }
    });
    return Array.from(tagsSet);
  },

  // Coupons
  getCoupons(): CouponRecord[] {
    return readJsonFile<CouponRecord[]>("coupons.json", [
      {
        id: "cpn_alibuy2026",
        code: "ALIBUY2026",
        titleHe: "קוד קופון בלעדי לרוכשים מישראל",
        descriptionHe: "הנחה נוספת במעמד הצ'ק-אאוט",
        discountAmount: 4.0,
        discountPercent: 10,
        minSpendUsd: 30,
        placements: ["all", "popup", "product_page"],
        isActive: true,
        validFrom: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      },
    ]);
  },
  getCouponById(id: string): CouponRecord | undefined {
    return this.getCoupons().find((c) => c.id === id);
  },
  getCouponByCode(code: string): CouponRecord | undefined {
    return this.getCoupons().find((c) => c.code.toUpperCase() === code.trim().toUpperCase());
  },
  upsertCoupon(record: CouponRecord): void {
    const list = this.getCoupons();
    const index = list.findIndex((c) => c.id === record.id || c.code.toUpperCase() === record.code.toUpperCase());
    if (index >= 0) {
      list[index] = { ...list[index], ...record };
    } else {
      list.unshift(record);
    }
    writeJsonFile("coupons.json", list);
  },
  deleteCoupon(idOrCode: string): void {
    const list = this.getCoupons().filter((c) => c.id !== idOrCode && c.code.toUpperCase() !== idOrCode.toUpperCase());
    writeJsonFile("coupons.json", list);
  },
  recordCouponClick(idOrCode: string): void {
    const list = this.getCoupons();
    const target = list.find((c) => c.id === idOrCode || c.code.toUpperCase() === idOrCode.toUpperCase());
    if (target) {
      target.clickCount = (target.clickCount || 0) + 1;
      writeJsonFile("coupons.json", list);
    }
  },

  // 301 Redirects (Zero 404 guarantee)
  getRedirects(): RedirectRecord[] {
    return readJsonFile<RedirectRecord[]>("redirects.json", []);
  },
  getRedirectBySource(sourcePath: string): RedirectRecord | undefined {
    const cleanPath = sourcePath.toLowerCase().replace(/\/+$/, "");
    return this.getRedirects().find((r) => r.sourcePath.toLowerCase().replace(/\/+$/, "") === cleanPath);
  },
  upsertRedirect(record: RedirectRecord): void {
    const list = this.getRedirects();
    const cleanSource = record.sourcePath.toLowerCase().replace(/\/+$/, "");
    const index = list.findIndex((r) => r.sourcePath.toLowerCase().replace(/\/+$/, "") === cleanSource);
    if (index >= 0) {
      list[index] = { ...list[index], ...record };
    } else {
      list.unshift(record);
    }
    writeJsonFile("redirects.json", list);
  },
  deleteRedirect(idOrSource: string): void {
    const list = this.getRedirects().filter(
      (r) => r.id !== idOrSource && r.sourcePath.toLowerCase() !== idOrSource.toLowerCase()
    );
    writeJsonFile("redirects.json", list);
  },

  // Dynamic Navigation Menu
  getNavigationMenu(): NavigationItemRecord[] {
    return readJsonFile<NavigationItemRecord[]>("navigation_menu.json", [
      {
        id: "nav_home",
        label: "ראשי",
        href: "/",
        placement: "header_nav",
        sortOrder: 1,
        isActive: true,
      },
      {
        id: "nav_top5",
        label: "מדריכי TOP 5",
        href: "/#top5",
        icon: "Layers",
        isDropdown: true,
        placement: "header_nav",
        sortOrder: 2,
        isActive: true,
        children: [
          {
            id: "sub_projectors",
            label: "מקרנים ניידים וחכמים",
            href: "/top5/top-5-mini-projectors-aliexpress",
            icon: "📽️",
            subtitle: "השוואת מקרנים מומלצים לחדר ולנסיעות",
            sortOrder: 1,
          },
          {
            id: "sub_monitors",
            label: "מוניטורים לתינוקות",
            href: "/top5/top-5-baby-monitors-aliexpress",
            icon: "👶",
            subtitle: "מצלמות מאובטחות ללא WiFi ו-PTZ",
            sortOrder: 2,
          },
          {
            id: "sub_shorts",
            label: "מכנסוני ספורט וריצה",
            href: "/top5/top-5-sports-shorts-aliexpress",
            icon: "🏃",
            subtitle: "דגמי 2 ב-1, דריי-פיט וקרוספיט",
            sortOrder: 3,
          },
        ],
      },
      {
        id: "nav_reviews",
        label: "סקירות עומק",
        href: "/#reviews",
        icon: "Star",
        placement: "header_nav",
        sortOrder: 3,
        isActive: true,
      },
      {
        id: "nav_deals",
        label: "דילים חמים",
        href: "/#deals",
        icon: "Flame",
        placement: "header_nav",
        sortOrder: 4,
        isActive: true,
      },
      // Hero Pills
      {
        id: "hero_calc",
        label: "מחשבון מכס $75",
        href: "#customs-calculator",
        icon: "ShieldCheck",
        placement: "hero_pills",
        sortOrder: 1,
        isActive: true,
      },
      {
        id: "hero_shorts",
        label: "מכנסוני ספורט וריצה",
        href: "/top5/top-5-sports-shorts-aliexpress",
        icon: "🏃",
        placement: "hero_pills",
        sortOrder: 2,
        isActive: true,
      },
      {
        id: "hero_monitors",
        label: "מוניטורים לתינוקות",
        href: "/top5/top-5-baby-monitors-aliexpress",
        icon: "👶",
        placement: "hero_pills",
        sortOrder: 3,
        isActive: true,
      },
      {
        id: "hero_projectors",
        label: "מקרנים חכמים לבית",
        href: "/top5/top-5-mini-projectors-aliexpress",
        icon: "📽️",
        placement: "hero_pills",
        sortOrder: 4,
        isActive: true,
      },
    ]);
  },
  saveNavigationMenu(menu: NavigationItemRecord[]): void {
    writeJsonFile("navigation_menu.json", menu);
  },

  // ==========================================
  // AFFILIATE ORDERS & DISMISSAL PERSISTENCE
  // ==========================================
  getAffiliateOrders(): AffiliateOrder[] {
    const list = readJsonFile<AffiliateOrder[]>("affiliate_orders.json", []);
    return list.map((ord) => {
      let paidUsd = ord.paidAmountUsd || 0;
      let commUsd = ord.commissionAmountUsd || 0;
      if (
        ord.rawApiPayload?.paid_amount !== undefined &&
        Number(ord.rawApiPayload.paid_amount) === paidUsd &&
        paidUsd > 0
      ) {
        paidUsd = Math.round((paidUsd / 100) * 100) / 100;
      }
      if (
        ord.rawApiPayload?.estimated_paid_commission !== undefined &&
        Number(ord.rawApiPayload.estimated_paid_commission) === commUsd &&
        commUsd > 0
      ) {
        commUsd = Math.round((commUsd / 100) * 100) / 100;
      }
      const items = (ord.items || []).map((it) => {
        let itemPrice = it.salePriceUsd || 0;
        let itemComm = it.commissionUsd || 0;
        if (
          ord.rawApiPayload?.paid_amount !== undefined &&
          Number(ord.rawApiPayload.paid_amount) === itemPrice &&
          itemPrice > 0
        ) {
          itemPrice = Math.round((itemPrice / 100) * 100) / 100;
        }
        if (
          ord.rawApiPayload?.estimated_paid_commission !== undefined &&
          Number(ord.rawApiPayload.estimated_paid_commission) === itemComm &&
          itemComm > 0
        ) {
          itemComm = Math.round((itemComm / 100) * 100) / 100;
        }
        return {
          ...it,
          salePriceUsd: itemPrice,
          commissionUsd: itemComm,
        };
      });
      return {
        ...ord,
        paidAmountUsd: paidUsd,
        commissionAmountUsd: commUsd,
        items,
      };
    });
  },

  saveAffiliateOrders(orders: AffiliateOrder[]): void {
    const existing = this.getAffiliateOrders();
    const orderMap = new Map<string, AffiliateOrder>();
    for (const o of existing) {
      if (o.orderNumber) orderMap.set(o.orderNumber, o);
    }
    for (const o of orders) {
      if (!o.orderNumber) continue;
      const prev = orderMap.get(o.orderNumber);
      if (prev) {
        // Merge items safely
        const itemMap = new Map<string, AffiliateOrderItem>();
        for (const it of prev.items || []) {
          itemMap.set(it.productId, it);
        }
        for (const it of o.items || []) {
          const prevIt = itemMap.get(it.productId);
          if (prevIt) {
            itemMap.set(it.productId, {
              ...prevIt,
              ...it,
              articleGenerationStatus: prevIt.articleGenerationStatus || it.articleGenerationStatus,
            });
          } else {
            itemMap.set(it.productId, it);
          }
        }
        orderMap.set(o.orderNumber, {
          ...prev,
          ...o,
          items: Array.from(itemMap.values()),
          updatedAt: new Date().toISOString(),
        });
      } else {
        orderMap.set(o.orderNumber, {
          ...o,
          createdAt: o.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
    writeJsonFile("affiliate_orders.json", Array.from(orderMap.values()));
  },

  getAffiliateOrderItems(): AffiliateOrderItem[] {
    const orders = this.getAffiliateOrders();
    const items: AffiliateOrderItem[] = [];
    for (const ord of orders) {
      for (const it of ord.items || []) {
        items.push({
          ...it,
          orderNumber: ord.orderNumber,
          subId: it.subId || ord.subId,
        });
      }
    }
    return items;
  },

  updateOrderItemStatus(
    orderNumberOrItemId: string,
    productId: string | undefined,
    status: "already_exists" | "pending" | "generating" | "completed" | "failed" | "dismissed",
    generatedPageId?: string,
    productRefId?: string
  ): void {
    const orders = this.getAffiliateOrders();
    let updated = false;
    for (const ord of orders) {
      for (const it of ord.items || []) {
        if (
          it.id === orderNumberOrItemId ||
          (ord.orderNumber === orderNumberOrItemId && (!productId || it.productId === productId)) ||
          (productId && it.productId === productId)
        ) {
          it.articleGenerationStatus = status;
          if (generatedPageId) it.generatedPageId = generatedPageId;
          if (productRefId) it.productRefId = productRefId;
          updated = true;
        }
      }
    }
    if (updated) {
      writeJsonFile("affiliate_orders.json", orders);
    }
  },

  getDismissedOrders(): DismissedOrderRecord[] {
    return readJsonFile<DismissedOrderRecord[]>("dismissed_orders.json", []);
  },

  dismissOrder(data: { orderNumber?: string; productId?: string; slug?: string; reason?: string }): void {
    const list = this.getDismissedOrders();
    const cleanOrder = String(data.orderNumber || "").trim();
    const cleanProd = String(data.productId || "").trim();
    const cleanSlug = String(data.slug || "").trim();

    const alreadyExists = list.some(
      (d) =>
        (cleanOrder && d.orderNumber === cleanOrder) ||
        (cleanProd && d.productId === cleanProd) ||
        (cleanSlug && d.slug === cleanSlug)
    );

    if (!alreadyExists && (cleanOrder || cleanProd || cleanSlug)) {
      list.push({
        orderNumber: cleanOrder || undefined,
        productId: cleanProd || undefined,
        slug: cleanSlug || undefined,
        dismissedAt: new Date().toISOString(),
        reason: data.reason || "dismissed_by_user",
      });
      writeJsonFile("dismissed_orders.json", list);
    }

    if (cleanOrder || cleanProd) {
      this.updateOrderItemStatus(cleanOrder, cleanProd, "dismissed");
    }
  },

  isOrderOrProductDismissed(orderNumber?: string, productId?: string, slug?: string): boolean {
    const cleanOrder = String(orderNumber || "").trim();
    const cleanProd = String(productId || "").trim();
    const cleanSlug = String(slug || "").trim();

    const list = this.getDismissedOrders();
    return list.some(
      (d) =>
        (cleanOrder && d.orderNumber === cleanOrder) ||
        (cleanProd && d.productId === cleanProd) ||
        (cleanSlug && d.slug === cleanSlug)
    );
  },

  isOrderDismissed(orderOrProductId: string): boolean {
    const clean = String(orderOrProductId || "").trim();
    if (!clean) return false;
    return this.isOrderOrProductDismissed(clean, clean, clean);
  },

  // ==========================================
  // CUSTOM CODE SNIPPETS & AUDIT LOGS
  // ==========================================
  getCodeSnippets(options?: { activeOnly?: boolean }): CustomCodeSnippet[] {
    const list = readJsonFile<CustomCodeSnippet[]>("code_snippets.json", []);
    if (options?.activeOnly) {
      return list.filter((s) => s.isActive);
    }
    return list;
  },

  getCodeSnippetById(id: string): CustomCodeSnippet | undefined {
    const list = this.getCodeSnippets();
    return list.find((s) => s.id === id);
  },

  upsertCodeSnippet(snippet: CustomCodeSnippet): void {
    const list = this.getCodeSnippets();
    const idx = list.findIndex((s) => s.id === snippet.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...snippet, updatedAt: new Date().toISOString() };
    } else {
      list.unshift(snippet);
    }
    writeJsonFile("code_snippets.json", list);
  },

  toggleCodeSnippet(id: string, isActive: boolean): boolean {
    const list = this.getCodeSnippets();
    const target = list.find((s) => s.id === id);
    if (!target) return false;
    target.isActive = isActive;
    target.updatedAt = new Date().toISOString();
    writeJsonFile("code_snippets.json", list);
    return true;
  },

  deleteCodeSnippet(id: string): boolean {
    const list = this.getCodeSnippets();
    const filtered = list.filter((s) => s.id !== id);
    if (filtered.length === list.length) return false;
    writeJsonFile("code_snippets.json", filtered);
    return true;
  },

  getCodeSnippetLogs(limit = 100): CodeSnippetLogRecord[] {
    const list = readJsonFile<CodeSnippetLogRecord[]>("code_snippet_logs.json", []);
    return list.slice(0, limit);
  },

  addCodeSnippetLog(log: CodeSnippetLogRecord): void {
    const list = this.getCodeSnippetLogs(500);
    list.unshift(log);
    writeJsonFile("code_snippet_logs.json", list.slice(0, 500));
  },
};

