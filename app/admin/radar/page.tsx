"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  Layers,
  ArrowRight,
  ShieldCheck,
  Zap,
  Tag,
  DollarSign,
  Package,
  TrendingUp,
  Cpu,
  Check,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";
import { RadarCandidateProduct, ISRAELI_DEMAND_NICHES, IsraeliNicheConfig } from "@/lib/agent/alon-radar-types";

export default function MarketRadarPage() {
  const [activeTab, setActiveTab] = useState<"niches" | "search" | "direct">("niches");
  const [selectedNiche, setSelectedNiche] = useState<string>(ISRAELI_DEMAND_NICHES[0].keyword);
  const [searchQuery, setSearchQuery] = useState("");
  const [directUrl, setDirectUrl] = useState("");

  // Advanced Filtering & Pool Controls
  const [minOrders, setMinOrders] = useState<number>(100);
  const [minRating, setMinRating] = useState<number>(4.5);
  const [poolSize, setPoolSize] = useState<number>(50);
  const [theme, setTheme] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("LAST_VOLUME_DESC");
  const [maxPrice, setMaxPrice] = useState<number>(75);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(true);

  const [candidates, setCandidates] = useState<RadarCandidateProduct[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAutoRadarRunning, setIsAutoRadarRunning] = useState(false);
  const [expandedRationaleIds, setExpandedRationaleIds] = useState<string[]>([]);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Auto-search default niche on initial load
  useEffect(() => {
    handleSearch({ nicheKeyword: ISRAELI_DEMAND_NICHES[0].keyword });
  }, []);

  const handleSearch = async (params: {
    nicheKeyword?: string;
    query?: string;
    urlOrId?: string;
    overrideMinOrders?: number;
    overrideMinRating?: number;
    overridePoolSize?: number;
    overrideTheme?: string;
    overrideSortBy?: string;
    overrideMaxPrice?: number;
  } = {}) => {
    setIsSearching(true);
    setFeedback(null);
    setCandidates([]);
    setSelectedIds([]);

    const activeNiche =
      params.nicheKeyword !== undefined
        ? params.nicheKeyword
        : activeTab === "niches"
        ? selectedNiche
        : undefined;

    const activeQuery =
      params.query !== undefined
        ? params.query
        : activeTab === "search"
        ? searchQuery.trim()
        : undefined;

    const activeUrl =
      params.urlOrId !== undefined
        ? params.urlOrId
        : activeTab === "direct"
        ? directUrl.trim()
        : undefined;

    const effectiveOrders = params.overrideMinOrders !== undefined ? params.overrideMinOrders : minOrders;
    const effectiveRating = params.overrideMinRating !== undefined ? params.overrideMinRating : minRating;
    const effectivePool = params.overridePoolSize !== undefined ? params.overridePoolSize : poolSize;
    const effectiveTheme = params.overrideTheme !== undefined ? params.overrideTheme : theme;
    const effectiveSort = params.overrideSortBy !== undefined ? params.overrideSortBy : sortBy;
    const effectiveMaxPrice = params.overrideMaxPrice !== undefined ? params.overrideMaxPrice : maxPrice;

    try {
      const res = await fetch("/api/agent/radar/search", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          nicheKeyword: activeNiche,
          query: activeQuery,
          urlOrId: activeUrl,
          minOrders: effectiveOrders,
          minRating: effectiveRating,
          pageSize: effectivePool,
          theme: effectiveTheme !== "all" ? effectiveTheme : undefined,
          sortBy: effectiveSort,
          maxPrice: effectiveMaxPrice,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "חיפוש הרדאר נכשל");
      }

      setCandidates(data.candidates || []);
      if (data.notice) {
        setFeedback({
          type: "info",
          message: data.notice,
        });
      }
      if (data.candidates && data.candidates.length > 0) {
        // Pre-select allowed (green) candidates by default
        const greenIds = data.candidates
          .filter((c: RadarCandidateProduct) => c.collision?.isAllowed)
          .slice(0, 4)
          .map((c: RadarCandidateProduct) => c.product.aliId);
        setSelectedIds(greenIds);
      } else {
        setFeedback({
          type: "info",
          message: data.message || "לא נמצאו תוצאות התואמות את החיפוש והסינונים הנוכחיים. נסה להרחיב את הדירוג/ההזמנות או לבחור נישה אחרת.",
        });
      }
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "שגיאה בחיבור לשרת הרדאר",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleSelect = (aliId: string) => {
    setSelectedIds((prev) =>
      prev.includes(aliId) ? prev.filter((id) => id !== aliId) : [...prev, aliId]
    );
  };

  const handleSelectAllAllowed = () => {
    const allowedIds = candidates
      .filter((c) => c.collision.isAllowed)
      .map((c) => c.product.aliId);
    setSelectedIds(allowedIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const toggleRationaleExpand = (aliId: string) => {
    setExpandedRationaleIds((prev) =>
      prev.includes(aliId) ? prev.filter((id) => id !== aliId) : [...prev, aliId]
    );
  };

  // Generate drafts for selected items
  const handleGenerateSelected = async () => {
    if (selectedIds.length === 0) return;

    const chosenCandidates = candidates.filter((c) => selectedIds.includes(c.product.aliId));
    setIsGenerating(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/agent/radar/generate", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ candidates: chosenCandidates }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "הפקת הכתבות נכשלה");
      }

      setFeedback({
        type: "success",
        message: `🎉 הצלחה! נוצרו ${data.successCount} כתבות חדשות בהצלחה. הן ממתינות כעת לאישורך בתור הניהול.`,
      });

      // Remove generated items from candidate list or unselect
      setSelectedIds([]);
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "שגיאה בהפקת הכתבות",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Trigger Full 8-Article Autonomous Morning Radar
  const handleRunAutonomousMorningRadar = async () => {
    if (!confirm("להפעיל כעת סריקה מלאה של רדאר הבוקר להפקת 8 כתבות חדשות לאישור? פעולה זו תיקח כ-2 דקות.")) {
      return;
    }

    setIsAutoRadarRunning(true);
    setFeedback({
      type: "info",
      message: "⏳ אלון סורק כעת 12 נישות ביקוש ישראליות, מבצע בדיקות כפילות ומפיק 8 כתבות חדשות עם רון ומיה...",
    });

    try {
      const res = await fetch("/api/agent/autonomous-batch", {
        method: "POST",
        headers: getAdminHeaders(),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "הרדאר האוטונומי נכשל");
      }

      setFeedback({
        type: "success",
        message: `🎉 רדאר הבוקר הושלם בהצלחה! הופקו ${data.generatedCount} כתבות חדשות וממתינות כעת לאישורך בעמוד 'הזמנות בלייב ותור אישור'.`,
      });
    } catch (err: any) {
      setFeedback({
        type: "error",
        message: err.message || "שגיאה בהפעלת רדאר הבוקר",
      });
    } finally {
      setIsAutoRadarRunning(false);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header & Overview */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-xl text-white">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-600/30">
              <Compass className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                רדאר שוק חכם וצ'רי-פיקינג (Human-In-The-Loop)
                <span className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  אלון 2.0
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                חקר ביקושים באלי אקספרס, מניעת כפילויות מבוססת אלגוריתם והפקת כתבות מלאות (רון + מיה) בפיקוח עורך.
              </p>
            </div>
          </div>
        </div>

        {/* Global Fast Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRunAutonomousMorningRadar}
            disabled={isAutoRadarRunning}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-500 hover:to-ali-400 text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-ali-600/30 transition-all disabled:opacity-50"
          >
            {isAutoRadarRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>מפיק 8 כתבות בוקר...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>הפעל רדאר בוקר עכשיו (8 כתבות)</span>
              </>
            )}
          </button>

          <Link
            href="/admin/live-orders"
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-bold rounded-xl border border-slate-700 transition-all"
          >
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>תור אישור טיוטות ב-CMS</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 border text-sm font-medium ${
            feedback.type === "success"
              ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
              : feedback.type === "error"
              ? "bg-rose-950/60 border-rose-800/80 text-rose-300"
              : "bg-sky-950/60 border-sky-800/80 text-sky-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : feedback.type === "error" ? (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          ) : (
            <RefreshCw className="w-5 h-5 shrink-0 animate-spin text-sky-400" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs underline hover:no-underline opacity-70"
          >
            סגור
          </button>
        </div>
      )}

      {/* Navigation Modes & Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-4">
          <button
            onClick={() => setActiveTab("niches")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "niches"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>12 נישות ביקוש ישראליות</span>
          </button>

          <button
            onClick={() => setActiveTab("search")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "search"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <Search className="w-4 h-4" />
            <span>חיפוש חופשי ב-AliExpress API</span>
          </button>

          <button
            onClick={() => setActiveTab("direct")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              activeTab === "direct"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <ExternalLink className="w-4 h-4" />
            <span>בדיקת קישור או מזהה ישיר (URL / ID)</span>
          </button>
        </div>

        {/* Tab 1: 12 Israeli Demand Niches */}
        {activeTab === "niches" && (
          <div className="space-y-3">
            <p className="text-xs text-slate-400">
              בחר נישת ביקוש לחקירה. אלון יסרוק מוצרים מובילים באלי אקספרס ויסנן אותם לפי רף מכס (עד $75), מעל 100 הזמנות ודירוג 4.7+:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {ISRAELI_DEMAND_NICHES.map((niche) => {
                const isSelected = selectedNiche === niche.keyword;
                return (
                  <button
                    key={niche.keyword}
                    onClick={() => {
                      setSelectedNiche(niche.keyword);
                      handleSearch({ nicheKeyword: niche.keyword });
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl border text-right transition-all text-xs font-semibold ${
                      isSelected
                        ? "bg-purple-950/70 border-purple-500 text-white shadow-md shadow-purple-900/40"
                        : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                    }`}
                  >
                    <span>{niche.labelHe}</span>
                    {isSelected && <Check className="w-4 h-4 text-purple-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Free Search */}
        {activeTab === "search" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (searchQuery.trim()) {
                handleSearch({ query: searchQuery.trim() });
              }
            }}
            className="flex flex-col sm:flex-row gap-3 items-center"
          >
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="למשל: אוזניות ספורט עמידות במים, שואב שוטף, רחפן למתחילים..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>סרוק מוצרים</span>
            </button>
          </form>
        )}

        {/* Tab 3: Direct Link or ID */}
        {activeTab === "direct" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (directUrl.trim()) {
                handleSearch({ urlOrId: directUrl.trim() });
              }
            }}
            className="flex flex-col sm:flex-row gap-3 items-center"
          >
            <div className="relative flex-1 w-full">
              <ExternalLink className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
              <input
                type="text"
                value={directUrl}
                onChange={(e) => setDirectUrl(e.target.value)}
                placeholder="הדבק קישור ישיר למוצר מ-AliExpress או מזהה מוצר (Item ID)..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pr-10 pl-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono text-xs sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !directUrl.trim()}
              className="w-full sm:w-auto px-6 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 shrink-0"
            >
              {isSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>בדוק והכן מועמד</span>
            </button>
          </form>
        )}
      </div>

      {/* Advanced API Search & Quality Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-purple-500/20 text-purple-400 rounded-lg">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                סינון איכות ומאגר מוצרים (API Pull Filters & Pool Size)
              </h3>
              <p className="text-xs text-slate-400">
                הגדרת רף איכות מחמיר (100+ הזמנות, 4.5★+), תמות מובילות וגודל מאגר עד 80-100 פריטים
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
          >
            <span>{showAdvancedFilters ? "הסתר סינונים" : "הצג סינונים"}</span>
            {showAdvancedFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showAdvancedFilters && (
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3 text-xs">
              {/* Max Price & Customs Tier */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">תקרת מחיר ורף מכס:</label>
                <select
                  value={maxPrice}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 75;
                    setMaxPrice(val);
                    handleSearch({ overrideMaxPrice: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="75">🛡️ עד $75 (פטור מלא ממכס ומע&quot;מ)</option>
                  <option value="270">💎 עד 999 ₪ / $270 (פרימיום שווה)</option>
                  <option value="50">⚡ עד $50 (טווח בטוח)</option>
                  <option value="25">💸 עד $25 (מציאות תקציב)</option>
                </select>
              </div>

              {/* Theme Preset */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">תמה / סגנון (Theme):</label>
                <select
                  value={theme}
                  onChange={(e) => {
                    const newTheme = e.target.value;
                    setTheme(newTheme);
                    handleSearch({ overrideTheme: newTheme });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="all">🌐 הכל (ללא הגבלת תמה)</option>
                  <option value="hot_products">🔥 מוצרים חמים (Hot Products IL)</option>
                  <option value="top_sellers">🏆 רבי מכר (Top Sellers)</option>
                  <option value="top_rated">⭐ דירוג פרימיום (4.7★+)</option>
                  <option value="tax_free">🛡️ פטור מלא ממכס (&lt;$75)</option>
                  <option value="budget_deals">💸 מציאות תקציב (&lt;$25)</option>
                </select>
              </div>

              {/* Min Orders */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">מינימום הזמנות:</label>
                <select
                  value={minOrders}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 0;
                    setMinOrders(val);
                    handleSearch({ overrideMinOrders: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="100">🛒 100+ הזמנות (מומלץ)</option>
                  <option value="500">🔥 500+ הזמנות (פופולרי)</option>
                  <option value="1000">🚀 1,000+ הזמנות (בסטסלר)</option>
                  <option value="0">🔓 ללא רף הזמנות</option>
                </select>
              </div>

              {/* Min Rating */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">מינימום דירוג:</label>
                <select
                  value={minRating}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setMinRating(val);
                    handleSearch({ overrideMinRating: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="4.5">⭐ 4.5 כוכבים ומעלה (מומלץ)</option>
                  <option value="4.7">⭐⭐ 4.7 כוכבים ומעלה (פרימיום)</option>
                  <option value="4.0">⭐ 4.0 כוכבים ומעלה</option>
                  <option value="0">🔓 ללא רף דירוג</option>
                </select>
              </div>

              {/* Pool Size */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">גודל מאגר (Pool Size):</label>
                <select
                  value={poolSize}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 50;
                    setPoolSize(val);
                    handleSearch({ overridePoolSize: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="20">📦 20 מוצרים</option>
                  <option value="50">⚡ 50 מוצרים (ברירת מחדל מורחבת)</option>
                  <option value="80">🚀 80 מוצרים (פול מקסימלי)</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="space-y-1">
                <label className="font-bold text-slate-300">מיון תוצאות:</label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSortBy(val);
                    handleSearch({ overrideSortBy: val });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-700 bg-slate-800 text-xs font-semibold text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="LAST_VOLUME_DESC">🔥 כמות הזמנות (Volume)</option>
                  <option value="EVALUATE_RATE_DESC">⭐ דירוג גולשים (Rating)</option>
                  <option value="SALE_PRICE_ASC">💰 מחיר: נמוך לגבוה</option>
                  <option value="SALE_PRICE_DESC">💎 מחיר: גבוה לנמוך</option>
                </select>
              </div>

              {/* Apply / Refresh Button */}
              <div className="flex flex-col justify-end">
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={isSearching}
                  className="w-full py-2 px-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSearching ? "animate-spin" : ""}`} />
                  <span>החל סינונים ורענן</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Collision & Anti-Cannibalization Guide Pill Bar */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-slate-400">מקרא בדיקת כפילויות ובידול מול מאגר האתר (Central Catalog):</span>
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>🟢 מוצר חדש באתר (טרם נסקר בקטלוג)</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span>🟡 בידול מול מוצר קיים באתר (&gt;25% מחיר / מפרט)</span>
          </span>
          <span className="flex items-center gap-1.5 text-amber-300 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span>💎 פרימיום מעל 75$ (עד 999 ₪ – שווה במיוחד)</span>
          </span>
          <span className="flex items-center gap-1.5 text-rose-400 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>🔴 כפילות למוצר קיים באתר (אותו פריט / מחיר זהה)</span>
          </span>
        </div>

        {candidates.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAllAllowed}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors"
            >
              בחר הכל מאושרים (🟢+🟡)
            </button>
            <button
              onClick={handleClearSelection}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg text-xs transition-colors"
            >
              נקה בחירה
            </button>
          </div>
        )}
      </div>

      {/* Candidate Products Grid */}
      {isSearching ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto" />
          <p className="text-sm font-bold text-white">אלון סורק מוצרים ב-AliExpress ומחשב מדדי כפילות...</p>
          <p className="text-xs text-slate-400">בודק תאימות לישראל, תקינות קישורי שותפים ופרמטרים טכניים</p>
        </div>
      ) : candidates.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-2xl space-y-3">
          <Package className="w-8 h-8 text-slate-500 mx-auto" />
          <p className="text-sm font-bold text-slate-300">אין תוצאות להצגה כרגע</p>
          <p className="text-xs text-slate-500">בחר נישה מלמעלה או הזן קישור לבדיקה ישירה</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span>נמצאו {candidates.length} מוצרים מועמדים לרדאר</span>
            <span>נבחרו {selectedIds.length} מוצרים להפקה</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {candidates.map((cand) => {
              const { product, collision, alonRationale, healthCheck } = cand;
              const isSelected = selectedIds.includes(product.aliId);
              const isExpanded = expandedRationaleIds.includes(product.aliId);

              const statusBadgeColor =
                collision.statusColor === "green"
                  ? "bg-emerald-950/80 text-emerald-400 border-emerald-800/80"
                  : collision.statusColor === "yellow"
                  ? "bg-amber-950/80 text-amber-400 border-amber-800/80"
                  : "bg-rose-950/80 text-rose-400 border-rose-800/80";

              return (
                <div
                  key={product.aliId}
                  className={`bg-slate-900 border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 shadow-md ${
                    isSelected
                      ? "border-purple-500 ring-2 ring-purple-500/20 shadow-purple-900/20"
                      : "border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Checkbox, Collision Badge & Ali External Link */}
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(product.aliId)}
                          className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900 bg-slate-800 border-slate-700 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-white">בחר להפקה</span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border max-w-[280px] truncate ${
                            collision.statusColor === "green"
                              ? "bg-emerald-950/80 text-emerald-300 border-emerald-500/50"
                              : collision.statusColor === "yellow"
                              ? "bg-amber-950/80 text-amber-300 border-amber-500/50"
                              : "bg-rose-950/80 text-rose-300 border-rose-500/50"
                          }`}
                          title={collision.differentiationTag || collision.reasonHe}
                        >
                          {collision.differentiationTag || (
                            collision.isHighTierWorthIt
                              ? "💎 פרימיום (עד 999 ₪)"
                              : collision.statusColor === "green"
                              ? "🟢 מוצר חדש באתר"
                              : collision.statusColor === "yellow"
                              ? "🟡 בידול מול מוצר קיים באתר"
                              : "🔴 כפילות למוצר קיים באתר"
                          )}
                        </span>

                        <a
                          href={product.affiliateUrl || product.aliUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                          title="צפה במוצר באלי אקספרס"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    {/* Image & Price Info */}
                    <div className="flex gap-3">
                      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-800 shrink-0 border border-slate-700/80 relative">
                        {product.mainImage ? (
                          <img
                            src={product.mainImage}
                            alt={product.originalTitle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-600">
                            <Package className="w-6 h-6" />
                          </div>
                        )}
                        {product.discountPercent ? (
                          <span className="absolute top-1 left-1 bg-rose-600 text-white text-[9px] font-black px-1 rounded">
                            -{product.discountPercent}%
                          </span>
                        ) : null}
                      </div>

                      <div className="flex flex-col justify-between flex-1 min-w-0">
                        <p
                          className="text-xs font-bold text-slate-200 line-clamp-2"
                          title={product.originalTitle}
                        >
                          {product.originalTitle}
                        </p>

                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="text-base font-black text-emerald-400">
                            ${product.priceUsd}
                          </span>
                          <span className="text-xs text-slate-400">
                            (₪{product.priceIls})
                          </span>
                          {product.originalPriceUsd && product.originalPriceUsd > product.priceUsd ? (
                            <span className="text-[10px] text-slate-500 line-through">
                              ${product.originalPriceUsd}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                          <span>⭐ {product.rating}</span>
                          <span>•</span>
                          <span>📦 {product.ordersCount}+ נמכרו</span>
                          <span>•</span>
                          <span className="truncate">{product.storeName}</span>
                        </div>
                      </div>
                    </div>

                    {/* Central Catalog Comparison & Differentiation */}
                    <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70 text-[11px] text-slate-300 space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-300">
                          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>השוואה למאגר המוצרים הקיים באתר:</span>
                        </div>
                        {collision.diffPercent !== undefined && collision.diffPercent > 0 && (
                          <span
                            className={`text-[10px] font-black px-1.5 py-0.5 rounded border shrink-0 ${
                              collision.diffDirection === "cheaper"
                                ? "bg-emerald-950 text-emerald-300 border-emerald-700/50"
                                : "bg-indigo-950 text-indigo-300 border-indigo-700/50"
                            }`}
                          >
                            {collision.diffDirection === "cheaper"
                              ? `זול ב-${collision.diffPercent}%`
                              : `פער של ${collision.diffPercent}%`}
                          </span>
                        )}
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {collision.reasonHe}
                      </p>
                      {collision.competingProductTitle && (
                        <div className="pt-1.5 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
                          <span className="truncate max-w-[210px]" title={collision.competingProductTitle}>
                            הושווה מול מוצר באתר: <strong className="text-slate-200">{collision.competingProductTitle}</strong>
                          </span>
                          {collision.competingPriceIls ? (
                            <span className="text-emerald-400 font-semibold shrink-0">
                              מחיר באתר: ₪{collision.competingPriceIls} (${collision.competingPriceUsd})
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>

                    {/* Health Check Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span
                        className={`px-2 py-0.5 rounded border font-semibold ${
                          healthCheck.overallStatus === "healthy"
                            ? "bg-emerald-950/50 text-emerald-300 border-emerald-800/60"
                            : "bg-amber-950/50 text-amber-300 border-amber-800/60"
                        }`}
                      >
                        {healthCheck.statusBadgeHe}
                      </span>

                      {healthCheck.hasEuPlug !== null && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {healthCheck.hasEuPlug ? "🔌 תקע EU" : "🔌 תקע לא EU"}
                        </span>
                      )}

                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        🛡️ {healthCheck.sellerPositiveRate} חיובי
                      </span>
                    </div>

                    {/* Alon Rationale Accordion */}
                    <div className="border-t border-slate-800 pt-2">
                      <button
                        onClick={() => toggleRationaleExpand(product.aliId)}
                        className="w-full flex items-center justify-between text-[11px] font-bold text-purple-400 hover:text-purple-300"
                      >
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          <span>הנימוק של אלון לבחירת המוצר</span>
                        </span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="mt-2 p-2.5 rounded-lg bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-200 whitespace-pre-wrap leading-relaxed">
                          {alonRationale}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Fast 1-Click Generate Draft for Single Item */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-mono">
                      ID: {product.aliId}
                    </span>

                    <button
                      onClick={async () => {
                        setSelectedIds([product.aliId]);
                        setIsGenerating(true);
                        try {
                          const res = await fetch("/api/agent/radar/generate", {
                            method: "POST",
                            headers: getAdminHeaders(),
                            body: JSON.stringify({ candidates: [cand] }),
                          });
                          const d = await res.json();
                          if (d.success) {
                            setFeedback({
                              type: "success",
                              message: `הכתבה עבור "${product.originalTitle.slice(0, 30)}..." נוצרה וממתינה לאישורך ב-CMS!`,
                            });
                          }
                        } catch (e: any) {
                          setFeedback({ type: "error", message: e.message });
                        } finally {
                          setIsGenerating(false);
                        }
                      }}
                      disabled={isGenerating}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3 text-amber-300" />
                      <span>הפק כתבה</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sticky Bottom Action Bar when candidates are selected */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-4 left-4 right-4 md:left-8 md:right-8 lg:left-12 lg:right-12 bg-slate-900/95 backdrop-blur-md border border-purple-500/50 p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 z-30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                נבחרו {selectedIds.length} מוצרים מהרדאר להפקת כתבות
              </p>
              <p className="text-xs text-slate-400">
                צוות הסוכנים יפיק טיוטת כתבה מלאה, תמונת Gemini של מיה ובקרת איכות של עומר.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleGenerateSelected}
              disabled={isGenerating}
              className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-sm font-bold rounded-xl shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>מפיק טיוטות בצוות הסוכנים...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>הפק טיוטות ל-{selectedIds.length} המוצרים שנבחרו</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
