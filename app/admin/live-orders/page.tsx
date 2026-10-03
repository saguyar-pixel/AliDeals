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
  Zap,
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
}

export default function LiveOrdersPage() {
  const [orders, setOrders] = useState<AffiliateOrder[]>([]);
  const [pendingPages, setPendingPages] = useState<PendingReviewPage[]>([]);
  const [stats, setStats] = useState({
    totalOrders: 0,
    totalSalesUsd: 0,
    totalCommissionUsd: 0,
    pendingApprovalCount: 0,
    existingCatalogUpdatedCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [timeRange, setTimeRange] = useState<"24h" | "7d" | "30d">("24h");
  const [activeTab, setActiveTab] = useState<"queue" | "feed">("queue");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [publishingSlugs, setPublishingSlugs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/affiliate/orders");
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setPendingPages(data.pendingPages || []);
        setStats(data.stats || {
          totalOrders: 0,
          totalSalesUsd: 0,
          totalCommissionUsd: 0,
          pendingApprovalCount: 0,
          existingCatalogUpdatedCount: 0,
        });
      }
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerLiveSync = async () => {
    try {
      setIsSyncing(true);
      setNotification(null);

      const now = new Date();
      let startTimeDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (timeRange === "7d") startTimeDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (timeRange === "30d") startTimeDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const pad = (n: number) => n.toString().padStart(2, "0");
      const formatAliTime = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
          d.getMinutes()
        )}:${pad(d.getSeconds())}`;

      const res = await fetch("/api/affiliate/orders/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: formatAliTime(startTimeDate),
          endTime: formatAliTime(now),
        }),
      });

      const result = await res.json();

      if (result.success) {
        setNotification({
          type: "success",
          message: result.message || "סנכרון הזמנות מול AliExpress API הושלם בהצלחה!",
        });
        await loadOrders();
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
        // Remove from pending list
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

  return (
    <div className="space-y-6 bg-slate-950 text-slate-100 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-xl font-sans">
      {/* Page Title & Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 text-emerald-400 border border-emerald-500/30">
                <Activity className="w-6 h-6 animate-pulse" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                מכירות בלייב ותור אישור כתבות
              </h1>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              סנכרון בזמן אמת של עסקאות אפיליאייט מ-AliExpress API, עדכון מוני מכירות אוטומטי, וג&apos;ינרוט כתבות ב-Single-Pass.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Time range selector */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
              <button
                onClick={() => setTimeRange("24h")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === "24h" ? "bg-emerald-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                24 שעות אחרונות
              </button>
              <button
                onClick={() => setTimeRange("7d")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === "7d" ? "bg-emerald-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                7 ימים
              </button>
              <button
                onClick={() => setTimeRange("30d")}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  timeRange === "30d" ? "bg-emerald-600 text-white font-semibold" : "text-slate-400 hover:text-white"
                }`}
              >
                30 יום
              </button>
            </div>

            {/* Sync Button */}
            <button
              onClick={triggerLiveSync}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-950/50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "מושך הזמנות מ-AliExpress..." : "סנכרן הזמנות כעת מ-API"}</span>
            </button>
          </div>
        </div>

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
            <button
              onClick={() => setNotification(null)}
              className="text-xs opacity-70 hover:opacity-100 px-2 py-1"
            >
              סגור
            </button>
          </div>
        )}

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">הזמנות שנקלטו</span>
              <ShoppingCart className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.totalOrders}</div>
            <div className="text-[11px] text-slate-500 mt-1">עסקאות אמת בפורטל</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">סך מכירות (USD)</span>
              <DollarSign className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-bold text-white">${stats.totalSalesUsd.toFixed(2)}</div>
            <div className="text-[11px] text-slate-500 mt-1">נפח רכישות משתמשים</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">עמלות צפויות (USD)</span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">${stats.totalCommissionUsd.toFixed(2)}</div>
            <div className="text-[11px] text-slate-500 mt-1">רווח אפיליאייט משוער</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">ממתינים לאישור</span>
              <Sparkles className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-bold text-purple-300">{stats.pendingApprovalCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">סקירות חדשות בטיוטה</div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">מוצרים קיימים שעודכנו</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-cyan-300">{stats.existingCatalogUpdatedCount}</div>
            <div className="text-[11px] text-slate-500 mt-1">חיסכון קריאות AI (100%)</div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 gap-6">
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
            <span>יומן הזמנות בלייב מ-AliExpress</span>
            <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-400">
              {orders.length}
            </span>
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
                  כל הכתבות שנוצרו ממכירות כבר פורסמו באתר, או שכל המכירות האחרונות היו של מוצרים שכבר קיימים בקטלוג (מוני המכירות שלהם עודכנו).
                </p>
                <button
                  onClick={triggerLiveSync}
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  בדוק מכירות חדשות ב-API
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingPages.map((page) => (
                  <div
                    key={page.id || page.slug}
                    className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between transition-all"
                  >
                    <div>
                      {/* Top Bar with Archetype */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-purple-500/10 text-purple-300 border border-purple-500/20">
                          {page.archetype || "GENERAL"}
                        </span>
                        <span className="text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          טיוטה (ממתין לאישור)
                        </span>
                      </div>

                      {/* Header & Image */}
                      <div className="flex gap-4">
                        {page.featuredImage ? (
                          <img
                            src={page.featuredImage}
                            alt={page.title}
                            className="w-20 h-20 rounded-xl object-cover shrink-0 border border-slate-800 bg-slate-950"
                          />
                        ) : (
                          <div className="w-20 h-20 rounded-xl bg-slate-800 flex items-center justify-center shrink-0">
                            <Package className="w-8 h-8 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-bold text-white text-base leading-snug line-clamp-2">
                            {page.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {page.metaDescription}
                          </p>
                        </div>
                      </div>

                      {/* Pros & Cons Preview */}
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

                    {/* Actions */}
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
                          עריכה מלאה
                        </Link>
                      </div>

                      <button
                        onClick={() => handlePublishPage(page.slug)}
                        disabled={publishingSlugs[page.slug]}
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
                <h3 className="text-lg font-bold text-white">לא נמצאו הזמנות שמורות</h3>
                <p className="text-sm text-slate-400 mt-1 max-w-md mx-auto">
                  לחץ על כפתור &quot;סנכרן הזמנות כעת מ-API&quot; בראש העמוד כדי למשוך עסקאות מ-AliExpress Open Platform.
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
                              <span className="text-slate-600">-</span>
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
                                      מוצר קיים במערכת (עודכן מונה מכירות)
                                    </span>
                                  );
                                }
                                if (it.articleGenerationStatus === "completed") {
                                  return (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                                    >
                                      <Sparkles className="w-3 h-3 text-emerald-400" />
                                      הופקה סקירה חדשה (ממתין לאישור)
                                    </span>
                                  );
                                }
                                return (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20"
                                  >
                                    <Clock className="w-3 h-3 text-amber-400" />
                                    {it.articleGenerationStatus || "נקלט"}
                                  </span>
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
    </div>
  );
}
