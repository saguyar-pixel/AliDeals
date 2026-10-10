import { CategoryArchetype } from "../categories/archetypes";
import { AliExpressProduct } from "../aliexpress/types";

export interface IsraeliNicheConfig {
  keyword: string;
  category: string;
  archetype: CategoryArchetype;
  labelHe: string;
  theme?: string;
  consumerRationaleHe?: string;
  seasonOrOccasion?: string;
}

export interface DynamicMarketThesis extends IsraeliNicheConfig {
  angleId: string;
  theme: string;
  seasonOrOccasion?: string;
  consumerRationaleHe: string;
}

export const ISRAELI_DEMAND_NICHES: IsraeliNicheConfig[] = [
  { keyword: "GaN charger 65w fast", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "מטענים מהירים וכבלי GaN", theme: "יוקר המחיה וחיסכון", consumerRationaleHe: "חלופה ב-70% פחות ממחירי רשתות החשמל בישראל" },
  { keyword: "portable tire inflator cordless", category: "רכב ואביזרים", archetype: "ELECTRONICS", labelHe: "משאבות צמיגים ניידות לרכב", theme: "רכב ובטיחות משפחתית", consumerRationaleHe: "היערכות לחירום ובדיקת לחץ אוויר עצמאית" },
  { keyword: "wireless earbuds anc", category: "סאונד ואוזניות", archetype: "ELECTRONICS", labelHe: "אוזניות אלחוטיות עם סינון רעשים", theme: "טכנולוגיה וסאונד", consumerRationaleHe: "סאונד איכותי עם ANC בלי לשלם 800 ש\"ח על מותגי על" },
  { keyword: "air fryer silicone", category: "לבית ולמטבח", archetype: "HOME_LIVING", labelHe: "אביזרי נינג'ה ואייר פרייר", theme: "מטבח חכם ובישול בריא", consumerRationaleHe: "חוסך שטיפת תבניות ומאריך חיי מכשירי טיגון ללא שמן" },
  { keyword: "led night light sensor", category: "תאורה ובית חכם", archetype: "HOME_LIVING", labelHe: "תאורת אווירה וחיישני תנועה", theme: "בית חכם וחיסכון בחשמל", consumerRationaleHe: "תאורה אוטומטית שקטה למסדרון וחדרי ילדים" },
  { keyword: "magnetic car phone mount", category: "רכב ואביזרים", archetype: "ELECTRONICS", labelHe: "מעמדי טלפון מגנטיים לרכב", theme: "נוחות נהיגה", consumerRationaleHe: "אחיזה יציבה בכבישים משובשים ותמיכה ב-MagSafe" },
  { keyword: "cordless screwdriver drill", category: "כלי עבודה ועשה זאת בעצמך", archetype: "HOME_LIVING", labelHe: "מברגות וכלי עבודה נטענים", theme: "עשה זאת בעצמך", consumerRationaleHe: "תיקונים והרכבות רהיטים בבית ללא תלות באנשי מקצוע יקרים" },
  { keyword: "pet water fountain", category: "חיות מחמד", archetype: "HOME_LIVING", labelHe: "מזרקות מים והאכלה חכמה", theme: "רווחת חיות מחמד", consumerRationaleHe: "מים מסוננים וזורמים המעודדים שתייה ומניעת מחלות כליה" },
  { keyword: "electric toothbrush sonic", category: "בריאות וטיפוח אישי", archetype: "ELECTRONICS", labelHe: "מברשות שיניים חשמליות סוניות", theme: "בריאות ופארם אלטרנטיבי", consumerRationaleHe: "צחצוח מקצועי במחיר סמלי בהשוואה לסופר-פארם" },
  { keyword: "insulated water bottle", category: "ספורט ומחנאות", archetype: "HOME_LIVING", labelHe: "בקבוקים תרמיים שומרי קור וחום", theme: "ספורט ושטח", consumerRationaleHe: "שמירה על מים קפואים בחום הישראלי למשך יממה" },
  { keyword: "mini projector portable", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "מקרני כיס ניידים לחדר", theme: "בידור ופרימיום שווה", consumerRationaleHe: "קולנוע ביתי עד 120 אינץ' בחדר השינה במחיר חסר תחרות" },
  { keyword: "smart watch amoled", category: "אלקטרוניקה וגאדג'טים", archetype: "ELECTRONICS", labelHe: "שעוני כושר חכמים ומדדי בריאות", theme: "כושר ואורח חיים", consumerRationaleHe: "מדדי דופק, שינה וחמצן עם מסך AMOLED איכותי" },
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
  thesis?: DynamicMarketThesis;
}
