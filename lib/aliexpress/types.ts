export interface AliExpressProduct {
  aliId: string;
  originalTitle: string;
  titleHe?: string;
  descriptionHe?: string;
  priceUsd: number;
  priceIls: number;
  originalPriceUsd?: number;
  discountPercent: number;
  rating: number;
  ordersCount: number;
  storeName?: string;
  sellerPositiveRate?: string | number;
  shopId?: string;
  categoryName?: string;
  categoryId?: string;
  commissionRate?: number;
  mainImage: string;
  galleryImages: string[];
  specifications: Record<string, string>;
  reviewsSummary: Array<{
    buyerName?: string;
    buyerCountry?: string;
    rating: number;
    comment: string;
    date?: string;
  }>;
  aliUrl: string;
  affiliateUrl?: string;
}

export interface AliExpressApiConfig {
  appKey: string;
  appSecret: string;
  trackingId?: string;
}

export interface GenerateLinkParams {
  productUrl: string;
  subId1?: string;
  subId2?: string;
  subId3?: string;
}
