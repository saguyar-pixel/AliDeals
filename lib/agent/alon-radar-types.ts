import { CategoryArchetype } from "../categories/archetypes";
import { AliExpressProduct } from "../aliexpress/types";

export interface IsraeliNicheConfig {
  keyword: string;
  category: string;
  archetype: CategoryArchetype;
  labelHe: string;
}

export const ISRAELI_DEMAND_NICHES: IsraeliNicheConfig[] = [
  { keyword: "GaN charger fast charging 65W 100W", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "מטענים מהירים וכבלי GaN" },
  { keyword: "cordless car vacuum cleaner handheld", category: "רכב ואביזרים", archetype: "HOME_LIVING", labelHe: "שואבי אבק קומפקטיים לרכב" },
  { keyword: "wireless bluetooth earbuds anc noise cancelling", category: "סאונד ואוזניות", archetype: "ELECTRONICS", labelHe: "אוזניות אלחוטיות עם סינון רעשים" },
  { keyword: "air fryer silicone liner accessories basket", category: "לבית ולמטבח", archetype: "HOME_LIVING", labelHe: "אביזרי נינג'ה ואייר פרייר" },
  { keyword: "led magnetic night light motion sensor usb", category: "תאורה ובית חכם", archetype: "HOME_LIVING", labelHe: "תאורת אווירה וחיישני תנועה" },
  { keyword: "magnetic car phone mount wireless charger", category: "רכב ואביזרים", archetype: "ELECTRONICS", labelHe: "מעמדי טלפון מגנטיים לרכב" },
  { keyword: "cordless electric screwdriver drill set", category: "כלי עבודה ועשה זאת בעצמך", archetype: "HOME_LIVING", labelHe: "מברגות וכלי עבודה נטענים" },
  { keyword: "smart pet water fountain automatic", category: "חיות מחמד", archetype: "HOME_LIVING", labelHe: "מזרקות מים והאכלה חכמה" },
  { keyword: "sonic electric toothbrush waterproof usb", category: "בריאות וטיפוח אישי", archetype: "ELECTRONICS", labelHe: "מברשות שיניים חשמליות סוניות" },
  { keyword: "thermal stainless steel water bottle insulated", category: "ספורט ומחנאות", archetype: "HOME_LIVING", labelHe: "בקבוקים תרמיים שומרי קור וחום" },
  { keyword: "mini portable hd pocket projector android", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "מקרני כיס ניידים לחדר" },
  { keyword: "smart watch amoled fitness tracker waterproof", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "שעוני כושר חכמים ומדדי בריאות" },
];

export interface CollisionCheckResult {
  isAllowed: boolean;
  status: "unique" | "differentiated" | "duplicate" | "too_similar";
  statusColor: "green" | "yellow" | "red";
  reasonHe: string;
  competingProductTitle?: string;
  competingPriceUsd?: number;
  competingPriceIls?: number;
  diffPercent?: number;
  diffDirection?: "cheaper" | "more_expensive" | "same_price";
  differentiationType?: "unique_catalog" | "price_tier" | "model_variant" | "spec_upgrade" | "duplicate";
  differentiationTag?: string;
  isHighTierWorthIt?: boolean;
}

export interface AliHealthCheckResult {
  specsCount: number;
  mediaCount: number;
  storeName: string;
  sellerPositiveRate: string;
  hasEuPlug: boolean | null;
  shippingVerified: boolean;
  affiliateLinkReady: boolean;
  overallStatus: "healthy" | "warning";
  statusBadgeHe: string;
}

export interface RadarCandidateProduct {
  product: AliExpressProduct;
  niche: IsraeliNicheConfig;
  collision: CollisionCheckResult;
  alonRationale: string;
  healthCheck: AliHealthCheckResult;
}
