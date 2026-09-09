import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

function ensureDirExists() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filename: string, defaultValue: T): T {
  ensureDirExists();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2), "utf8");
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
  ensureDirExists();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

export interface ProductRecord {
  id: string;
  aliId: string;
  originalTitle: string;
  titleHe?: string | null;
  descriptionHe?: string | null;
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
  productIds: string; // JSON string array
  status?: string;
  viewsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export const jsonDb = {
  // Products
  getProducts(): ProductRecord[] {
    return readJsonFile<ProductRecord[]>("products.json", []);
  },
  getProductByAliId(aliId: string): ProductRecord | undefined {
    return this.getProducts().find((p) => p.aliId === aliId);
  },
  getProductById(id: string): ProductRecord | undefined {
    return this.getProducts().find((p) => p.id === id);
  },
  upsertProduct(record: ProductRecord): void {
    const list = this.getProducts();
    const index = list.findIndex((p) => p.aliId === record.aliId);
    if (index >= 0) {
      list[index] = { ...list[index], ...record };
    } else {
      list.unshift(record);
    }
    writeJsonFile("products.json", list);
  },

  // Pages
  getPages(): PageRecord[] {
    return readJsonFile<PageRecord[]>("pages.json", []);
  },
  getPageBySlug(slug: string): PageRecord | undefined {
    return this.getPages().find((p) => p.slug === slug);
  },
  getPagesByType(type: string): PageRecord[] {
    return this.getPages().filter((p) => p.type === type);
  },
  upsertPage(record: PageRecord): void {
    const list = this.getPages();
    const index = list.findIndex((p) => p.slug === record.slug);
    if (index >= 0) {
      list[index] = { ...list[index], ...record };
    } else {
      list.unshift(record);
    }
    writeJsonFile("pages.json", list);
  },
};
