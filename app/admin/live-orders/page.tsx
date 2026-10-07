"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShoppingCart,
  DollarSign,
  Sparkles,
  ExternalLink,
  Edit3,
  Check,
  TrendingUp,
  Package,
  Layers,
  Clock,
  Send,
  MousePointerClick,
  Percent,
  Calendar,
  Filter,
  BarChart2,
  PieChart,
  Trash2,
  X,
} from "lucide-react";

interface AffiliateOrderItem {
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
  articleGenerationStatus?: string;
  generatedPageId?: string;
  createdAt?: string;
}

interface AffiliateOrder {
  id?: string;
  orderNumber: string;
  orderStatus: string;
  paidAmountUsd: number;
  commissionAmountUsd: number;
  subId?: string;
  orderTime: string;
  items: AffiliateOrderItem[];
}

interface PendingReviewPage {
  id: string;
  slug: string;
  title: string;
  metaDescription?: string;
  pros?: string[];
  cons?: string[];
  archetype?: string;
  featuredImage?: string;
  status: string;
  createdAt?: string;
  alonRationale?: string;
  aliHealthCheck?: string;
}

interface MarketingStats {
  totalOrders: number;
  totalSalesUsd: number;
  totalCommissionUsd: number;
  totalCommissionIls: number;
  aovUsd: number;
  outboundClicks: number;
  rpcUsd: number;
  rpcIls: number;
  conversionRate: number;
  pendingApprovalCount: number;
  existingCatalogUpdatedCount: number;
  subIdStats: Record<string, { orders: number; salesUsd: number; commissionUsd: number }>;
}

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState<AffiliateOrder[]>([]);
  const [pendingPages, setPendingPages] = useState<PendingReviewPage[]>([]);
  const [stats, setStats] = useState<MarketingStats>({
    totalOrders: 0,
    totalSalesUsd: 0,
    totalCommissionUsd: 0,
    totalCommissionIls: 0,
    aovUsd: 0,
    outboundClicks: 0,
    rpcUsd: 0,
    rpcIls: 0,
    conversionRate: 0,
    pendingApprovalCount: 0,
    existingCatalogUpdatedCount: 0,
    subIdStats: {},
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Time range & status filters
  const [dashboardTimeRange, setDashboardTimeRange] = useState<"24h" | "7d" | "30d" | "month" | "all" | "custom">("all");
  const [syncDaysBack, setSyncDaysBack] = useState<number>(7);
  const [syncStatus, setSyncStatus] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [showCustomSync, setShowCustomSync] = useState(false);

  const [activeTab, setActiveTab] = useState<"queue" | "feed" | "channels">("queue");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [publishingSlugs, setPublishingSlugs] = useState<Record<string, boolean>>({});
  const [dismissingSlugs, setDismissingSlugs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadOrders(dashboardTimeRange);
  }, [dashboardTimeRange]);

  const loadOrders = async (range: string) => {
    try {
      setIsLoading(true);
      let url = `/api/affiliate/orders?timeRange=${range}&limit=2000`;
      if (range === "custom" && customStartDate) {
        url += `&startDate=${encodeURIComponent(customStartDate)}`;
        if (customEndDate) url += `&endDate=${encodeURIComponent(customEndDate)}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setPendingPages(data.pendingPages || []);
        setStats(data.stats || {
          totalOrders: 0,
          totalSalesUsd: 0,
          totalCommissionUsd: 0,
          totalCommissionIls: 0,
          aovUsd: 0,
          outboundClicks: 0,
          rpcUsd: 0,
          rpcIls: 0,
          conversionRate: 0,
          pendingApprovalCount: 0,
          existingCatalogUpdatedCount: 0,
          subIdStats: {},
        });
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerLiveSync = async (days: number, customStart?: string, customEnd?: string) => {
    try {
      setIsSyncing(true);
      setNotification(null);

      const payload: any = {};
      if (customStart) {
        payload.startTime = customStart;
        payload.endTime = customEnd || new Date().toISOString().replace("T", " ").slice(0, 19);
      } else {
        payload.daysBack = days;
      }
      if (syncStatus) {
        payload.status = syncStatus;
      }

      const res = await fetch("/api/affiliate/orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        setNotification({
          type: "success",
          message: result.message || "סנכרון הזמנות מול AliExpress API הושלם בהצלחה!",
        });
        await loadOrders(dashboardTimeRange);
      } else {
        setNotification({
          type: "error",
          message: result.error || "שגיאה במהלך סנכרון הזמנות מול AliExpress",
        });
      }
    } catch (err: any) {
      setNotification({
        type: "error",
        message: err.message || "שגיאת רשת בעת פנייה לשרת",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePublishPage = async (slug: string) => {
    try {
      setPublishingSlugs((prev) => ({ ...prev, [slug]: true }));
      const res = await fetch("/api/affiliate/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", slug }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: data.message || `הכתבה פורסמה בהצלחה באתר!`,
        });
        setPendingPages((prev) => prev.filter((p) => p.slug !== slug));
        setStats((prev) => ({
          ...prev,
          pendingApprovalCount: Math.max(0, prev.pendingApprovalCount - 1),
        }));
      } else {
        setNotification({ type: "error", message: data.error || "שגיאה בפרסום הכתבה" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "שגיאה בתקשורת" });
    } finally {
      setPublishingSlugs((prev) => ({ ...prev, [slug]: false }));
    }
  };

  const handleDismissPage = async (slug: string, title?: string, productId?: string) => {
    const displayTitle = title || slug;
    if (
      !window.confirm(
        `האם אתה בטוח שברצונך לדחות ולמחוק את טיוטת הכתבה "${displayTitle}"?\n\nפעולה זו תמחק לצמיתות את העמוד ממסד הנתונים ותסמן את המוצר כמסונן כך שלא ייווצר שוב בסנכרונים הבאים.`
      )
    ) {
      return;
    }

    try {
      setDismissingSlugs((prev) => ({ ...prev, [slug]: true }));
      const res = await fetch("/api/affiliate/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "dismiss", slug, productId }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({
          type: "success",
          message: data.message || `טיוטת הכתבה נמחקה וסומנה כנדחית!`,
        });
        setPendingPages((prev) => prev.filter((p) => p.slug !== slug));
        setStats((prev) => ({
          ...prev,
          pendingApprovalCount: Math.max(0, prev.pendingApprovalCount - 1),
        }));
        await loadOrders(dashboardTimeRange);
      } else {
        setNotification({ type: "error", message: data.error || "שגיאה במחיקת הכתבה" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "שגיאה בתקשורת מול השרת" });
    } finally {
      setDismissingSlugs((prev) => ({ ...prev, [slug]: false }));
    }
  };

  const [isPublishingAll, setIsPublishingAll] = useState(false);

  const handlePublishAllPages = async () => {
    if (!pendingPages.length) return;
    if (!window.confirm(`האם אתה בטוח שברצונך לאשר ולפרסם את כל ${pendingPages.length} הכתבות באתר בבת אחת?`)) {
      return;
    }

    setIsPublishingAll(true);
    let publishedCount = 0;
    for (const p of pendingPages) {
      try {
        const res = await fetch("/api/affiliate/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "publish", slug: p.slug }),
        });
        if (res.ok) publishedCount++;
      } catch {}
    }
    setIsPublishingAll(false);
    setNotification({
      type: "success",
      message: `🎉 פורסמו בהצלחה ${publishedCount} מתוך ${pendingPages.length} כתבות באתר!`,
    });
    await loadOrders(dashboardTimeRange);
  };

  const handleDismissOrderItem = async (
    orderItemId?: string,
    orderNumber?: string,
    productId?: string,
    generatedPageId?: string
  ) => {
    if (!window.confirm("האם אתה בטוח שברצונך לדחות הזמנה זו? המערכת תסנן מוצר זה ולא תייצר עבורו כתבה בסנכרונים הבאים.")) {
      return;
    }
    try {
      const res = await fetch("/api/affiliate/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          orderItemId,
          orderNumber,
          productId,
          slug: generatedPageId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNotification({ type: "success", message: data.message || "ההזמנה נדחתה בהצלחה!" });
        await loadOrders(dashboardTimeRange);
      } else {
        setNotification({ type: "error", message: data.error || "שגיאה בדחיית ההזמנה" });
      }
    } catch (err: any) {
      setNotification({ type: "error", message: err.message || "שגיאה בתקשורת" });
    }
  };

  return (
    <div className="space-y-6 bg-slate-950 text-slate-100 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl font-sans">
      {/* Page Title & Main Sync Control */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
              <Activity className="w-6 h-6 animate-pulse" />
            </span>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                דאשבורד מכירות אפיליאייט וסנכרון בלייב
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                ניהול ומשיכת עסקאות מ-AliExpress API, ניתוח מטריקות שיווקיות (RPC, AOV, CR) ותור אישור תוכן.
              </p>
            </div>
          </div>
        </div>

        {/* Sync Controls Panel */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-800 p-2 rounded-2xl">
          <div className="text-xs text-slate-400 font-medium px-2 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
            <span>סנכרון מ-API:</span>
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={syncStatus}
            onChange={(e) => setSyncStatus(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 focus:border-emerald-500 outline-none cursor-pointer font-medium"
            title="בחר סטטוס הזמנות למשיכה"
          >
            <option value="all">כל הסטטוסים (שולמו + סופיות)</option>
            <option value="Payment Completed">שולמו בלבד (Payment Completed)</option>
            <option value="Buyer Confirmed Receipt">סופיות בלבד (Buyer Confirmed Receipt)</option>
          </select>

          <button
            onClick={() => triggerLiveSync(1)}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            24 שעות
          </button>

          <button
            onClick={() => triggerLiveSync(3)}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            3 ימים
          </button>

          <button
            onClick={() => triggerLiveSync(7)}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            7 ימים
          </button>

          <button
            onClick={() => triggerLiveSync(14)}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            14 יום
          </button>

          <button
            onClick={() => triggerLiveSync(30)}
            disabled={isSyncing}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all disabled:opacity-50"
          >
            30 יום
          </button>

          <button
            onClick={() => setShowCustomSync(!showCustomSync)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium flex items-center gap-1 transition-all"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>מותאם</span>
          </button>
        </div>
      </div>

      {/* Custom Sync Date Picker Drawer */}
      {showCustomSync && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-4 flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">מתאריך:</span>
            <input
              type="text"
              placeholder="YYYY-MM-DD HH:mm:ss"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white w-44 font-mono text-xs focus:border-amber-400 outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">עד תאריך:</span>
            <input
              type="text"
              placeholder="YYYY-MM-DD HH:mm:ss"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white w-44 font-mono text-xs focus:border-amber-400 outline-none"
            />
          </div>
          <button
            onClick={() => triggerLiveSync(0, customStartDate, customEndDate)}
            disabled={isSyncing || !customStartDate}
            className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition-all disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>בצע סנכרון בטווח זה</span>
          </button>
        </div>
      )}

      {/* Notifications */}
      {notification && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between transition-all ${
            notification.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950/40 border-rose-500/40 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-3">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-xs opacity-70 hover:opacity-100 px-2 py-1">
            סגור
          </button>
        </div>
      )}

      {/* Dashboard Time Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-semibold">
          <Filter className="w-4 h-4 text-emerald-400" />
          <span>מסנן תצוגת דאשבורד (נתונים ב-DB):</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { key: "24h", label: "24 שעות" },
            { key: "7d", label: "7 ימים אחרונים" },
            { key: "30d", label: "30 יום" },
            { key: "month", label: "החודש הנוכחי" },
            { key: "all", label: "כל הזמן (מקסימום DB)" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setDashboardTimeRange(t.key as any)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                dashboardTimeRange === t.key
                  ? "bg-emerald-600 text-white font-bold shadow-md shadow-emerald-950/50"
                  : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rich Marketing KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Total Orders */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">סך הזמנות</span>
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
          <div className="text-[11px] text-slate-500 mt-1">עסקאות שנקלטו</div>
        </div>

        {/* Total Sales Volume */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">סך מכירות (USD)</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white">${stats.totalSalesUsd.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">נפח עסקאות בדולר</div>
        </div>

        {/* Estimated Commission USD / ILS */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">עמלה משוערת</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">${stats.totalCommissionUsd.toFixed(2)}</div>
          <div className="text-[11px] text-slate-400 mt-1 font-semibold">
            ≈ ₪{stats.totalCommissionIls.toFixed(1)}
          </div>
        </div>

        {/* RPC - Revenue Per Click */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm bg-gradient-to-b from-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">RPC (הכנסה לקליק)</span>
            <BarChart2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300">${stats.rpcUsd.toFixed(3)}</div>
          <div className="text-[11px] text-emerald-400 mt-1 font-semibold">
            ₪{stats.rpcIls.toFixed(2)} לקליק
          </div>
        </div>

        {/* AOV - Average Order Value */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">AOV (שווי הזמנה)</span>
            <DollarSign className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-300">${stats.aovUsd.toFixed(2)}</div>
          <div className="text-[11px] text-slate-500 mt-1">ממוצע לעסקה</div>
        </div>

        {/* CR - Conversion Rate & Outbound Clicks */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">CR (יחס המרה)</span>
            <Percent className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-300">{stats.conversionRate.toFixed(1)}%</div>
          <div className="text-[11px] text-slate-500 mt-1">מתוך {stats.outboundClicks} קליקים</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-6 pt-2">
        <button
          onClick={() => setActiveTab("queue")}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "queue" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>תור אישור כתבות חדשות</span>
          {pendingPages.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30">
              {pendingPages.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("feed")}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "feed" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>יומן הזמנות מפורט ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("channels")}
          className={`pb-3 text-sm font-semibold transition-all relative flex items-center gap-2 ${
            activeTab === "channels" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:text-white"
          }`}
        >
          <PieChart className="w-4 h-4" />
          <span>פילוח ביצועים לפי SubID</span>
        </button>
      </div>

      {/* TAB 1: Approval Queue */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {pendingPages.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400/50 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">אין כתבות חדשות הממתינות לאישור</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                כל הכתבות שנוצרו ממכירות כבר פורסמו באתר, או שכל המכירות האחרונות היו של מוצרים שכבר קיימים בקטלוג.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900 border border-purple-500/30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      תור אישור כתבות יומי ({pendingPages.length} כתבות ממתינות לאישורך)
                    </h3>
                    <p className="text-xs text-slate-400">
                      כתבות מבוססות רדאר שוק לילי של אלון וסנכרון הזמנות לייב. כוללות נימוק אלון ובדיקת תקינות משיכה.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handlePublishAllPages}
                  disabled={isPublishingAll}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 flex items-center gap-2 transition-all disabled:opacity-50 self-end sm:self-auto shrink-0"
                >
                  <Send className={`w-4 h-4 ${isPublishingAll ? "animate-spin" : ""}`} />
                  <span>{isPublishingAll ? "מפרסם..." : `אשר ופרסם את כל ה-${pendingPages.length} בבת אחת`}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingPages.map((page) => (
                <div
                  key={page.id || page.slug}
                  className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                        {page.archetype || "GENERAL"}
                      </span>
                      <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-bold">
                        טיוטה (ממתין לאישור)
                      </span>
                    </div>

                    <div className="flex gap-4">
                      {page.featuredImage ? (
                        <img
                          src={page.featuredImage}
                          alt={page.title}
                          className="w-24 h-24 rounded-xl object-cover shrink-0 border border-slate-800 bg-slate-950"
                        />
                      ) : (
                        <div className="w-24 h-24 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                          <Package className="w-8 h-8 text-slate-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-white text-base leading-snug line-clamp-2">
                          {page.title}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                          {page.metaDescription}
                        </p>

                        {/* Alon Selection Rationale */}
                        {page.alonRationale && (
                          <div className="mt-2.5 p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-xs">
                            <div className="flex items-center gap-1.5 font-bold text-indigo-400 text-[11px] mb-0.5">
                              <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />
                              <span>נימוק הבחירה של אלון:</span>
                            </div>
                            <p className="leading-relaxed text-[11px] text-slate-300">
                              {page.alonRationale}
                            </p>
                          </div>
                        )}

                        {/* AliExpress Extraction Health Check */}
                        {page.aliHealthCheck && (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                            {(() => {
                              try {
                                const hc = typeof page.aliHealthCheck === "string" ? JSON.parse(page.aliHealthCheck) : page.aliHealthCheck;
                                return (
                                  <>
                                    <span className={`px-2 py-0.5 rounded-md font-bold border flex items-center gap-1 ${
                                      hc.overallStatus === "healthy"
                                        ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                                        : "bg-amber-950/60 text-amber-400 border-amber-500/40"
                                    }`}>
                                      <span>🩺 {hc.statusBadgeHe || "משיכה תקינה"}</span>
                                    </span>
                                    {hc.sellerPositiveRate && (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                        חנות: {hc.sellerPositiveRate}
                                      </span>
                                    )}
                                    {hc.specsCount > 0 && (
                                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                                        {hc.specsCount} מפרטים
                                      </span>
                                    )}
                                    {hc.hasEuPlug && (
                                      <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-400 border border-blue-500/40">
                                        שקע EU מאומת
                                      </span>
                                    )}
                                  </>
                                );
                              } catch {
                                return null;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {(page.pros?.length || page.cons?.length) ? (
                      <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1.5 text-xs">
                        {page.pros?.slice(0, 2).map((pro, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-emerald-400 line-clamp-1">
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>{pro}</span>
                          </div>
                        ))}
                        {page.cons?.slice(0, 1).map((con, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-amber-400 line-clamp-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <span>{con}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/reviews/${page.slug}`}
                        target="_blank"
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        תצוגה מקדימה
                      </Link>
                      <Link
                        href={`/admin/pages`}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        עריכה
                      </Link>
                      <button
                        onClick={() => handleDismissPage(page.slug, page.title)}
                        disabled={dismissingSlugs[page.slug] || publishingSlugs[page.slug]}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50"
                        title="דחה ומחק טיוטה לצמיתות ממסד הנתונים"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>{dismissingSlugs[page.slug] ? "מוחק..." : "דחה ומחק"}</span>
                      </button>
                    </div>

                    <button
                      onClick={() => handlePublishPage(page.slug)}
                      disabled={publishingSlugs[page.slug] || dismissingSlugs[page.slug]}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/50 flex items-center gap-1.5 transition-all disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{publishingSlugs[page.slug] ? "מפרסם..." : "1-Click פרסם באתר"}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Live Order Feed */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center">
              <ShoppingCart className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-white">לא נמצאו הזמנות בטווח הנבחר</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                שנה את מסנן הזמן בראש העמוד או בצע סנכרון חדש מ-AliExpress API.
              </p>
            </div>
          ) : (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs font-semibold">
                    <tr>
                      <th className="py-3 px-4">מספר הזמנה ותאריך</th>
                      <th className="py-3 px-4">מוצרים בעסקה</th>
                      <th className="py-3 px-4">סכום שולם</th>
                      <th className="py-3 px-4">עמלה משוערת</th>
                      <th className="py-3 px-4">Sub ID (ערוץ)</th>
                      <th className="py-3 px-4">סטטוס קליטה וכתבה</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {orders.map((ord) => (
                      <tr key={ord.id || ord.orderNumber} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-4 px-4 font-mono text-xs">
                          <div className="text-white font-bold">{ord.orderNumber}</div>
                          <div className="text-slate-500 text-[11px] mt-0.5">
                            {ord.orderTime ? new Date(ord.orderTime).toLocaleString("he-IL") : "N/A"}
                          </div>
                        </td>

                        <td className="py-4 px-4 max-w-xs">
                          <div className="space-y-2">
                            {ord.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                {it.productImageUrl ? (
                                  <img
                                    src={it.productImageUrl}
                                    alt={it.productTitle}
                                    className="w-8 h-8 rounded-lg object-cover bg-slate-950 border border-slate-800 shrink-0"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-lg bg-slate-800 shrink-0" />
                                )}
                                <div className="truncate text-xs text-slate-200" title={it.productTitle}>
                                  <span className="text-slate-400 ml-1">x{it.productCount}</span>
                                  {it.productTitle}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>

                        <td className="py-4 px-4 font-semibold text-white">
                          ${ord.paidAmountUsd.toFixed(2)}
                        </td>

                        <td className="py-4 px-4 font-semibold text-emerald-400">
                          ${ord.commissionAmountUsd.toFixed(2)}
                        </td>

                        <td className="py-4 px-4 text-xs font-mono text-slate-400">
                          {ord.subId ? (
                            <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                              {ord.subId}
                            </span>
                          ) : (
                            <span className="text-slate-600">direct</span>
                          )}
                        </td>

                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            {ord.items?.map((it, idx) => {
                              if (it.articleGenerationStatus === "already_exists") {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-300 border border-blue-500/20"
                                  >
                                    <Check className="w-3 h-3 text-blue-400" />
                                    מוצר קיים בקטלוג
                                  </span>
                                );
                              }
                              if (it.articleGenerationStatus === "completed") {
                                return (
                                  <div key={idx} className="flex items-center gap-1.5">
                                    <Link
                                      href={it.generatedPageId ? `/reviews/${it.generatedPageId}` : "#"}
                                      target="_blank"
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 transition-colors"
                                      title="פתח תצוגה מקדימה של הכתבה בטאב חדש"
                                    >
                                      <Sparkles className="w-3 h-3 text-emerald-400" />
                                      <span>סקירה מוכנה בטיוטה</span>
                                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                    </Link>
                                    <button
                                      onClick={() => handleDismissOrderItem(it.id, ord.orderNumber, it.productId, it.generatedPageId)}
                                      className="p-1 rounded-full hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                                      title="דחה טיוטה זו ומנע יצירה עתידית"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                );
                              }
                              if (it.articleGenerationStatus === "dismissed") {
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/10 text-slate-400 border border-slate-500/20"
                                  >
                                    <X className="w-3 h-3 text-slate-400" />
                                    טיוטה נדחתה
                                  </span>
                                );
                              }
                              return (
                                <div key={idx} className="flex items-center gap-1.5">
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                  >
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    {it.articleGenerationStatus || "נקלט"}
                                  </span>
                                  <button
                                    onClick={() => handleDismissOrderItem(it.id, ord.orderNumber, it.productId, it.generatedPageId)}
                                    className="p-1 rounded-full hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                                    title="דחה הזמנה זו ומנע יצירת כתבה"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Channel Performance (SubID Breakdown) */}
      {activeTab === "channels" && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6">
          <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-emerald-400" />
            <span>פילוח ביצועים ורווחיות לפי ערוצי תנועה (SubID)</span>
          </h3>

          {Object.keys(stats.subIdStats).length === 0 ? (
            <p className="text-sm text-slate-400">אין מספיק נתונים לפילוח בטווח הזמן הזה.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-xs font-semibold">
                  <tr>
                    <th className="py-3 px-4">ערוץ / SubID</th>
                    <th className="py-3 px-4">כמות הזמנות</th>
                    <th className="py-3 px-4">סך מכירות (USD)</th>
                    <th className="py-3 px-4">עמלה שנצברה (USD)</th>
                    <th className="py-3 px-4">עמלה משוערת (ILS)</th>
                    <th className="py-3 px-4">שווי הזמנה ממוצע (AOV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {Object.entries(stats.subIdStats).map(([subId, data]) => {
                    const aov = data.orders > 0 ? data.salesUsd / data.orders : 0;
                    return (
                      <tr key={subId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-white">
                          <span className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-emerald-400">
                            {subId}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-200">{data.orders}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">${data.salesUsd.toFixed(2)}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-400">${data.commissionUsd.toFixed(2)}</td>
                        <td className="py-3.5 px-4 font-semibold text-emerald-300">₪{(data.commissionUsd * 3.65).toFixed(1)}</td>
                        <td className="py-3.5 px-4 font-semibold text-cyan-300">${aov.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
