import fs from "fs";
import path from "path";

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

export interface ProductRecord {
  id: string;
  aliId: string;
  originalTitle: string;
  titleHe?: string | null;
  descriptionHe?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  category?: string | null;
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
  tags?: string[];
  productIds: string; // JSON string array
  boughtTogetherIds?: string[]; // IDs of 1-3 complementary products
  crossSellReason?: string; // Compelling copy explaining why to buy together
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
  titleHe: string;
  descriptionHe?: string;
  discountAmount?: number;
  discountPercent?: number;
  minSpendUsd?: number;
  categoryId?: string;
  affiliateUrl?: string;
  placements?: string[]; // ["all", "popup", "category", "product_page"]
  targetCategoryIds?: string[];
  targetProductIds?: string[];
  clickCount?: number;
  isActive: boolean;
  validFrom?: string;
  validTo?: string;
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
    return getPagesList().find((p) => p.slug === slug);
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
};
