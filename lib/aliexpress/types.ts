export interface AliExpressProduct {
  aliId: string;
  originalTitle: string;
  titleHe?: string;
  descriptionHe?: string;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  keyHighlightsHe?: string[];
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

export interface AffiliateOrderItem {
  id?: string;
  orderNumber: string;
  productId: string;
  productTitle: string;
  productImageUrl: string;
  productCount: number;
  salePriceUsd: number;
  commissionRate: number;
  commissionUsd: number;
  subId?: string;
  productRefId?: string;
  articleGenerationStatus?: "already_exists" | "pending" | "generating" | "completed" | "failed";
  generatedPageId?: string;
  createdAt?: string;
}

export interface AffiliateOrder {
  id?: string;
  orderNumber: string;
  orderStatus: string;
  paidAmountUsd: number;
  commissionAmountUsd: number;
  subId?: string;
  orderTime: string;
  rawApiPayload?: any;
  items: AffiliateOrderItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AffiliateOrderQueryOptions {
  startTime?: string; // YYYY-MM-DD HH:mm:ss
  endTime?: string;   // YYYY-MM-DD HH:mm:ss
  status?: string;    // e.g. "Payment Completed", "Settled"
  pageSize?: number;  // Default 50
  pageNo?: number;
  startQueryIndexId?: string;
}

export interface AffiliateOrderQueryResult {
  orders: AffiliateOrder[];
  totalCount: number;
  nextQueryIndexId?: string;
  rawResponse?: any;
}

