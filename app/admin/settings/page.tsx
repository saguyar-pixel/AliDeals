"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Settings, Key, Globe, CheckCircle2, BarChart3, ArrowLeft, ShieldCheck, Sparkles, Search, TrendingUp, Cpu, ShoppingBag, AlertCircle, RefreshCw } from "lucide-react";

export default function AdminSettingsPage() {
  const [gaId, setGaId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  // Gemini AI Key States
  const [geminiKey, setGeminiKey] = useState("");
  const [isSavingGemini, setIsSavingGemini] = useState(false);
  const [geminiSaveSuccess, setGeminiSaveSuccess] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.gaMeasurementId) {
          setGaId(data.settings.gaMeasurementId);
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
    } catch {
      alert("שגיאת תקשורת");
    } finally {
      setIsSavingAli(false);
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
            <div className="flex gap-2">
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value.trim())}
                placeholder="AIzaSy..."
                className="flex-1 p-3 rounded-xl border border-slate-300 font-mono text-xs font-bold text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isSavingGemini}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
              >
                {isSavingGemini ? "שומר..." : "שמור מפתח"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              ניתן להפיק מפתח בחינם ב-Google AI Studio בכתובת aistudio.google.com. המפתח מחבר את מודל Gemini 2.5 Flash ומאפשר לאלון וכל הסוכנים לנמק, לענות לשאלות, לכתוב סקירות ולהפעיל לופים אוטונומיים.
            </p>
          </div>

          {geminiSaveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>מפתח ה-Gemini נשמר בהצלחה! מודל Gemini 2.5 Flash מחובר כעת לאלון.</span>
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
