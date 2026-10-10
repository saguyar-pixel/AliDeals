import { CategoryArchetype } from "../categories/archetypes";
import { AliExpressProduct } from "../aliexpress/types";

export interface IsraeliNicheConfig {
  keyword: string;
  category: string;
  archetype: CategoryArchetype;
  labelHe: string;
}

export const ISRAELI_DEMAND_NICHES: IsraeliNicheConfig[] = [
  { keyword: "GaN charger", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "מטענים מהירים וכבלי GaN" },
  { keyword: "car vacuum cleaner", category: "רכב ואביזרים", archetype: "HOME_LIVING", labelHe: "שואבי אבק קומפקטיים לרכב" },
  { keyword: "wireless earbuds anc", category: "סאונד ואוזניות", archetype: "ELECTRONICS", labelHe: "אוזניות אלחוטיות עם סינון רעשים" },
  { keyword: "air fryer silicone", category: "לבית ולמטבח", archetype: "HOME_LIVING", labelHe: "אביזרי נינג'ה ואייר פרייר" },
  { keyword: "led night light sensor", category: "תאורה ובית חכם", archetype: "HOME_LIVING", labelHe: "תאורת אווירה וחיישני תנועה" },
  { keyword: "magnetic car phone mount", category: "רכב ואביזרים", archetype: "ELECTRONICS", labelHe: "מעמדי טלפון מגנטיים לרכב" },
  { keyword: "cordless screwdriver drill", category: "כלי עבודה ועשה זאת בעצמך", archetype: "HOME_LIVING", labelHe: "מברגות וכלי עבודה נטענים" },
  { keyword: "pet water fountain", category: "חיות מחמד", archetype: "HOME_LIVING", labelHe: "מזרקות מים והאכלה חכמה" },
  { keyword: "electric toothbrush sonic", category: "בריאות וטיפוח אישי", archetype: "ELECTRONICS", labelHe: "מברשות שיניים חשמליות סוניות" },
  { keyword: "insulated water bottle", category: "ספורט ומחנאות", archetype: "HOME_LIVING", labelHe: "בקבוקים תרמיים שומרי קור וחום" },
  { keyword: "mini projector portable", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "מקרני כיס ניידים לחדר" },
  { keyword: "smart watch amoled", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "שעוני כושר חכמים ומדדי בריאות" },
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
