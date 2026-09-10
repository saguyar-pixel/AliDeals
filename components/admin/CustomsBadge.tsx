"use client";

import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from "lucide-react";

interface CustomsBadgeProps {
  priceUsd: number;
  exchangeRate?: number; // default ~3.65
  showDetails?: boolean;
}

export function CustomsBadge({ priceUsd, exchangeRate = 3.65, showDetails = false }: CustomsBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const priceIls = Math.round(priceUsd * exchangeRate * 10) / 10;
  const maxSafeIls = Math.round(73.0 * exchangeRate * 10) / 10;
  const maxLimitIls = Math.round(75.0 * exchangeRate * 10) / 10;

  // 3-Tier Classification
  // Tier 1: Safe exempt (<= 73.00)
  // Tier 2: Caution buffer (73.01 - 75.00) -> 2$ Safety Margin Warning
  // Tier 3: Taxable (> 75.00)
  const isSafe = priceUsd <= 73.0;
  const isWarningBuffer = priceUsd > 73.0 && priceUsd <= 75.0;
  const isTaxable = priceUsd > 75.0;

  return (
    <div className="relative inline-block text-right" dir="rtl">
      {/* Badge Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all shadow-sm ${
          isSafe
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            : isWarningBuffer
            ? "bg-amber-500 text-white border border-amber-600 animate-pulse shadow-amber-500/20 hover:bg-amber-600"
            : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
        }`}
        title="לחץ לצפייה במחשבון מכס ומרווח ביטחון"
      >
        {isSafe && <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
        {isWarningBuffer && <AlertTriangle className="w-3.5 h-3.5 text-white" />}
        {isTaxable && <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />}

        <span>
          {isSafe && "פטור מלא ממכס ומע\"מ"}
          {isWarningBuffer && "אזהרה: מרווח 2$ מסף מכס"}
          {isTaxable && "חייב במע\"מ ומכס (מעל 75$)"}
        </span>

        <HelpCircle className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* Warning Box Always Visible if buffer & showDetails is true */}
      {showDetails && isWarningBuffer && (
        <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-950">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>אזהרת מרווח ביטחון (רגישות לשער הדולר):</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            מחיר המוצר (${priceUsd.toFixed(2)} / כ-₪{priceIls}) נמצא בטווח של פחות מ-2$ מסף המכס (75$).
            תנודה יומית קלה בשער החליפין של הדולר או שער יציג ביום השחרור בנתב&quot;ג עשויים לחייב את הקונה במע&quot;מ 17% ובדמי טיפול דואר!
          </p>
        </div>
      )}

      {/* Expanded Modal / Tooltip Popover */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-72 p-4 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 text-xs space-y-3 right-0">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-sm">מחשבון מכס ומרווח ביטחון</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-bold"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1.5 font-mono text-[11px]">
            <div className="flex justify-between text-slate-300">
              <span>מחיר מוצר בדולר:</span>
              <span className="font-bold text-white">${priceUsd.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>שער המרה מחושב:</span>
              <span>₪{exchangeRate.toFixed(2)} לדולר</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>מחיר משוער בש&quot;ח:</span>
              <span className="font-bold text-emerald-400">₪{priceIls}</span>
            </div>
            <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
              <span>תקרת פטור ממכס (75$):</span>
              <span>עד כ-₪{maxLimitIls}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>סף ביטחון מומלץ (73$):</span>
              <span>עד כ-₪{maxSafeIls}</span>
            </div>
          </div>

          {isWarningBuffer && (
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] leading-relaxed">
              ⚠️ <strong>שים לב:</strong> המוצר נמצא במרווח הביטחון של 2$. מומלץ לציין זאת לרוכש כדי למנוע עוגמת נפש אם שער הדולר יעלה.
            </div>
          )}

          {isTaxable && (
            <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-[11px] leading-relaxed">
              🛑 <strong>מעל תקרת הפטור:</strong> חבילה זו חייבת ב-17% מע&quot;מ ואגרות שחרור דואר (כ-₪35-₪50 נוספים).
            </div>
          )}

          {isSafe && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] leading-relaxed">
              ✓ <strong>בטוח להזמנה:</strong> מתחת ל-73$, פטור מלא מתשלום מסים ביבוא אישי לישראל.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
