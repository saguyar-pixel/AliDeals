"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin route unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6" dir="rtl">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
          <AlertTriangle className="w-7 h-7" />
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-black text-slate-900">אירעה שגיאה בטעינת ממשק הניהול</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            חלק מהממשק נתקל בבעיה זמנית בעת טעינת הנתונים או הרינדור.
          </p>
          {error?.message && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-right text-[11px] text-slate-700 font-mono break-words">
              {error.message}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>נסה שוב</span>
          </button>
          <Link
            href="/admin"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>חזרה לדשבורד</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
