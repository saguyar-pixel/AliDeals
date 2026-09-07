import { ProductRecord, PageRecord, CategoryRecord } from "./json-db";

export type Product = ProductRecord;
export type Page = PageRecord;
export type Category = CategoryRecord;

export interface ClickTrackingRecord {
  id: string;
  productId: string;
  pageId: string;
  subId1: string;
  subId2: string;
  subId3: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  gclid?: string;
  fbclid?: string;
  deviceType: string;
  clickedAt: string;
}

export interface ArbitrageCampaignRecord {
  id: string;
  campaignName: string;
  trafficSource: string;
  targetPageSlug: string;
  targetProductId: string;
  targetAliExpressUrl: string;
  cpcEstimatedUsd: number;
  expectedRpcUsd: number;
  expectedRoas: number;
  status: string;
  createdAt: string;
}
