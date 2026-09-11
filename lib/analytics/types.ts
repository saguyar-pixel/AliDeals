export interface OutboundClickRecord {
  id: string;
  timestamp: string;
  productId: string;
  productTitle: string;
  priceUsd: number;
  priceIls: number;
  pageSlug: string;
  linkType: "cta_button" | "image" | "sticky_bar" | "table_row" | "text_link" | "unknown";
  destinationUrl: string;
  referrer?: string;
}

export interface GscQueryRecord {
  id: string;
  query: string; // מילת חיפוש
  page?: string; // דף יעד (אם קיים)
  clicks: number;
  impressions: number;
  ctr: number; // e.g. 4.5 (%)
  position: number; // e.g. 5.2
  date?: string;
  importedAt: string;
}

export interface Ga4PageStatRecord {
  id: string;
  pagePath: string;
  pageTitle?: string;
  views: number;
  users: number;
  avgEngagementTimeSec?: number;
  bounceRate?: number;
  date?: string;
  importedAt: string;
}

export interface SiteSettingsRecord {
  gaMeasurementId?: string; // G-XXXXXXXXXX
  siteUrl?: string;
  aliexpressAppKey?: string;
  aliexpressAppSecret?: string;
  aliexpressDefaultTrackingId?: string;
  updatedAt: string;
}

export interface S2SConversionRecord {
  id: string;
  orderId: string;
  subId?: string;
  productId?: string;
  productTitle?: string;
  orderAmountUsd: number;
  commissionUsd: number;
  commissionIls: number;
  status: "approved" | "pending" | "rejected";
  source?: string; // "aliexpress" | "admitad" | "custom_s2s"
  rawPayload?: Record<string, unknown>;
  timestamp: string;
}

export interface AnalyticsStorageSchema {
  settings: SiteSettingsRecord;
  clicks: OutboundClickRecord[];
  conversions?: S2SConversionRecord[];
  gscQueries: GscQueryRecord[];
  ga4Stats: Ga4PageStatRecord[];
  lastUpdated: string;
}
