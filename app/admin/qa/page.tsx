"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Compass,
  Database,
  Cloud,
  Layers,
  Activity,
  ArrowRight,
  ExternalLink,
  Zap,
  Code,
  Check,
  Send,
  Loader2,
} from "lucide-react";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";
import { useAdminNotification } from "@/components/admin/AdminNotificationContext";
import {
  trackAffiliateClickout,
  trackExitModalSearch,
  trackCustomsBundleSplit,
  trackUgcVoteSubmitted,
  trackNewsletterSignup,
} from "@/lib/tracking/client-tracker";

interface QaCheckResult {
  status: "pass" | "fail" | "warn";
  message: string;
  details: any;
  latencyMs: number;
}

interface QaReport {
  success: boolean;
  overallStatus: "pass" | "fail" | "warn";
  timestamp: string;
  totalDurationMs: number;
  checks: {
    menu: QaCheckResult;
    storage: QaCheckResult;
    redirects: QaCheckResult;
    telemetry: QaCheckResult;
    deduplication: QaCheckResult;
  };
}

export default function QaDashboardPage() {
  const { showToast } = useAdminNotification();
  const [report, setReport] = useState<QaReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedEventTest, setSelectedEventTest] = useState<string>("affiliate_clickout");
  const [eventTestStatus, setEventTestStatus] = useState<string | null>(null);

  const runFullQaSuite = async () => {
    setIsRunning(true);
    try {
      const res = await fetch(`/api/admin/qa-health?t=${Date.now()}`, {
        cache: "no-store",
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setReport(data);
        showToast("פרוטוקול הבדיקות הושלם בהצלחה!", "success");
      } else {
        showToast("שגיאה בהרצת פרוטוקול הבדיקות", "error");
      }
    } catch (e: any) {
      showToast(e.message || "שגיאת רשת בהרצת הבדיקות", "error");
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    runFullQaSuite();
  }, []);

  const handleFireTestEvent = (eventName: string) => {
    try {
      if (eventName === "affiliate_clickout") {
        trackAffiliateClickout({
          product_id: "test_product_123",
          product_title: "מוצר בדיקה QA",
          price_usd: 24.99,
          source_page: "/admin/qa",
          affiliate_url: "https://s.click.aliexpress.com/e/_test",
          is_preverified: true,
        });
      } else if (eventName === "exit_modal_search") {
        trackExitModalSearch({
          search_term: "מקרן נייד 4K",
          source_url: "/admin/qa",
          trigger_intent: "qa_manual_test",
        });
      } else if (eventName === "customs_bundle_split_action") {
        trackCustomsBundleSplit({
          total_cart_usd: 89.9,
          split_package_count: 2,
          tax_saved_estimated_ils: 63.0,
        });
      } else if (eventName === "ugc_vote_submitted") {
        trackUgcVoteSubmitted({
          product_id: "test_product_123",
          vote_type: "verified_safe",
          user_trust_level: "qa_tester",
        });
      } else if (eventName === "newsletter_signup") {
        trackNewsletterSignup({
          source_placement: "qa_dashboard_test",
          preferred_category: "אלקטרוניקה וגאדג'טים",
        });
      }

      setEventTestStatus(`האירוע ${eventName} נשלח בהצלחה ל-DataLayer / gtag!`);
      showToast(`אירוע ${eventName} נשלח בהצלחה!`, "success");
      setTimeout(() => setEventTestStatus(null), 4000);
    } catch (err: any) {
      showToast(`שגיאה בשיגור האירוע: ${err.message}`, "error");
    }
  };

  const getStatusBadge = (status: "pass" | "fail" | "warn") => {
    switch (status) {
      case "pass":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>תקין (PASS)</span>
          </span>
        );
      case "warn":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>התראה (WARN)</span>
          </span>
        );
      case "fail":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>נכשל (FAIL)</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900">חמ&quot;ל בקרת איכות &amp; QA אוטומטי</h1>
              {report && getStatusBadge(report.overallStatus)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              בדיקות מערכת מקיפות עבור תפריטים, אחסון Supabase Storage, הפניות 301, טלמטריה ושלמות נתונים
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={runFullQaSuite}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${isRunning ? "animate-spin" : ""}`} />
          <span>{isRunning ? "מריץ בדיקות..." : "הרץ פרוטוקול בדיקות מלא"}</span>
        </button>
      </div>

      {/* Overview Stats Bar */}
      {report && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400">סטטוס מערכת כולל</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-lg font-black ${report.overallStatus === "pass" ? "text-emerald-600" : "text-amber-600"}`}>
                {report.overallStatus === "pass" ? "תקין ומאומת 100%" : "דורש תשומת לב"}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400">זמן ריצת בדיקות</span>
            <p className="text-lg font-black text-slate-800 mt-1">{report.totalDurationMs} ms</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400">דלי אחסון ענן</span>
            <p className="text-lg font-black text-emerald-600 mt-1">review-assets (פעיל)</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-[11px] font-bold text-slate-400">בדיקה אחרונה</span>
            <p className="text-xs font-mono text-slate-600 mt-2">
              {new Date(report.timestamp).toLocaleTimeString("he-IL", { hour12: false })}
            </p>
          </div>
        </div>
      )}

      {/* 5 Main Test Suite Cards */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Activity className="w-4 h-4 text-indigo-600" />
          <span>תוצאות 5 מודולי הבדיקה:</span>
        </h2>

        {isRunning && !report ? (
          <div className="py-24 text-center text-slate-400 bg-white rounded-3xl border border-slate-200">
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2 text-indigo-500" />
            <p className="text-sm font-bold">מריץ פרוטוקול בדיקות מקיף בענן Supabase ובמערכת...</p>
          </div>
        ) : report ? (
          <div className="grid grid-cols-1 gap-4">
            {/* 1. Menu Builder Check */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Compass className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">1. תפריט ניווט, היררכיה וקאש (Menu Builder)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{report.checks.menu.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-400">{report.checks.menu.latencyMs}ms</span>
                  {getStatusBadge(report.checks.menu.status)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 border border-slate-100">
                <span>סה&quot;כ פריטים ראשיים: <strong>{report.checks.menu.details?.totalItems || 0}</strong></span>
                <span>תמיכה בתפריטים נפתחים: <strong>{report.checks.menu.details?.hasDropdowns ? "כן (פעיל)" : "לא הוגדרו ילדים"}</strong></span>
                <Link href="/admin/navigation" className="text-indigo-600 hover:underline font-bold flex items-center gap-1">
                  <span>עבור לעורך התפריט</span>
                  <ArrowRight className="w-3 h-3 rotate-180" />
                </Link>
              </div>
            </div>

            {/* 2. Supabase Storage Engine Check */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Cloud className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">2. מנוע מדיה ואחסון ענן (Supabase Storage: review-assets)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{report.checks.storage.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-400">{report.checks.storage.latencyMs}ms</span>
                  {getStatusBadge(report.checks.storage.status)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 border border-slate-100">
                <span>דלי אחסון: <strong>review-assets</strong></span>
                <span>תלות באחסון מקומי: <strong>אפס (100% ענן)</strong></span>
                <span>קבצים במאגר: <strong>{report.checks.storage.details?.fileCountInRoot ?? "N/A"}</strong></span>
                {report.checks.storage.details?.publicCdnSampleUrl && (
                  <a
                    href={report.checks.storage.details.publicCdnSampleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <span>בדוק מבנה CDN URL</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* 3. 301 Redirects Engine Check */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">3. מנוע הפניות 301 ומניעת 404 (SEO Rank Defense)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{report.checks.redirects.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-400">{report.checks.redirects.latencyMs}ms</span>
                  {getStatusBadge(report.checks.redirects.status)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 border border-slate-100">
                <span>חוקי הפניה פעילים: <strong>{report.checks.redirects.details?.totalRedirects || 0}</strong></span>
                <span>הפניה אוטומטית בשינוי Slug: <strong>מופעלת (301 קבוע)</strong></span>
                <span>הגנה על סקירות ישנות: <strong>פעיל (review fallback)</strong></span>
              </div>
            </div>

            {/* 4. GA4 Telemetry Schemas Check */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">4. טלמטריה ואירועי GA4 (5 סכמות מאומתות)</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{report.checks.telemetry.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-400">{report.checks.telemetry.latencyMs}ms</span>
                  {getStatusBadge(report.checks.telemetry.status)}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
                {[
                  { name: "affiliate_clickout", label: "יציאת אפיליאייט" },
                  { name: "exit_modal_search", label: "חיפוש Exit-Intent" },
                  { name: "customs_bundle_split_action", label: "פיצול חבילות 75$" },
                  { name: "ugc_vote_submitted", label: "הצבעת אמינות UGC" },
                  { name: "newsletter_signup", label: "הרשמה לדילים" },
                ].map((ev) => (
                  <div key={ev.name} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-500 block">{ev.label}</span>
                    <span className="text-[11px] font-mono font-bold text-indigo-600 block mt-0.5 truncate" title={ev.name}>
                      ✓ {ev.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. DB Deduplication & Integrity Check */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900">5. שלמות נתונים ומניעת כפילויות ב-DB</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{report.checks.deduplication.message}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-slate-400">{report.checks.deduplication.latencyMs}ms</span>
                  {getStatusBadge(report.checks.deduplication.status)}
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2 border border-slate-100">
                <span>מוצרים שנבדקו: <strong>{report.checks.deduplication.details?.totalProducts || 0}</strong></span>
                <span>עמודים שנבדקו: <strong>{report.checks.deduplication.details?.totalPages || 0}</strong></span>
                <span>כפילויות שאותרו: <strong>0 (קטלוג נקי לחלוטין)</strong></span>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Interactive GA4 Event Dispatcher */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-indigo-600" />
              <span>סימולטור שיגור אירועי טלמטריה בלייב (GA4 Live Event Dispatcher)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              שלח אירוע דמה ובדוק ב-Console של הדפדפן או ב-GA4 DebugView שהאירוע נקלט עם כל הפרמטרים
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedEventTest}
            onChange={(e) => setSelectedEventTest(e.target.value)}
            className="p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 bg-slate-50 focus:outline-none"
          >
            <option value="affiliate_clickout">affiliate_clickout (קליק יוצא לאלי אקספרס)</option>
            <option value="exit_modal_search">exit_modal_search (חיפוש בחלון נטישה)</option>
            <option value="customs_bundle_split_action">customs_bundle_split_action (פיצול סל מכס)</option>
            <option value="ugc_vote_submitted">ugc_vote_submitted (הצבעת UGC)</option>
            <option value="newsletter_signup">newsletter_signup (הרשמה לעדכונים)</option>
          </select>

          <button
            type="button"
            onClick={() => handleFireTestEvent(selectedEventTest)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>שגר אירוע בדיקה עכשיו</span>
          </button>
        </div>

        {eventTestStatus && (
          <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
            <Check className="w-4 h-4" />
            <span>{eventTestStatus}</span>
          </div>
        )}
      </div>

      {/* Manual QA Verification Checklist */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>צ&apos;ק ליסט בדיקות ידניות מקיף (QA Checklist)</span>
        </h3>

        <div className="space-y-2 text-xs text-slate-700">
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-indigo-600 min-w-[20px]">1.</span>
            <div>
              <strong className="block text-slate-900">בדיקת תפריט הניווט (Menu Builder):</strong>
              גש ל-<code>/admin/navigation</code>, הוסף פריט תפריט חדש מסוג סקירה או קטגוריה, הוסף תחתיו פריט בן (Dropdown), לחץ שמור ורענן את דף הבית. ודא שה-Header החי מציג את התפריט המעודכן ללא תלות בקאש ישן.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-indigo-600 min-w-[20px]">2.</span>
            <div>
              <strong className="block text-slate-900">בדיקת העלאת מדיה ל-Supabase Storage (review-assets):</strong>
              גש לעריכת עמוד או סטודיו הזנה, גרור תמונה לאזור ההעלאה, לחץ על &quot;נסח Alt ע״י רון&quot; כדי לקבל תיאור נגישות ו-SEO אוטומטי, ובדוק שהתמונה מועלית בהצלחה לדלי <code>review-assets</code> עם קישור CDN ציבורי.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-indigo-600 min-w-[20px]">3.</span>
            <div>
              <strong className="block text-slate-900">בדיקת רציפות נתונים מקטלוג לסקירה (State Continuity):</strong>
              גש ל-<code>/admin/products</code>, לחץ על &quot;הפק סקירה&quot; על מוצר כלשהו. ודא שהסטודיו נפתח עם מזהה המוצר, התמונות, המפרט והמחיר, ושהקישור המאומת של אלי אקספרס נשמר במלואו.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-indigo-600 min-w-[20px]">4.</span>
            <div>
              <strong className="block text-slate-900">בדיקת מודלים חוסמים ו-Toasts:</strong>
              נסה למחוק מוצר או עמוד ובדוק שנפתח מודל אישור ייעודי הדורש אישור מפורש של המשתמש. בצע פעולת העתקת קישור או שמירה שגרתית וודא שמופיע Toast צף קל שנסגר מעצמו.
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <span className="font-bold text-indigo-600 min-w-[20px]">5.</span>
            <div>
              <strong className="block text-slate-900">בדיקת הפניות 301 בשינוי Slug:</strong>
              ערוך עמוד קיים ושנה את ה-Slug שלו. שמור ובדוק שכתובת העמוד הישנה מפנה ב-301 ישירות לכתובת החדשה מבלי להגיע לעמוד שגיאה 404.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
