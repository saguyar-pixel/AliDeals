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
  geminiApiKey?: string;
  enableDealRequestWidget?: boolean;
  dealRequestTelegramUrl?: string;
  dealRequestTitle?: string;
  githubToken?: string;
  githubRepo?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  supabaseServiceKey?: string;
  gtmId?: string; // e.g. GTM-XXXXXXX
  gtmHeadScript?: string; // Raw GTM <head> script code
  gtmBodyScript?: string; // Raw GTM <body> noscript code
  customHeadScript?: string; // Custom <head> scripts (Facebook Pixel, TikTok, Meta tags, etc.)
  customBodyScript?: string; // Custom <body> scripts (chat widgets, noscript tags, etc.)
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

export type CodeSnippetPlacement = "head" | "body_start" | "body_end";
export type CodeSnippetCategory = "facebook_pixel" | "google_tag_manager" | "analytics" | "verification" | "chat_widget" | "marketing" | "custom";
export type CodeSnippetTargetPages = "all" | "home_only" | "reviews_only" | "top5_only";

export interface CustomCodeSnippet {
  id: string;
  title: string;
  code: string;
  placement: CodeSnippetPlacement;
  category: CodeSnippetCategory;
  targetPages: CodeSnippetTargetPages;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type CodeSnippetLogAction = "created" | "updated" | "activated" | "deactivated" | "deleted";

export interface CodeSnippetLogRecord {
  id: string;
  snippetId: string;
  snippetTitle: string;
  action: CodeSnippetLogAction;
  description: string;
  diffSummary?: string;
  timestamp: string;
  actor?: string;
}

