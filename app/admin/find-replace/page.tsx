"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Replace,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  FileText,
  Package,
  Layers,
} from "lucide-react";

interface MatchItem {
  type: "page" | "product";
  id: string;
  title: string;
  field: string;
  snippet: string;
}

export default function FindReplacePage() {
  const [findText, setFindText] = useState("");
  const [replaceText, setReplaceText] = useState("");
  const [scope, setScope] = useState<"all" | "pages" | "products">("all");
  const [isScanning, setIsScanning] = useState(false);
  const [isReplacing, setIsReplacing] = useState(false);
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [hasScanned, setHasScanned] = useState(false);
  const [resultSummary, setResultSummary] = useState<{
    updatedPagesCount: number;
    updatedProductsCount: number;
  } | null>(null);

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!findText.trim()) return;

    setIsScanning(true);
    setResultSummary(null);

    try {
      const res = await fetch("/api/admin/find-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findText: findText.trim(),
          replaceText: replaceText.trim(),
          scope,
          dryRun: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setMatches(data.matches || []);
        setHasScanned(true);
      } else {
        alert(data.error || "שגיאה בסריקה");
      }
    } catch {
      alert("שגיאת תקשורת עם השרת");
    } finally {
      setIsScanning(false);
    }
  };

  const handleExecuteReplace = async () => {
    if (!confirm(`האם אתה בטוח שברצונך להחליף את כל ${matches.length} המופעים שנמצאו בכל האתר?`)) {
      return;
    }

    setIsReplacing(true);
    try {
      const res = await fetch("/api/admin/find-replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          findText: findText.trim(),
          replaceText: replaceText.trim(),
          scope,
          dryRun: false,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResultSummary({
          updatedPagesCount: data.updatedPagesCount,
          updatedProductsCount: data.updatedProductsCount,
        });
        setMatches([]);
        setHasScanned(false);
      } else {
        alert(data.error || "שגיאה בביצוע ההחלפה");
      }
    } catch {
      alert("שגיאת תקשורת עם השרת");
    } finally {
      setIsReplacing(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">
              כלי מנהל מתקדם
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            חיפוש והחלפה גלובלי (Find & Replace)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            החלף קישורי אפיליאציה ישנים, מילים, שמות מותגים או קודי קופון בכל העמודים והמוצרים במכה אחת.
          </p>
        </div>

        <Link
          href="/admin/pages"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold"
        >
          <ArrowRight className="w-4 h-4 rotate-180" />
          <span>חזרה לעמודים</span>
        </Link>
      </div>

      {/* Result Notification */}
      {resultSummary && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p>
              ההחלפה הגורפת הושלמה בהצלחה! עודכנו {resultSummary.updatedPagesCount} עמודים ו-
              {resultSummary.updatedProductsCount} מוצרים.
            </p>
            <span className="text-[11px] text-emerald-700 font-normal">
              השינויים נשמרו ונפרסים אוטומטית לענן Vercel.
            </span>
          </div>
        </div>
      )}

      {/* Main Input Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <form onSubmit={handleScan} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-xs text-slate-800 mb-1">
                טקסט או קישור לחיפוש (Find)
              </label>
              <input
                type="text"
                value={findText}
                onChange={(e) => setFindText(e.target.value)}
                placeholder="למשל: https://s.click.aliexpress.com/e/_c3mWr0KH או מילה..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-ali-500 bg-slate-50 focus:bg-white"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-xs text-slate-800 mb-1">
                החלף ב... (Replace With)
              </label>
              <input
                type="text"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="למשל: https://s.click.aliexpress.com/e/_c3cHfEE5..."
                className="w-full p-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none focus:border-ali-500 bg-slate-50 focus:bg-white"
              />
            </div>
          </div>

          {/* Scope Selector */}
          <div className="flex flex-wrap items-center gap-4 pt-2 text-xs">
            <span className="font-bold text-slate-700">היקף החיפוש:</span>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === "all"}
                onChange={() => setScope("all")}
                className="text-ali-600 focus:ring-ali-500"
              />
              <span>כל האתר (עמודים + מאגר מוצרים)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === "pages"}
                onChange={() => setScope("pages")}
                className="text-ali-600 focus:ring-ali-500"
              />
              <span>עמודי תוכן בלבד (מאמרים ו-TOP 5)</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="scope"
                checked={scope === "products"}
                onChange={() => setScope("products")}
                className="text-ali-600 focus:ring-ali-500"
              />
              <span>קישורי מוצרים בלבד (קטלוג)</span>
            </label>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="submit"
              disabled={isScanning || !findText.trim()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
            >
              <Search className="w-4 h-4" />
              <span>{isScanning ? "סורק את כל האתר..." : "סרוק והצג תצוגה מקדימה"}</span>
            </button>

            {hasScanned && matches.length > 0 && (
              <button
                type="button"
                onClick={handleExecuteReplace}
                disabled={isReplacing}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-md shadow-ali-600/20 transition-all disabled:opacity-50"
              >
                <Replace className="w-4 h-4" />
                <span>
                  {isReplacing ? "מבצע החלפה..." : `בצע החלפה לכל ${matches.length} המופעים!`}
                </span>
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Matches Results Preview */}
      {hasScanned && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>תוצאות הסריקה:</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs">
                {matches.length} התאמות נמצאו
              </span>
            </h3>
          </div>

          {matches.length === 0 ? (
            <div className="bg-white p-8 rounded-3xl border border-slate-200 text-center text-xs text-slate-500">
              לא נמצאו מופעים של המחרוזת המבוקשת.
            </div>
          ) : (
            <div className="space-y-2">
              {matches.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          item.type === "page"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {item.type === "page" ? "עמוד" : "מוצר"}
                      </span>
                      <h4 className="font-bold text-slate-900 truncate">{item.title}</h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        (שדה: {item.field})
                      </span>
                    </div>
                    <p className="font-mono text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 overflow-x-auto" dir="ltr">
                      {item.snippet}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
