import { jsonDb, ProductRecord, PageRecord } from "./json-db";

export * from "./json-db";

// Compatibility adapter for existing imports
export const db = {
  select() {
    return {
      from(table: string) {
        return {
          where(predicate: (item: any) => boolean) {
            return {
              get() {
                const list = table === "products" ? jsonDb.getProducts() : jsonDb.getPages();
                return list.find(predicate);
              },
              all() {
                const list = table === "products" ? jsonDb.getProducts() : jsonDb.getPages();
                return list.filter(predicate);
              },
            };
          },
          orderBy() {
            return {
              limit(n: number) {
                return {
                  all() {
                    const list = table === "products" ? jsonDb.getProducts() : jsonDb.getPages();
                    return list.slice(0, n);
                  },
                };
              },
              all() {
                const list = table === "products" ? jsonDb.getProducts() : jsonDb.getPages();
                return list;
              },
            };
          },
          all() {
            const list = table === "products" ? jsonDb.getProducts() : jsonDb.getPages();
            return list;
          },
        };
      },
    };
  },
  insert(table: string) {
    return {
      values(val: any) {
        return {
          run() {
            if (table === "products") {
              jsonDb.upsertProduct(val);
            } else if (table === "pages") {
              jsonDb.upsertPage(val);
            }
          },
        };
      },
    };
  },
  update(table: string) {
    return {
      set(val: any) {
        return {
          where(predicate: any) {
            return {
              run() {
                if (table === "products") {
                  jsonDb.upsertProduct(val);
                } else if (table === "pages") {
                  jsonDb.upsertPage(val);
                }
              },
            };
          },
        };
      },
    };
  },
};

export const products = "products";
export const pages = "pages";
export const categories = "categories";
export const clicksTracking = "clicks_tracking";
export const arbitrageCampaigns = "arbitrage_campaigns";

export * from "./analytics-db";
export * from "./supabase-db";
