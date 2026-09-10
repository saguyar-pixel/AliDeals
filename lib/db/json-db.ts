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
  status?: string;
  viewsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryRecord {
  id: string;
  nameHe: string;
  slug: string;
  icon?: string;
  descriptionHe?: string;
  tags: string[];
  aliCategoryId?: string;
  createdAt?: string;
  updatedAt?: string;
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
    const index = list.findIndex((p) => p.aliId === record.aliId);
    if (index >= 0) {
      list[index] = { ...list[index], ...record };
    } else {
      list.unshift(record);
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
    const index = list.findIndex((p) => p.slug === record.slug);
    if (index >= 0) {
      list[index] = { ...list[index], ...record };
    } else {
      list.unshift(record);
    }
    writeJsonFile("pages.json", list);
  },
  deletePage(idOrSlug: string): void {
    const list = getPagesList().filter((p) => p.id !== idOrSlug && p.slug !== idOrSlug);
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
};
