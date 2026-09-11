"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminAuthGate from "@/components/admin/AdminAuthGate";
import AdminSidebar from "@/components/admin/AdminSidebar";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";
import {
  Package,
  FileText,
  TrendingUp,
  RefreshCw,
  ShieldCheck,
  Zap,
  Search,
  PlusCircle,
  Ticket,
  ArrowUpRight,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Layers,
  Flame,
  MousePointerClick,
  Database,
  Bot,
  ExternalLink,
} from "lucide-react";

interface LiveStats {
  timestamp: string;
  products: {
    total: number;
    active: number;
    inactive: number;
    withoutReview: number;
    recentlyUpdated: number;
  };
  pages: {
    total: number;
    published: number;
    draft: number;
    reviews: number;
    top5: number;
    deals: number;
  };
  redirects: {
    total: number;
    active301: number;
    zero404Protected: boolean;
  };
  subIds: {
    totalClicks: number;
    breakdown: Record<string, number>;
  };
  coupons: {
    total: number;
    active: number;
    totalClicks: number;
  };
  systemHealth: {
    aliExpressApi: boolean;
    gemini: boolean;
    supabase: boolean;
    databaseMode: string;
  };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<LiveStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>("");

  const fetchLiveStats = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/live-stats", {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setStats(data);
        setLastUpdatedTime(new Date().toLocaleTimeString("he-IL"));
      }
    } catch (err) {
      console.error("Failed to fetch live stats:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLiveStats();
    // Auto-refresh every 30 seconds for live counters
    const interval = setInterval(fetchLiveStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const subIdLabels: Record<string, { label: string; description: string }> = {
    top5_card: { label: "כרטיס טבלת TOP 5", description: "הקלקות מתוך עמודי השוואת מוצרים" },
    product_review_cta: { label: "כפתור סקירה ראשי", description: "רכישות דרך עמוד סקירת מוצר מעמיקה" },
    live_search_result: { label: "חיפוש חי באתר", description: "קליקים מתוצאות חיפוש אלי אקספרס לגולשים" },
    cross_sell_item: { label: "מוצר משלים (בודד)", description: "רכישת פריט מתוך נרכשים יחד" },
    cross_sell_bundle: { label: "חבילה משולבת מלאה", description: "לחיצה על 'קנה את כל החבילה'" },
    popup_featured: { label: "פופ-אפ עזיבה (Exit Intent)", description: "המרת גולשים נוטשים" },
    category_grid: { label: "גריד קטגוריות ראשי", description: "גלישה ורכישה מתוך עמודי קטלוג" },
  };

  return (
    <AdminAuthGate>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row">
        <AdminSidebar activeTab="dashboard" />

        <main className="flex-1 p-6 md:p-10 space-y-8 overflow-y-auto">
          {/* Top Bar with Live Refresh */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-ali-500 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span>מונים חכמים ודאטה חיה בזמן אמת (Zero Static Data)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">חמ&quot;ל ניהול ובקרה ראשי</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                כל הנתונים נשלפים ישירות ממסד הנתונים ומשירותי המעקב, ללא מספרים סטטיים או תגיות פיקטיביות.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {lastUpdatedTime && (
                <span className="text-xs text-slate-400 font-mono">
                  עודכן לאחרונה: {lastUpdatedTime}
                </span>
              )}

              <button
                type="button"
                onClick={fetchLiveStats}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                title="משיכת נתונים עדכניים מחדש"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-ali-500 ${isRefreshing ? "animate-spin" : ""}`} />
                <span>רענן נתונים</span>
              </button>

              <Link
                href="/admin/bulk-ingest"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-sm transition-all"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>הזנה מהירה</span>
              </Link>

              <Link
                href="/admin/ingest"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-500 text-white font-black text-xs shadow-md shadow-ali-600/20 transition-all"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>חיפוש ב-API</span>
              </Link>
            </div>
          </div>

          {/* System Health Monitor */}
          <div className="p-4 rounded-2xl bg-slate-800/80 border border-slate-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-ali-500" />
              <span className="text-xs font-bold text-slate-300">סטטוס שירותי מערכת חיים:</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">מסד נתונים:</span>
                <span className="font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-700">
                  {stats?.systemHealth.databaseMode || "טוען..."}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">AliExpress API:</span>
                {stats?.systemHealth.aliExpressApi ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> מחובר
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-rose-400 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" /> דרוש מפתח
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">סוכן רון & Gemini:</span>
                {stats?.systemHealth.gemini ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> מוכן לפעולה
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-bold">
                    <AlertCircle className="w-3.5 h-3.5" /> טמפלט חלופי
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Smart Counters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Products Card */}
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">מוצרים פעילים בקטלוג</span>
                <Package className="w-4 h-4 text-emerald-400" />
              </div>

              <div>
                <div className="text-3xl font-black text-white">
                  {stats?.products.active ?? "—"}
                  <span className="text-xs font-normal text-slate-400 mr-2">
                    מתוך {stats?.products.total ?? 0}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-amber-400">
                    <span>מוצרים ללא עמוד סקירה:</span>
                    <span className="font-bold">{stats?.products.withoutReview ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>עודכנו ב-7 ימים האחרונים:</span>
                    <span className="font-bold text-slate-300">{stats?.products.recentlyUpdated ?? 0}</span>
                  </div>
                  {stats && stats.products.inactive > 0 && (
                    <div className="flex items-center justify-between text-rose-400">
                      <span>מוצרים שהוסרו/מושבתים:</span>
                      <span className="font-bold">{stats.products.inactive}</span>
                    </div>
                  )}
                </div>
              </div>

              <Link
                href="/admin/products"
                className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>ניהול מאגר מוצרים</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Published Pages Card */}
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">עמודי תוכן מפורסמים</span>
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>

              <div>
                <div className="text-3xl font-black text-white">
                  {stats?.pages.published ?? "—"}
                  <span className="text-xs font-normal text-slate-400 mr-2">
                    מתוך {stats?.pages.total ?? 0}
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-indigo-300">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" /> סקירות עומק:
                    </span>
                    <span className="font-bold">{stats?.pages.reviews ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-300">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3" /> מדריכי TOP 5:
                    </span>
                    <span className="font-bold">{stats?.pages.top5 ?? 0}</span>
                  </div>
                  <div className="flex items-center justify-between text-indigo-300">
                    <span className="flex items-center gap-1">
                      <Flame className="w-3 h-3" /> עמודי דילים:
                    </span>
                    <span className="font-bold">{stats?.pages.deals ?? 0}</span>
                  </div>
                </div>
              </div>

              <Link
                href="/admin/pages"
                className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                <span>עריכת עמודים ופירסום</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* 301 Redirects & Zero 404s */}
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">הפניות 301 (בקרת SEO)</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>

              <div>
                <div className="text-3xl font-black text-white">
                  {stats?.redirects.active301 ?? "—"}
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-emerald-400 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>אפס עמודי 404 מובטח</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    כל עמוד שנמחק מופנה לצמיתות (301) לעמוד הבית להגנה על דירוגי גוגל.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/navigation"
                className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                <span>ניהול ניווט והפניות</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Coupons & Promotions */}
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 shadow-sm space-y-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-bold uppercase tracking-wider">קופונים ומבצעים</span>
                <Ticket className="w-4 h-4 text-amber-400" />
              </div>

              <div>
                <div className="text-3xl font-black text-white">
                  {stats?.coupons.active ?? "—"}
                  <span className="text-xs font-normal text-slate-400 mr-2">
                    פעילים ({stats?.coupons.total ?? 0} סה&quot;כ)
                  </span>
                </div>

                <div className="mt-2 space-y-1 text-xs">
                  <div className="flex items-center justify-between text-amber-400 font-bold">
                    <span>סה&quot;כ העתקות קוד:</span>
                    <span>{(stats?.coupons.totalClicks ?? 0).toLocaleString()}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed mt-1">
                    הקופונים מוצגים דינאמית בסקירות, בקטגוריות ובפופ-אפ עזיבה.
                  </p>
                </div>
              </div>

              <Link
                href="/admin/coupons"
                className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors"
              >
                <span>ניהול קופונים ומבצעים</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Section: SubIDs Affiliate Performance Breakdown */}
          <div className="p-6 rounded-3xl bg-slate-800/80 border border-slate-700 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-4">
              <div>
                <div className="flex items-center gap-2 text-ali-500 text-xs font-bold uppercase tracking-wider">
                  <MousePointerClick className="w-4 h-4" />
                  מעקב המרות ומונטיזציה
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mt-1">
                  פילוח הקלקות ויציאות לאלי אקספרס לפי SubIDs (חי)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">סך הקלקות מתועדות:</span>
                <span className="text-base font-black text-white bg-slate-900 px-3 py-1 rounded-xl border border-slate-700">
                  {(stats?.subIds.totalClicks ?? 0).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(subIdLabels).map(([subIdKey, meta]) => {
                const count = stats?.subIds.breakdown[subIdKey] || 0;
                const total = stats?.subIds.totalClicks || 1;
                const percent = Math.min(100, Math.round((count / (total === 0 ? 1 : total)) * 100));

                return (
                  <div
                    key={subIdKey}
                    className="p-4 rounded-2xl bg-slate-900/80 border border-slate-700/70 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-ali-400 bg-ali-500/10 px-2 py-0.5 rounded">
                          {subIdKey}
                        </span>
                        <span className="text-sm font-black text-white">{count.toLocaleString()} קליקים</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-200 mt-2">{meta.label}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{meta.description}</p>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-ali-500 to-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 text-left block">{percent}% מכלל הקליקים</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick CMS Action Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/admin/navigation"
              className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-indigo-500 transition-all space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-indigo-400 transition-colors">
                ניהול תפריטים והירו
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                שליטה מלאה בכפתורי ה-Hero, דרופדאון TOP 5 וקישורים ראשיים ללא תלות בקוד סטטי.
              </p>
            </Link>

            <Link
              href="/admin/agent-team"
              className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-purple-500 transition-all space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <Bot className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors">
                חמ&quot;ל סוכני AI (אלון & רון)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                הפעלת לולאות סוכנים אוטונומיות למחקר שוק, ייצור סקירות וכתיבת קופי ישראלי ממיר.
              </p>
            </Link>

            <Link
              href="/admin/arbitrage"
              className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-amber-500 transition-all space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-amber-400 transition-colors">
                דוח ארביטראז&apos; ו-SubIDs
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                ניתוח רווחי עמלות לפי מיקום באנרים, פופ-אפים והמרות שבוצעו על ידי הגולשים.
              </p>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700 hover:border-ali-500 transition-all space-y-2 group"
            >
              <div className="w-10 h-10 rounded-xl bg-ali-500/20 text-ali-400 flex items-center justify-center font-bold group-hover:bg-ali-600 group-hover:text-white transition-colors">
                <ExternalLink className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white group-hover:text-ali-400 transition-colors">
                צפייה באתר הפעיל (Live)
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                בדיקת חוויית המשתמש באתר, מנוע החיפוש החי, מחשבון המכס וקישורי האפיליאציה.
              </p>
            </Link>
          </div>
        </main>
      </div>
    </AdminAuthGate>
  );
}
