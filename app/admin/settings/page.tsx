"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, Key, Globe, CheckCircle2, BarChart3, ArrowLeft, ShieldCheck, Sparkles, Search, TrendingUp, Cpu, ShoppingBag, AlertCircle, RefreshCw, Code, FileCode, Copy, Check, Info, Tags, Eye, Layers, History } from "lucide-react";
import { CodeSnippetManager } from "@/components/admin/CodeSnippetManager";

export default function AdminSettingsPage() {
  const [gaId, setGaId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Google Tag Manager (GTM) & Custom Scripts States
  const [gtmId, setGtmId] = useState("");
  const [gtmHeadScript, setGtmHeadScript] = useState("");
  const [gtmBodyScript, setGtmBodyScript] = useState("");
  const [customHeadScript, setCustomHeadScript] = useState("");
  const [customBodyScript, setCustomBodyScript] = useState("");
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [trackingSaveSuccess, setTrackingSaveSuccess] = useState(false);
  const [activeTrackingTab, setActiveTrackingTab] = useState<"snippets" | "head" | "gtm" | "body">("snippets");

  // Google Search Console States
  const [gscSiteUrl, setGscSiteUrl] = useState("sc-domain:ali-deals.co.il");
  const [gscConnected, setGscConnected] = useState(true);
  const [gscAutoOptimize, setGscAutoOptimize] = useState(true);
  const [strikingCount, setStrikingCount] = useState(3);
  const [isGscSaving, setIsGscSaving] = useState(false);
  const [gscSuccess, setGscSuccess] = useState(false);

  // AliExpress Open Platform States
  const [aliAppKey, setAliAppKey] = useState("");
  const [aliAppSecret, setAliAppSecret] = useState("");
  const [aliTrackingId, setAliTrackingId] = useState("default");
  const [isTestingAli, setIsTestingAli] = useState(false);
  const [aliTestResult, setAliTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [isSavingAli, setIsSavingAli] = useState(false);
  const [aliSaveSuccess, setAliSaveSuccess] = useState(false);

  // Deal Request Widget ("אתם מבקשים — אנחנו מוצאים!") States
  const [enableDealRequest, setEnableDealRequest] = useState(true);
  const [dealRequestUrl, setDealRequestUrl] = useState("https://t.me/AliDealsIL?start=site_deal_request");
  const [dealRequestTitle, setDealRequestTitle] = useState("אתם מבקשים — אנחנו מוצאים!");
  const [isSavingDealRequest, setIsSavingDealRequest] = useState(false);
  const [dealRequestSuccess, setDealRequestSuccess] = useState(false);

  // Gemini AI Key States
  const [geminiKey, setGeminiKey] = useState("");
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [geminiSaveSuccess, setGeminiSaveSuccess] = useState(false);
  const [isTestingGemini, setIsTestingGemini] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ success: boolean; message: string; model?: string; reply?: string; details?: any } | null>(null);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.gaMeasurementId) {
          setGaId(data.settings.gaMeasurementId);
        }
        if (data?.settings?.gtmId) {
          setGtmId(data.settings.gtmId);
        }
        if (data?.settings?.gtmHeadScript) {
          setGtmHeadScript(data.settings.gtmHeadScript);
        }
        if (data?.settings?.gtmBodyScript) {
          setGtmBodyScript(data.settings.gtmBodyScript);
        }
        if (data?.settings?.customHeadScript) {
          setCustomHeadScript(data.settings.customHeadScript);
        }
        if (data?.settings?.customBodyScript) {
          setCustomBodyScript(data.settings.customBodyScript);
        }
        if (data?.settings?.geminiApiKey) {
          setGeminiKey(data.settings.geminiApiKey);
        }
        if (data?.settings?.aliexpressAppKey) {
          setAliAppKey(data.settings.aliexpressAppKey);
        }
        if (data?.settings?.aliexpressAppSecret) {
          setAliAppSecret(data.settings.aliexpressAppSecret);
        }
        if (data?.settings?.aliexpressDefaultTrackingId) {
          setAliTrackingId(data.settings.aliexpressDefaultTrackingId);
        }
        if (data?.settings?.enableDealRequestWidget !== undefined) {
          setEnableDealRequest(data.settings.enableDealRequestWidget);
        }
        if (data?.settings?.dealRequestTelegramUrl) {
          setDealRequestUrl(data.settings.dealRequestTelegramUrl);
        }
        if (data?.settings?.dealRequestTitle) {
          setDealRequestTitle(data.settings.dealRequestTitle);
        }
      })
      .catch((e) => console.error("Failed to load settings", e))
      .finally(() => setIsLoading(false));

    fetch("/api/analytics/gsc")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings) {
          setGscConnected(data.settings.isConnected ?? true);
          setGscSiteUrl(data.settings.siteUrl || "sc-domain:ali-deals.co.il");
          setGscAutoOptimize(data.settings.autoOptimizeMeta ?? true);
        }
        if (typeof data?.strikingDistanceCount === "number") {
          setStrikingCount(data.strikingDistanceCount);
        }
      })
      .catch((e) => console.error("Failed to load GSC settings", e));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gaMeasurementId: gaId.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(result.error || "שגיאה בשמירה");
      }
    } catch (e) {
      alert("שגיאת תקשורת");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveTracking = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSavingTracking(true);
    setTrackingSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gtmId: gtmId.trim(),
          gtmHeadScript,
          gtmBodyScript,
          customHeadScript,
          customBodyScript,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTrackingSaveSuccess(true);
        setTimeout(() => setTrackingSaveSuccess(false), 4000);
      } else {
        alert(data.error || "שגיאה בשמירת קודי המעקב");
      }
    } catch {
      alert("שגיאת תקשורת מול השרת");
    } finally {
      setIsSavingTracking(false);
    }
  };

  const handleGenerateGtmTemplates = () => {
    const clean = gtmId.trim().toUpperCase();
    if (!clean) {
      alert("נא להזין מזהה קונטיינר GTM (למשל GTM-XXXXXXX) תחילה.");
      return;
    }
    const headCode = `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${clean}');</script>
<!-- End Google Tag Manager -->`;

    const bodyCode = `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${clean}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`;

    setGtmHeadScript(headCode);
    setGtmBodyScript(bodyCode);
  };

  const handleSaveGemini = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingGemini(true);
    setGeminiSaveSuccess(false);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geminiApiKey: geminiKey.trim() }),
      });
      const result = await res.json();
      if (res.ok && result.success) {
        setGeminiSaveSuccess(true);
        setTimeout(() => setGeminiSaveSuccess(false), 3000);
      } else {
        alert(result.error || "שגיאה בשמירת מפתח Gemini");
      }
    } catch (e) {
      alert("שגיאת תקשורת");
    } finally {
      setIsSavingGemini(false);
    }
  };

  const handleTestGemini = async () => {
    setIsTestingGemini(true);
    setGeminiTestResult(null);
    try {
      const res = await fetch("/api/gemini/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          geminiApiKey: geminiKey.trim(),
        }),
      });
      const data = await res.json();
      setGeminiTestResult(data);
    } catch {
      setGeminiTestResult({
        success: false,
        message: "שגיאת תקשורת מול השרת בבדיקת חיבור Gemini",
      });
    } finally {
      setIsTestingGemini(false);
    }
  };

  const handleSaveGsc = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGscSaving(true);
    setGscSuccess(false);
    try {
      const res = await fetch("/api/analytics/gsc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isConnected: gscConnected,
          siteUrl: gscSiteUrl.trim(),
          autoOptimizeMeta: gscAutoOptimize,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setGscSuccess(true);
        setTimeout(() => setGscSuccess(false), 3000);
      } else {
        alert(data.error || "שגיאה בשמירת Search Console");
      }
    } catch {
      alert("שגיאת תקשורת");
    } finally {
      setIsGscSaving(false);
    }
  };

  const handleTestAliExpress = async () => {
    setIsTestingAli(true);
    setAliTestResult(null);
    try {
      const res = await fetch("/api/aliexpress/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appKey: aliAppKey.trim(),
          appSecret: aliAppSecret.trim(),
          trackingId: aliTrackingId.trim(),
        }),
      });
      const data = await res.json();
      setAliTestResult(data);
    } catch {
      setAliTestResult({
        success: false,
        message: "שגיאת תקשורת מול השרת",
      });
    } finally {
      setIsTestingAli(false);
    }
  };

  const handleSaveAliExpress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAli(true);
    setAliSaveSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aliexpressAppKey: aliAppKey.trim(),
          aliexpressAppSecret: aliAppSecret.trim(),
          aliexpressDefaultTrackingId: aliTrackingId.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAliSaveSuccess(true);
        setTimeout(() => setAliSaveSuccess(false), 3000);
      } else {
        alert(data.error || "שגיאה בשמירת הגדרות AliExpress");
      }
    } finally {
      setIsSavingAli(false);
    }
  };

  const handleSaveDealRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDealRequest(true);
    setDealRequestSuccess(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enableDealRequestWidget: enableDealRequest,
          dealRequestTelegramUrl: dealRequestUrl.trim(),
          dealRequestTitle: dealRequestTitle.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDealRequestSuccess(true);
        setTimeout(() => setDealRequestSuccess(false), 3000);
      } else {
        alert(data.error || "שגיאה בשמירת הגדרות הווידג'ט");
      }
    } catch {
      alert("שגיאת תקשורת");
    } finally {
      setIsSavingDealRequest(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-24" dir="rtl">
      <div>
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">תצורה, מדידה ו-API</span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">הגדרות מערכת ו-GA4</h1>
        <p className="text-sm text-slate-500 mt-1">
          ניהול חיבור Google Analytics 4, מעקב אירוע ההמרה הראשי ומפתחות ה-API בענן Vercel.
        </p>
      </div>

      {/* GA4 Connection Card */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-base text-slate-900">Google Analytics 4 (GA4) - מזהה מדידה ראשי</h2>
          </div>
          <Link
            href="/admin/analytics"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>פתח מרכז דאטא &amp; RPC</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Measurement ID (מזהה המדידה של הנכס ב-GA4)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={gaId}
                onChange={(e) => setGaId(e.target.value.trim().toUpperCase())}
                placeholder="G-XXXXXXXXXX"
                className="flex-1 p-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
                required
              />
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {isSaving ? "שומר..." : "שמור מזהה"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              את המזהה מוצאים ב-Google Analytics: מנהל מערכת (Admin) ⬅️ זרמי נתונים (Data Streams) ⬅️ אתר אינטרנט ⬅️ מזהה מדידה (G-...).
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>מזהה ה-GA4 נשמר בהצלחה! אירוע ההמרה click_out_to_aliexpress פועל בכל האתר.</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100 text-xs text-slate-700 space-y-2">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              אירוע ההמרה הראשי (Main Conversion Event):
            </span>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              האתר מוגדר כעת לשדר אוטומטית את האירוע <code>click_out_to_aliexpress</code> בכל לחיצה של גולש על כפתור קנייה, תמונת מוצר או סרגל דביק. בתוך GA4 תוכל לסמן אירוע זה כ-<strong>Key Event / Conversion</strong> כדי לעקוב אחרי ערך ה-RPC שלך!
            </p>
          </div>
        </form>
      </section>

      {/* GTM & Custom Tracking Codes Card (Meta Pixel, Domain Verification, Head & Body) */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Code className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900">הטמעת קודי מעקב, פיקסל פייסבוק ו-Google Tag Manager (GTM)</h2>
              <p className="text-xs text-slate-500">הטמעת סקריפטים ותגיות ישירות ב-HEAD וב-BODY של האתר ללא צורך בפיתוח</p>
            </div>
          </div>

          {/* Active Detectors Badges */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            {((gtmId && gtmId.trim()) || (gtmHeadScript && gtmHeadScript.trim())) && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                <Check className="w-3 h-3 text-emerald-600" />
                GTM מוגדר
              </span>
            )}
            {customHeadScript && (customHeadScript.includes("fbq") || customHeadScript.includes("fbevents.js")) && (
              <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-bold flex items-center gap-1">
                <Check className="w-3 h-3 text-blue-600" />
                Meta Pixel מזוהה
              </span>
            )}
            {customHeadScript && customHeadScript.includes("facebook-domain-verification") && (
              <span className="px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-bold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-sky-600" />
                אימות דומיין FB
              </span>
            )}
            {customHeadScript && customHeadScript.includes("tiktok") && (
              <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 font-bold flex items-center gap-1">
                <Check className="w-3 h-3 text-purple-600" />
                TikTok Pixel
              </span>
            )}
            {customHeadScript && customHeadScript.includes("google-site-verification") && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold flex items-center gap-1">
                <Check className="w-3 h-3 text-amber-600" />
                אימות GSC
              </span>
            )}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap border-b border-slate-200 gap-2">
          <button
            type="button"
            onClick={() => setActiveTrackingTab("snippets")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTrackingTab === "snippets"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>מנהל מקטעי קוד דינאמיים ולוגים</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-bold">
              מומלץ
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTrackingTab("head")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTrackingTab === "head"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>קוד ישיר ב-HEAD (שדה בודד)</span>
            {customHeadScript && customHeadScript.trim() ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTrackingTab("gtm")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTrackingTab === "gtm"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Tags className="w-4 h-4" />
            <span>קונטיינר GTM (קוד HEAD וקוד BODY)</span>
            {((gtmId && gtmId.trim()) || (gtmHeadScript && gtmHeadScript.trim()) || (gtmBodyScript && gtmBodyScript.trim())) ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : null}
          </button>

          <button
            type="button"
            onClick={() => setActiveTrackingTab("body")}
            className={`pb-3 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTrackingTab === "body"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>קוד ישיר ב-BODY (שדה בודד)</span>
            {customBodyScript && customBodyScript.trim() ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            ) : null}
          </button>
        </div>

        {activeTrackingTab === "snippets" ? (
          <div className="pt-2">
            <CodeSnippetManager />
          </div>
        ) : (
          <form onSubmit={handleSaveTracking} className="space-y-5">
            {/* TAB 1: HEAD SCRIPTS (Meta Pixel, etc.) */}
            {activeTrackingTab === "head" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Info className="w-4 h-4 text-indigo-600" />
                    הנחיות להטמעה ב-HEAD:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const template = `<!-- Meta Pixel Code -->\n<script>\n!function(f,b,e,v,n,t,s)\n{if(f.fbq)return;n=f.fbq=function(){n.callMethod?\nn.callMethod.apply(n,arguments):n.queue.push(arguments)};\nif(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';\nn.queue=[];t=b.createElement(e);t.async=!0;\nt.src=v;s=b.getElementsByTagName(e)[0];\ns.parentNode.insertBefore(t,s)}(window, document,'script',\n'https://connect.facebook.net/en_US/fbevents.js');\nfbq('init', 'YOUR_PIXEL_ID_HERE');\nfbq('track', 'PageView');\n</script>\n<noscript><img height="1" width="1" style="display:none"\nsrc="https://www.facebook.com/tr?id=YOUR_PIXEL_ID_HERE&ev=PageView&noscript=1"\n/></noscript>\n<!-- End Meta Pixel Code -->`;
                      setCustomHeadScript((prev) => (prev ? prev + "\n\n" + template : template));
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    <span>הדבק תבנית Meta Pixel</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  הדבק כאן את קוד הפיקסל המלא של פייסבוק (כולל תגיות <code>&lt;script&gt;</code> ו-<code>&lt;noscript&gt;</code>), תגיות אימות דומיין של Meta (<code>&lt;meta name=&quot;facebook-domain-verification&quot; ...&gt;</code>), פיקסל טיקטוק, גוגל אדס או כל סקריפט אחר שצריך להיטען בראש העמוד.
                </p>
                <p className="text-[11px] text-emerald-700 font-medium">
                  ✨ מערכת האתר מזהה את הפיקסל ומשדרת אוטומטית אירוע <code>PageView</code> בכל מעבר עמוד ב-SPA, וכן אירוע המרה <code>AffiliateClickout</code> בכל לחיצת רכישה לאלי אקספרס!
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    קוד HTML / Script להטמעה ב-HEAD
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {customHeadScript ? `${customHeadScript.split("\n").length} שורות (${customHeadScript.length} תווים)` : "ריק"}
                  </span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <textarea
                    rows={12}
                    value={customHeadScript}
                    onChange={(e) => setCustomHeadScript(e.target.value)}
                    placeholder="<!-- הדבק כאן קוד פיקסל פייסבוק, תגיות אימות דומיין או סקריפטים ב-HEAD -->"
                    dir="ltr"
                    className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-indigo-600 selection:text-white"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE TAG MANAGER (GTM) */}
          {activeTrackingTab === "gtm" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-slate-700 space-y-2">
                <span className="font-bold text-amber-950 flex items-center gap-1.5">
                  <Tags className="w-4 h-4 text-amber-600" />
                  הגדרת קונטיינר Google Tag Manager:
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  באפשרותך להזין את מזהה הקונטיינר בלבד (לדוגמה <code>GTM-XXXXXXX</code>) והאתר יטמיע אוטומטית את קודי ה-HEAD וה-BODY התקניים. לחלופין, תוכל להדביק את קודי ה-HEAD וה-BODY המותאמים אישית שלך ישירות בשדות למטה.
                </p>
              </div>

              {/* GTM Container ID Field */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  מזהה קונטיינר GTM (GTM Container ID)
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={gtmId}
                    onChange={(e) => setGtmId(e.target.value.trim().toUpperCase())}
                    placeholder="GTM-XXXXXXX"
                    className="flex-1 p-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateGtmTemplates}
                    className="px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    title="מייצר את קטעי הקוד התקניים של גוגל לשדות למטה לפי המזהה שהזנת"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>החל תבנית קוד GTM לשדות</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400">
                  נמצא ב-Tag Manager ליד שם הקונטיינר (פורמט: GTM- ואחריו אותיות ומספרים).
                </p>
              </div>

              {/* GTM HEAD Code Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    1. קוד GTM להדבקה ב-HEAD (Google Tag Manager Script)
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {gtmHeadScript ? `${gtmHeadScript.split("\n").length} שורות` : "ריק"}
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <textarea
                    rows={6}
                    value={gtmHeadScript}
                    onChange={(e) => setGtmHeadScript(e.target.value)}
                    placeholder="<!-- הדבק כאן את הקוד הראשון של GTM שמוכנס ל-HEAD -->"
                    dir="ltr"
                    className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-indigo-600 selection:text-white"
                    spellCheck={false}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  הקוד מוזרק בראש ה-HEAD במהלך טעינת ה-SSR. אם שדה זה נותר ריק אך מזהה הקונטיינר הוגדר למעלה — ייוצר קוד תקני אוטומטית.
                </p>
              </div>

              {/* GTM BODY Code Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    2. קוד GTM להדבקה ב-BODY (Google Tag Manager noscript)
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {gtmBodyScript ? `${gtmBodyScript.split("\n").length} שורות` : "ריק"}
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <textarea
                    rows={4}
                    value={gtmBodyScript}
                    onChange={(e) => setGtmBodyScript(e.target.value)}
                    placeholder="<!-- הדבק כאן את הקוד השני של GTM (תגית noscript) שמוכנס לתחילת ה-BODY -->"
                    dir="ltr"
                    className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-indigo-600 selection:text-white"
                    spellCheck={false}
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  הקוד מוזרק מיד לאחר פתיחת תגית ה-<code>&lt;body&gt;</code> באתר.
                </p>
              </div>
            </div>
          )}

          {/* TAB 3: BODY SCRIPTS */}
          {activeTrackingTab === "body" && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-indigo-600" />
                  הנחיות להטמעה ב-BODY:
                </span>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  הדבק כאן סקריפטים ורכיבים מותאמים אישית שצריכים להופיע בגוף העמוד: וידג&apos;ט צ&apos;אט (WhatsApp, Crisp, LiveChat), כלי נגישות, תגיות <code>&lt;noscript&gt;</code> משניות או קודי מעקב בתחתית האתר.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    קוד HTML / Script להטמעה ב-BODY
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {customBodyScript ? `${customBodyScript.split("\n").length} שורות` : "ריק"}
                  </span>
                </div>

                <div className="relative rounded-2xl overflow-hidden border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <textarea
                    rows={8}
                    value={customBodyScript}
                    onChange={(e) => setCustomBodyScript(e.target.value)}
                    placeholder="<!-- הדבק כאן וידג'ט צ'אט, כפתור וואטסאפ או סקריפט גוף עמוד -->"
                    dir="ltr"
                    className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-indigo-600 selection:text-white"
                    spellCheck={false}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Save Action & Feedback */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="submit"
              disabled={isSavingTracking}
              className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
            >
              {isSavingTracking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>שומר קודי מעקב...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>שמור את כל קודי המעקב (GTM / פיקסל / סקריפטים)</span>
                </>
              )}
            </button>
          </div>

          {trackingSaveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-2xl flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>כל קודי המעקב (HEAD, BODY ו-GTM) נשמרו בהצלחה בענן! השינויים תקפים מיידית בכל עמודי האתר.</span>
            </div>
          )}
        </form>
        )}
      </section>

      {/* Gemini AI Key Card */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-base text-slate-900">Google Gemini AI - מוח ה-AI של אלון וצוות 6 הסוכנים</h2>
          </div>
          <Link
            href="/admin/agent-team"
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <span>פתח שיחה עם אלון</span>
            <ArrowLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <form onSubmit={handleSaveGemini} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Gemini API Key (Google AI Studio)
            </label>
            <input
              type="password"
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value.trim())}
              placeholder="AIzaSy..."
              className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              ניתן להפיק מפתח בחינם ב-Google AI Studio בכתובת aistudio.google.com. המפתח מחבר את מודל Gemini 2.5 Flash ומאפשר לרון (קופירייטר) ולאלון לכתוב סקירות מוצר עמוקות, השוואות TOP N ועמודי דיל בזק ללא תבניות ברירת מחדל.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSavingGemini}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSavingGemini ? "שומר..." : "שמור מפתח ב-CMS"}
            </button>

            <button
              type="button"
              onClick={handleTestGemini}
              disabled={isTestingGemini || (!geminiKey && !geminiKey.length)}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isTestingGemini ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>בודק מול Google Gemini...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>בדוק חיבור ל-Gemini API</span>
                </>
              )}
            </button>
          </div>

          {geminiSaveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>מפתח ה-Gemini נשמר בהצלחה במסד הנתונים! מודל Gemini 2.5 Flash זמין כעת להפקת עמודים.</span>
            </div>
          )}

          {geminiTestResult && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 animate-in fade-in ${
                geminiTestResult.success
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {geminiTestResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>בדיקת חיבור ל-Gemini הצליחה!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>בדיקת חיבור ל-Gemini נכשלה!</span>
                  </>
                )}
              </div>
              <p className="text-xs">{geminiTestResult.message}</p>
              {geminiTestResult.reply && (
                <p className="text-[11px] text-slate-600 font-mono bg-white/70 p-2 rounded-lg border border-slate-200/60">
                  מענה אימות מהמודל: {geminiTestResult.reply}
                </p>
              )}
              {!geminiTestResult.success && (
                <div className="text-[11px] text-rose-700/90 pt-1 space-y-1">
                  <p className="font-bold">טיפים לפתרון בעיות ב-Google AI Studio:</p>
                  <ul className="list-disc list-inside space-y-0.5 pr-2">
                    <li>ודא שהמפתח מתחיל ב-<code>AIzaSy</code> והועתק במלואו ללא רווחים מיותרים.</li>
                    <li>ודא שבפרויקט ה-Google Cloud שלך מופעל Gemini API (Generative Language API).</li>
                    <li>אם קבעת הגבלות IP או HTTP Referrer למפתח, הסר אותן כדי ששרת Vercel יוכל לתקשר עם ה-API.</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>
      </section>

      {/* Google Search Console (GSC) Card */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Search className="w-5 h-5 text-blue-600" />
            <h2 className="font-bold text-base text-slate-900">Google Search Console (GSC) - מודיעין אורגני ו-SEO</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${gscConnected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-100 text-slate-600"}`}>
              <span className={`w-2 h-2 rounded-full ${gscConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`} />
              {gscConnected ? "מחובר ל-GSC" : "מנותק"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveGsc} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              נכס / URL הנכס ב-Google Search Console
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={gscSiteUrl}
                onChange={(e) => setGscSiteUrl(e.target.value.trim())}
                placeholder="sc-domain:ali-deals.co.il או https://ali-deals.co.il"
                className="flex-1 p-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isGscSaving}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {isGscSaving ? "שומר..." : "עדכן נכס"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              הנתונים מה-Search Console מוזרמים ישירות לצוות הסוכנים (דנה ורון) לזיהוי שאילתות Striking Distance (מקומות 4-15) עם פוטנציאל קפיצה למקום ראשון.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
              <input
                type="checkbox"
                checked={gscAutoOptimize}
                onChange={(e) => setGscAutoOptimize(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span>אפשר לסוכני ה-AI להציע אוטומטית שדרוגי כותרות ו-Meta Descriptions לפי שאילתות אמיתיות</span>
            </label>
          </div>

          {gscSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>הגדרות Google Search Console עודכנו בהצלחה!</span>
            </div>
          )}

          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-slate-700 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>
                זוהו <strong>{strikingCount} הזדמנויות Striking Distance</strong> מובילות בדומיין שלך.
              </span>
            </div>
            <Link
              href="/admin/agent"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition-colors"
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>שאל את דנה ורון על ההזדמנויות</span>
            </Link>
          </div>
        </form>
      </section>

      {/* AliExpress Open Platform API Card */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-ali-600" />
            <h2 className="font-bold text-base text-slate-900">AliExpress Open Platform - מפתחות API ובדיקת חיבור</h2>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                aliAppKey && aliAppSecret
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  aliAppKey && aliAppSecret ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                }`}
              />
              {aliAppKey && aliAppSecret ? "מוגדרים מפתחות" : "מפתחות חסרים"}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveAliExpress} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                APP KEY (מזהה האפליקציה ב-AliExpress Portals)
              </label>
              <input
                type="text"
                value={aliAppKey}
                onChange={(e) => setAliAppKey(e.target.value.trim())}
                placeholder="למשל: 545964 או 500123"
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:border-ali-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                APP SECRET (קוד סודי של האפליקציה)
              </label>
              <input
                type="password"
                value={aliAppSecret}
                onChange={(e) => setAliAppSecret(e.target.value.trim())}
                placeholder="••••••••••••••••••••"
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:border-ali-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              TRACKING ID (מזהה המעקב בחשבון האפיליאציה)
            </label>
            <input
              type="text"
              value={aliTrackingId}
              onChange={(e) => setAliTrackingId(e.target.value.trim())}
              placeholder="default או alideals"
              className="w-full sm:w-1/2 p-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:border-ali-500 focus:outline-none"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              חייב להיות Tracking ID קיים שנוצר ב-AliExpress Portals תחת <strong>Tools ⬅️ Tracking ID</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isSavingAli}
              className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSavingAli ? "שומר..." : "שמור מפתחות ב-CMS"}
            </button>

            <button
              type="button"
              onClick={handleTestAliExpress}
              disabled={isTestingAli || !aliAppKey || !aliAppSecret}
              className="px-6 py-3 bg-ali-600 hover:bg-ali-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isTestingAli ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>בודק מול שרתי AliExpress...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>בצע בדיקת חיבור מול שרתי AliExpress</span>
                </>
              )}
            </button>
          </div>

          {aliSaveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>מפתחות AliExpress נשמרו בהצלחה במערכת!</span>
            </div>
          )}

          {aliTestResult && (
            <div
              className={`p-4 rounded-2xl border text-xs leading-relaxed space-y-2 animate-in fade-in ${
                aliTestResult.success
                  ? "bg-emerald-50/80 border-emerald-200 text-emerald-900"
                  : "bg-rose-50 border-rose-200 text-rose-900"
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {aliTestResult.success ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>בדיקת חיבור הצליחה!</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>בדיקת חיבור נכשלה!</span>
                  </>
                )}
              </div>
              <p className="text-xs">{aliTestResult.message}</p>
              {!aliTestResult.success && (
                <div className="text-[11px] text-rose-700/90 pt-1 space-y-1">
                  <p className="font-bold">טיפים לפתרון ב-AliExpress Portals:</p>
                  <ul className="list-disc list-inside space-y-0.5 pr-2">
                    <li>ודא שהסטטוס של האפליקציה ב-Portals הוא <strong>Online / Approved</strong> ולא Testing.</li>
                    <li>ודא שחבילת <strong>Affiliate API</strong> מאושרת לאפליקציה.</li>
                    <li>ודא ששדה <strong>IP White List</strong> בהגדרות האפליקציה ב-AliExpress ריק.</li>
                    <li>ודא שה-Tracking ID תואם בדיוק ל-Tracking ID שקיים בחשבונך.</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </form>
      </section>

      {/* Deal Request Widget ("אתם מבקשים — אנחנו מוצאים!") Control Card */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-ali-600" />
            <h2 className="font-bold text-base text-slate-900">ווידג&apos;ט צף: &quot;אתם מבקשים — אנחנו מוצאים!&quot;</h2>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
              enableDealRequest
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-rose-50 text-rose-700 border border-rose-200"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                enableDealRequest ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            {enableDealRequest ? "מופעל באתר" : "מכובה לחלוטין"}
          </span>
        </div>

        <form onSubmit={handleSaveDealRequest} className="space-y-4">
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <input
              type="checkbox"
              id="enableDealRequest"
              checked={enableDealRequest}
              onChange={(e) => setEnableDealRequest(e.target.checked)}
              className="w-5 h-5 rounded text-ali-600 focus:ring-ali-500 border-slate-300 cursor-pointer"
            />
            <label htmlFor="enableDealRequest" className="text-xs font-bold text-slate-800 cursor-pointer">
              הצג את ווידג&apos;ט &quot;אתם מבקשים — אנחנו מוצאים!&quot; לגולשים באתר
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                כותרת הווידג&apos;ט
              </label>
              <input
                type="text"
                value={dealRequestTitle}
                onChange={(e) => setDealRequestTitle(e.target.value)}
                placeholder="אתם מבקשים — אנחנו מוצאים!"
                className="w-full p-3 rounded-xl border border-slate-300 font-bold text-xs text-slate-900 focus:border-ali-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                קישור שיחת טלגרם (Bot / Channel URL)
              </label>
              <input
                type="text"
                value={dealRequestUrl}
                onChange={(e) => setDealRequestUrl(e.target.value)}
                placeholder="https://t.me/AliDealsIL?start=site_deal_request"
                className="w-full p-3 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:border-ali-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="submit"
              disabled={isSavingDealRequest}
              className="px-6 py-3 bg-ali-600 hover:bg-ali-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
            >
              {isSavingDealRequest ? "שומר..." : "שמור הגדרות ווידג'ט"}
            </button>
          </div>

          {dealRequestSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>הגדרות הווידג&apos;ט עודכנו בהצלחה!</span>
            </div>
          )}
        </form>
      </section>

      {/* Vercel Environment Variables Guide */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Globe className="w-5 h-5 text-ali-600" />
          <h2 className="font-bold text-base text-slate-900">תצורת Vercel ומשתני סביבה (Environment Variables)</h2>
        </div>

        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            האתר מחובר ופועל על תשתית Vercel Serverless בדומיין <code>ali-deals.co.il</code>.
            ב-Vercel Dashboard תחת <strong>Settings &gt; Environment Variables</strong>, מוגדרים המפתחות הבאים:
          </p>

          <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] space-y-2">
            <div className="text-slate-400"># מזהה Google Analytics 4 (אופציונלי כ-ENV או נשמר ב-CMS למעלה)</div>
            <div className="text-emerald-400">NEXT_PUBLIC_GA_ID=&quot;{gaId || "G-XXXXXXXXXX"}&quot;</div>
            <div className="pt-2 text-slate-400"># מפתח Google Gemini API לג&apos;נרוט סקירות ותובנות</div>
            <div className="text-emerald-400">GEMINI_API_KEY=&quot;AIzaSy...&quot;</div>
            <div className="pt-2 text-slate-400"># מפתחות AliExpress Open Platform</div>
            <div className="text-emerald-400">ALIEXPRESS_APP_KEY=&quot;545964&quot;</div>
            <div className="text-emerald-400">ALIEXPRESS_APP_SECRET=&quot;2kUm0i4...&quot;</div>
            <div className="text-emerald-400">ALIEXPRESS_TRACKING_ID=&quot;default&quot;</div>
            <div className="pt-2 text-slate-400"># סיסמת כניסה ל-CMS</div>
            <div className="text-emerald-400">ADMIN_PASSWORD=&quot;alideals2025&quot;</div>
          </div>
        </div>
      </section>
    </div>
  );
}
