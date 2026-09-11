"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  Search,
  Upload,
  Download,
  MousePointerClick,
  Eye,
  DollarSign,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Globe,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  Layers,
  ChevronRight,
  Info,
} from "lucide-react";

interface GscQueryItem {
  id: string;
  query: string;
  page?: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  importedAt: string;
}

interface Ga4PageItem {
  id: string;
  pagePath: string;
  pageTitle?: string;
  views: number;
  users: number;
  bounceRate?: number;
  importedAt: string;
}

interface ClickItem {
  id: string;
  timestamp: string;
  productId: string;
  productTitle: string;
  priceUsd: number;
  priceIls: number;
  pageSlug: string;
  linkType: string;
  destinationUrl: string;
}

interface ConversionItem {
  id: string;
  orderId: string;
  subId?: string;
  productId?: string;
  productTitle?: string;
  orderAmountUsd: number;
  commissionUsd: number;
  commissionIls: number;
  status: "approved" | "pending" | "rejected";
  source: string;
  timestamp: string;
}

interface AnalyticsData {
  settings: {
    gaMeasurementId?: string;
    siteUrl?: string;
  };
  summary: {
    totalViews: number;
    totalOutboundClicks: number;
    averageCtrPercent: number;
    dailyRevenueEstimateUsd: number;
    dailyRevenueTargetUsd: number;
    progressToGoalPercent: number;
    isRealData: boolean;
    s2sConversionsCount?: number;
    actualRevenueUsd?: number;
    actualRevenueIls?: number;
    recommendations: Array<{
      id: string;
      pageTitle: string;
      issueHe: string;
      recommendationHe: string;
      expectedRpmBoost: string;
    }>;
  };
  recentClicks: ClickItem[];
  gscQueries: GscQueryItem[];
  ga4Stats: Ga4PageItem[];
  conversions?: ConversionItem[];
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "gsc" | "ga4" | "clicks" | "s2s">("overview");

  // GA4 Measurement ID Form
  const [gaIdInput, setGaIdInput] = useState("");
  const [isSavingGaId, setIsSavingGaId] = useState(false);
  const [gaSaveMsg, setGaSaveMsg] = useState<string | null>(null);

  // GSC Import State
  const [gscCsvText, setGscCsvText] = useState("");
  const [isImportingGsc, setIsImportingGsc] = useState(false);
  const [gscImportMsg, setGscImportMsg] = useState<string | null>(null);

  // GA4 Import State
  const [ga4CsvText, setGa4CsvText] = useState("");
  const [isImportingGa4, setIsImportingGa4] = useState(false);
  const [ga4ImportMsg, setGa4ImportMsg] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch("/api/analytics");
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.settings?.gaMeasurementId) {
          setGaIdInput(json.settings.gaMeasurementId);
        }
      }
    } catch (e) {
      console.error("Failed to load analytics", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const handleSaveGaId = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGaId(true);
    setGaSaveMsg(null);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaMeasurementId: gaIdInput }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setGaSaveMsg("✓ מזהה GA4 נשמר בהצלחה! אירועי click_out_to_aliexpress נשלחים כעת.");
        fetchAnalytics();
        setTimeout(() => setGaSaveMsg(null), 4000);
      } else {
        alert(result.error || "שגיאה בשמירת מזהה GA4");
      }
    } catch (e) {
      alert("שגיאת תקשורת עם השרת");
    } finally {
      setIsSavingGaId(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, target: "gsc" | "ga4") => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || "");
      if (target === "gsc") {
        setGscCsvText(content);
      } else {
        setGa4CsvText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleImportGsc = async () => {
    if (!gscCsvText.trim()) {
      alert("נא להעלות קובץ CSV או להדביק טקסט של שאילתות");
      return;
    }

    setIsImportingGsc(true);
    setGscImportMsg(null);

    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "gsc", csvData: gscCsvText }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setGscImportMsg(result.message);
        setGscCsvText("");
        fetchAnalytics();
        setTimeout(() => setGscImportMsg(null), 4000);
      } else {
        alert(result.error || "שגיאה בייבוא נתוני Search Console");
      }
    } catch (e) {
      alert("שגיאת תקשורת");
    } finally {
      setIsImportingGsc(false);
    }
  };

  const handleImportGa4 = async () => {
    if (!ga4CsvText.trim()) {
      alert("נא להעלות קובץ CSV או להדביק טקסט של עמודים");
      return;
    }

    setIsImportingGa4(true);
    setGa4ImportMsg(null);

    try {
      const res = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ga4", csvData: ga4CsvText }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setGa4ImportMsg(result.message);
        setGa4CsvText("");
        fetchAnalytics();
        setTimeout(() => setGa4ImportMsg(null), 4000);
      } else {
        alert(result.error || "שגיאה בייבוא נתוני Google Analytics 4");
      }
    } catch (e) {
      alert("שגיאת תקשורת");
    } finally {
      setIsImportingGa4(false);
    }
  };

  const handleResetData = async (type: "all" | "clicks" | "gsc" | "ga4") => {
    if (!confirm(`האם אתה בטוח שברצונך לאפס את נתוני ה-${type}?`)) return;

    try {
      await fetch(`/api/analytics?type=${type}`, { method: "DELETE" });
      fetchAnalytics();
    } catch (e) {
      alert("שגיאה באיפוס הנתונים");
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400" dir="rtl">
        <BarChart3 className="w-10 h-10 animate-pulse mx-auto mb-2 text-indigo-500" />
        <p className="text-sm font-bold">טוען מרכז דאטא & אנליטיקס...</p>
      </div>
    );
  }

  const isGaConfigured = Boolean(data?.settings?.gaMeasurementId);

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">
              תשתית דאטא & אירועי המרה אמיתיים
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              GA4 + Search Console
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            מרכז דאטא, אנליטיקס ו-RPC
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            מעקב אחר אירוע ההמרה הראשי (<code>click_out_to_aliexpress</code>), חישוב רווח לקליק אמיתי, והזנת נתוני אמת לסוכני ה-AI.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchAnalytics}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-sm self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>רענן נתונים</span>
        </button>
      </div>

      {/* GA4 Connection Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
              isGaConfigured ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
            }`}>
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-900">חיבור Google Analytics 4 (GA4)</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isGaConfigured
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  {isGaConfigured ? "🟢 מחובר ומשדר" : "🟡 ממתין להזנת מזהה"}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                אירוע ההמרה <code>click_out_to_aliexpress</code> משודר אוטומטית בכל לחיצה על כפתור, תמונה או קישור שותפים באתר.
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveGaId} className="flex items-center gap-2">
            <input
              type="text"
              value={gaIdInput}
              onChange={(e) => setGaIdInput(e.target.value.trim())}
              placeholder="G-XXXXXXXXXX"
              className="px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-mono font-bold text-slate-900 focus:border-indigo-500 focus:outline-none w-44"
              required
            />
            <button
              type="submit"
              disabled={isSavingGaId}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSavingGaId ? "שומר..." : "שמור מזהה"}
            </button>
          </form>
        </div>

        {gaSaveMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in">
            {gaSaveMsg}
          </div>
        )}
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Main Conversion Event (Clicks to AliExpress) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>קליקים לאלי אקספרס</span>
            <MousePointerClick className="w-4 h-4 text-ali-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {data?.summary.totalOutboundClicks.toLocaleString() || 0}
            </span>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
              Main Event
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            אירוע ההמרה הראשי שנרשם בלייב (click_out_to_aliexpress)
          </p>
        </div>

        {/* Metric 2: Real Page Views */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>צפיות אמת בעמודים (GA4)</span>
            <Eye className="w-4 h-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {data?.summary.totalViews.toLocaleString() || 0}
            </span>
            <span className="text-[10px] text-slate-500">
              {data?.ga4Stats.length || 0} עמודים
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            תנועה מאומתת מייבוא נתוני Google Analytics 4
          </p>
        </div>

        {/* Metric 3: Real Calculated CTR */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>שיעור המרה לקליק (CTR)</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {data?.summary.averageCtrPercent || 0}%
            </span>
            <span className="text-[10px] text-slate-500">
              ממוצע אתר
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            אחוז הגולשים שלחצו על קישור שותפים מתוך סך הצפיות
          </p>
        </div>

        {/* Metric 4: Real Daily RPC & Progress to 100$ */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>רווח מוערך יומי מול יעד $100</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              ${data?.summary.dailyRevenueEstimateUsd || 0}
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
              {data?.summary.progressToGoalPercent || 0}%
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            מבוסס על RPC אמיתי ועמלת המרה ממוצעת
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab("overview")}
          className={`pb-3 px-4 font-bold transition-all border-b-2 ${
            activeTab === "overview"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          💡 תובנות CRO ו-SEO של הסוכנים
        </button>
        <button
          onClick={() => setActiveTab("gsc")}
          className={`pb-3 px-4 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "gsc"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Google Search Console ({data?.gscQueries.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab("ga4")}
          className={`pb-3 px-4 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "ga4"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Google Analytics 4 ({data?.ga4Stats.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab("clicks")}
          className={`pb-3 px-4 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "clicks"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <MousePointerClick className="w-3.5 h-3.5" />
          <span>יומן קליקים חי ({data?.recentClicks.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab("s2s")}
          className={`pb-3 px-4 font-bold transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "s2s"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>דיווח מכירות S2S ({data?.conversions?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & AGENT RECOMMENDATIONS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  המלצות ה-CRO ו-SEO של דנה ורון (מבוססות דאטא אמיתי)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                {data?.summary.recommendations.length} המלצות פעולה
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data?.summary.recommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{rec.pageTitle}</span>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {rec.expectedRpmBoost}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px]">בעיה: {rec.issueHe}</p>
                  <p className="text-slate-800 font-medium">המלצה: {rec.recommendationHe}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GOOGLE SEARCH CONSOLE IMPORT & QUERIES */}
      {activeTab === "gsc" && (
        <div className="space-y-6">
          {/* Import Box */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Search className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  ייבוא שאילתות מ-Google Search Console
                </h3>
              </div>
              <span className="text-xs text-slate-400">Queries &amp; Landing Pages</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 text-xs text-slate-700 space-y-1.5">
              <span className="font-bold text-indigo-950">איך מייצאים מ-Search Console בדקה?</span>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                1. היכנס ל-Google Search Console ⬅️ <strong>ביצועים (Performance)</strong>.<br />
                2. לחץ על כפתור <strong>ייצוא (Export)</strong> בצד שמאל למעלה ובחר <strong>הורדת CSV</strong>.<br />
                3. העלה לכאן את הקובץ <code>Queries.csv</code> (או פתח אותו והעתק-הדבק את הטקסט).
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/30 text-slate-600 hover:text-indigo-600 text-xs font-bold cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  <span>בחר קובץ Queries.csv מהמחשב</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => handleFileUpload(e, "gsc")}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleImportGsc}
                  disabled={isImportingGsc || !gscCsvText.trim()}
                  className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isImportingGsc ? "מייבא..." : "ייבא שאילתות למערכת"}
                </button>
              </div>

              <textarea
                rows={3}
                value={gscCsvText}
                onChange={(e) => setGscCsvText(e.target.value)}
                placeholder="או הדבק כאן שורות מתוך ה-CSV (למשל: Top queries,Clicks,Impressions,CTR,Position)..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {gscImportMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in">
                {gscImportMsg}
              </div>
            )}
          </div>

          {/* GSC Queries Table */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                שאילתות חיפוש שנסרקו מ-Search Console ({data?.gscQueries.length || 0})
              </h3>
              {data && data.gscQueries.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleResetData("gsc")}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  נקה שאילתות
                </button>
              )}
            </div>

            {data?.gscQueries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                טרם יובאו שאילתות מ-Google Search Console. העלה קובץ למעלה כדי להתחיל.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">מילת חיפוש (Query)</th>
                      <th className="py-2.5 px-3">חשיפות בגוגל</th>
                      <th className="py-2.5 px-3">קליקים</th>
                      <th className="py-2.5 px-3">שיעור קליקים (CTR)</th>
                      <th className="py-2.5 px-3">מיקום ממוצע</th>
                      <th className="py-2.5 px-3">הזדמנות SEO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.gscQueries.map((q) => {
                      const isOpportunity = q.position >= 4 && q.position <= 15 && q.impressions >= 20;
                      return (
                        <tr key={q.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{q.query}</td>
                          <td className="py-2.5 px-3 font-mono">{q.impressions.toLocaleString()}</td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-emerald-600">{q.clicks}</td>
                          <td className="py-2.5 px-3 font-mono">{q.ctr.toFixed(1)}%</td>
                          <td className="py-2.5 px-3 font-mono font-bold">
                            <span className={`px-2 py-0.5 rounded ${
                              q.position <= 3
                                ? "bg-emerald-50 text-emerald-700"
                                : q.position <= 10
                                ? "bg-indigo-50 text-indigo-700"
                                : "bg-slate-100 text-slate-600"
                            }`}>
                              {q.position.toFixed(1)}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            {isOpportunity ? (
                              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                🎯 פוטנציאל לטופ 3
                              </span>
                            ) : q.position <= 3 ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                                ⭐ עמוד ראשון
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">מעקב רגיל</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: GOOGLE ANALYTICS 4 IMPORT & PAGE STATS */}
      {activeTab === "ga4" && (
        <div className="space-y-6">
          {/* Import Box */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  ייבוא דפי נחיתה וצפיות מ-Google Analytics 4
                </h3>
              </div>
              <span className="text-xs text-slate-400">Pages &amp; Screens</span>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <label className="flex-1 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-sky-500 bg-slate-50 hover:bg-sky-50/30 text-slate-600 hover:text-sky-600 text-xs font-bold cursor-pointer transition-all">
                  <Upload className="w-4 h-4" />
                  <span>בחר קובץ Pages.csv מ-GA4</span>
                  <input
                    type="file"
                    accept=".csv,.txt"
                    onChange={(e) => handleFileUpload(e, "ga4")}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleImportGa4}
                  disabled={isImportingGa4 || !ga4CsvText.trim()}
                  className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isImportingGa4 ? "מייבא..." : "ייבא צפיות למערכת"}
                </button>
              </div>

              <textarea
                rows={3}
                value={ga4CsvText}
                onChange={(e) => setGa4CsvText(e.target.value)}
                placeholder="או הדבק שורות CSV מ-GA4 (Page path, Views, Users)..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-sky-500"
              />
            </div>

            {ga4ImportMsg && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl animate-in fade-in">
                {ga4ImportMsg}
              </div>
            )}
          </div>

          {/* GA4 Pages Table */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-900">
                צפיות עמודים מאומתות מ-GA4 ({data?.ga4Stats.length || 0})
              </h3>
              {data && data.ga4Stats.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleResetData("ga4")}
                  className="text-xs text-rose-600 hover:underline font-semibold"
                >
                  נקה נתונים
                </button>
              )}
            </div>

            {data?.ga4Stats.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                טרם יובאו נתוני צפיות מ-GA4.
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">נתיב דף (Page Path)</th>
                      <th className="py-2.5 px-3">צפיות (Views)</th>
                      <th className="py-2.5 px-3">משתמשים (Users)</th>
                      <th className="py-2.5 px-3">תאריך ייבוא</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data?.ga4Stats.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{s.pagePath}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-600">{s.views.toLocaleString()}</td>
                        <td className="py-2.5 px-3 font-mono">{s.users.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-[10px] text-slate-400">
                          {new Date(s.importedAt).toLocaleDateString("he-IL")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: LIVE CLICKS FEED (MAIN EVENT: CLICK_OUT_TO_ALIEXPRESS) */}
      {activeTab === "clicks" && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                יומן לחיצות חי לאלי אקספרס (Live Outbound Clicks)
              </h3>
              <p className="text-[11px] text-slate-500">
                כל לחיצה נשלחת אוטומטית ל-GA4 כאירוע <code>click_out_to_aliexpress</code> ומתועדת כאן.
              </p>
            </div>
            {data && data.recentClicks.length > 0 && (
              <button
                type="button"
                onClick={() => handleResetData("clicks")}
                className="text-xs text-rose-600 hover:underline font-semibold"
              >
                נקה יומן
              </button>
            )}
          </div>

          {data?.recentClicks.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs space-y-2">
              <MousePointerClick className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-bold">טרם נרשמו קליקים באתר</p>
              <p className="text-[11px]">ברגע שגולש ילחץ על כפתור רכישה, תמונה או סרגל דביק – הקליק יופיע כאן מיד!</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3">שעה</th>
                    <th className="py-2.5 px-3">מוצר שהוקלק</th>
                    <th className="py-2.5 px-3">מחיר</th>
                    <th className="py-2.5 px-3">מיקום/סוג רכיב</th>
                    <th className="py-2.5 px-3">עמוד מקור</th>
                    <th className="py-2.5 px-3">קישור יעד</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data?.recentClicks.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                        {new Date(c.timestamp).toLocaleTimeString("he-IL", { hour12: false })}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900 max-w-xs truncate">
                        {c.productTitle}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                        ${c.priceUsd} (₪{Math.round(c.priceIls)})
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">
                          {c.linkType}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        /{c.pageSlug}
                      </td>
                      <td className="py-2.5 px-3">
                        <a
                          href={c.destinationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-ali-600 hover:underline flex items-center gap-1 font-bold text-[11px]"
                        >
                          <span>בדוק קישור</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: S2S CONVERSIONS & WEBHOOK POSTBACK */}
      {activeTab === "s2s" && (
        <div className="space-y-6">
          {/* Webhook Endpoint Info Card */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">
                    כתובת S2S Postback Webhook לקליטת מכירות ועמלות
                  </h3>
                  <p className="text-xs text-slate-500">
                    חבר כתובת זו ב-AliExpress Portals, Admitad או רשת השותפים שלך לדיווח מכירות אמת בזמן אמת.
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                פעיל ומאזין (Active)
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 text-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">כתובת ה-Webhook (תומכת ב-GET ו-POST):</span>
                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
                    navigator.clipboard.writeText(`${origin}/api/affiliate/s2s?orderId={order_id}&amount={amount}&commission={commission}&subId={subid}&status=approved&secret=alideals_s2s_secret`);
                    alert("כתובת ה-Webhook הועתקה ללוח!");
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                >
                  העתק כתובת Webhook
                </button>
              </div>
              <code className="block font-mono text-xs text-emerald-400 break-all dir-ltr text-left">
                /api/affiliate/s2s?orderId=&#123;order_id&#125;&amp;amount=&#123;amount&#125;&amp;commission=&#123;commission&#125;&amp;subId=&#123;subid&#125;&amp;status=approved&amp;secret=alideals_s2s_secret
              </code>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="font-bold text-slate-700 block">עסקאות שנקלטו:</span>
                <span className="text-lg font-black text-slate-900">{data?.conversions?.length || 0}</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <span className="font-bold text-emerald-800 block">סך עמלות בדולרים:</span>
                <span className="text-lg font-black text-emerald-700">
                  ${data?.summary.actualRevenueUsd || 0}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <span className="font-bold text-indigo-800 block">סך עמלות בשקלים:</span>
                <span className="text-lg font-black text-indigo-700">
                  ₪{data?.summary.actualRevenueIls || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Conversions Table */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 pb-3 border-b border-slate-100">
              היסטוריית מכירות S2S מאומתות
            </h3>

            {(!data?.conversions || data.conversions.length === 0) ? (
              <div className="py-12 text-center text-slate-400">
                <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">טרם נקלטו דיווחי מכירות דרך ה-S2S Webhook.</p>
                <p className="text-[11px] text-slate-500 mt-1">ברגע שרשת השותפים תשלח Postback, ההכנסות יוזנו אוטומטית למנוע של דנה ויוצגו בצ&apos;אט של אלון.</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-xs text-right">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold">
                      <th className="py-2.5 px-3">זמן</th>
                      <th className="py-2.5 px-3">מספר הזמנה</th>
                      <th className="py-2.5 px-3">מוצר / פריט</th>
                      <th className="py-2.5 px-3">סכום רכישה</th>
                      <th className="py-2.5 px-3">עמלה ($ / ₪)</th>
                      <th className="py-2.5 px-3">SubID (מעקב)</th>
                      <th className="py-2.5 px-3">סטטוס</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.conversions.map((conv) => (
                      <tr key={conv.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                          {new Date(conv.timestamp).toLocaleString("he-IL")}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {conv.orderId}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 max-w-xs truncate">
                          {conv.productTitle || `פריט #${conv.productId || "כללי"}`}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          ${conv.orderAmountUsd}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-600">
                          ${conv.commissionUsd} (₪{conv.commissionIls})
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-indigo-600">
                          {conv.subId || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            conv.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : conv.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}>
                            {conv.status === "approved" ? "מאושר" : conv.status === "pending" ? "בהמתנה" : "נדחה"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
