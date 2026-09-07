export type AgentRole =
  | "orchestrator" // אלון - מנהל הצוות (מתאם, מחלק משימות, מפקח על יעד 100$/יום)
  | "analyst"      // דנה - דאטא & CRO אנליסטית (מנתחת נתוני אלי אקספרס + אנליטיקס ו-RPC)
  | "copywriter"   // רון - קופירייטר SEO/GEO (תוכן עמוק, EEAT, הוקים ל-AI Overviews)
  | "creative"     // מיה - קריאייטיב & לייפסטייל (אינפוגרפיקות ותמונות שימוש אמינות ללא הזיות)
  | "qa_officer"   // עומר - בקרת איכות ותאימות (שקע EU, פטור מכס 75$, סכמות קישורים)
  | "developer";   // גל - מהנדס אתר & CRO (משפר קוד, ביצועים, A/B Testing וטעינה)

export type AgentState = "idle" | "thinking" | "working" | "waiting_approval" | "completed" | "error";

export interface AgentProfile {
  role: AgentRole;
  nameHe: string;
  titleHe: string;
  avatarIcon: string;
  color: string;
  currentState: AgentState;
  currentTask?: string;
  specialtyHe: string;
}

export interface AgentLogEntry {
  id: string;
  timestamp: string;
  role: AgentRole;
  agentName: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  metadata?: Record<string, unknown>;
}

export interface CadenceBudget {
  date: string;
  week: string;
  dailyProductsCount: number;
  dailyProductsTarget: number; // ברירת מחדל: 3, ניתן להעלאה
  weeklyTop5Count: number;
  weeklyTop5Target: number;    // ברירת מחדל: 2
  weeklyCategoriesCount: number;
  weeklyCategoriesTarget: number; // ברירת מחדל: 1
  geminiApiCallsToday: number;
  geminiDailySafeLimit: number; // מקסימום בטוח ליום
  dailyRevenueTargetUsd: number; // יעד: 100$ ליום
  estimatedRevenueTodayUsd: number;
}

export interface CroRecommendation {
  id: string;
  pageSlug: string;
  pageTitle: string;
  issueHe: string;
  recommendationHe: string;
  expectedRpmBoost: string;
  status: "pending" | "applied";
}

export interface AutonomousTask {
  id: string;
  title: string;
  type: "review" | "top5" | "cro_fix" | "seo_audit";
  assignedTo: AgentRole;
  priority: "high" | "medium" | "low";
  status: "queued" | "in_progress" | "done";
  scheduledFor: string;
  targetProductUrl?: string;
}

export interface OrchestratorMessage {
  id: string;
  sender: "user" | "orchestrator";
  text: string;
  timestamp: string;
  actionRequired?: boolean;
  actionType?: "approve_publish" | "review_data" | "adjust_quota";
  actionPayload?: Record<string, unknown>;
}
