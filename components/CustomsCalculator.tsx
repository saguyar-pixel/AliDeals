"use client";

import { useState } from "react";
import { Calculator, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRight } from "lucide-react";

export default function CustomsCalculator() {
  const [priceUsd, setPriceUsd] = useState<string>("45");

  const parsedPrice = parseFloat(priceUsd) || 0;
  const ilsRate = 3.65;
  const priceIls = Math.round(parsedPrice * ilsRate);
  const isTaxExempt = parsedPrice > 0 && parsedPrice <= 75;
  const vatAmountUsd = parsedPrice > 75 ? (parsedPrice * 0.17).toFixed(2) : "0";
  const vatAmountIls = Math.round(parseFloat(vatAmountUsd) * ilsRate);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ali-600/20 text-ali-400 flex items-center justify-center border border-ali-500/30">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">מחשבון מכס ומע&quot;מ אלי אקספרס בישראל</h3>
            <p className="text-xs text-slate-400">בדקו מיידית האם המוצר שלכם פטור ממס או חייב בתשלום</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-full border border-emerald-800/80">
          <ShieldCheck className="w-4 h-4" />
          <span>רף פטור בישראל: 75$</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {/* Input Block */}
        <div className="space-y-2">
          <label htmlFor="customs-price-input" className="block text-xs font-semibold text-slate-300">
            מחיר המוצר באלי אקספרס (בדולר $):
          </label>
          <div className="relative">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
            <input
              id="customs-price-input"
              type="number"
              min="1"
              max="5000"
              value={priceUsd}
              onChange={(e) => setPriceUsd(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-9 pl-4 py-3 text-xl font-bold text-white focus:outline-none focus:border-ali-500 focus:ring-1 focus:ring-ali-500 transition-all text-right font-mono"
              placeholder="45"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>שווה ערך לערך מוצר בש&quot;ח:</span>
            <span className="font-bold text-slate-200 font-mono">₪{priceIls}</span>
          </div>
        </div>

        {/* Calculation Result */}
        <div className="rounded-xl p-5 border transition-all">
          {parsedPrice <= 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">הזינו מחיר בדולרים כדי לחשב</p>
          ) : isTaxExempt ? (
            <div className="space-y-2 text-emerald-400">
              <div className="flex items-center gap-2 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>פטור מלא ממע&quot;מ ומכס! 🎉</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                המחיר נמוך מ-75$, לכן החבילה תשוחרר בישראל ללא תשלום מס נוסף.
              </p>
              <div className="pt-2 text-[11px] text-emerald-300 font-semibold">
                עלות סופית משוערת: כ-₪{priceIls} בלבד
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-amber-400">
              <div className="flex items-center gap-2 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>חייב במע&quot;מ (מעל $75)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                צפוי חיוב מע&quot;מ (17%) בסך כ-<strong>${vatAmountUsd}</strong> (כ-₪{vatAmountIls}) בכניסה לארץ.
              </p>
              <p className="text-[11px] text-amber-300 font-medium">
                💡 טיפ: אם מדובר במספר מוצרים, פצלו לשתי הזמנות בהפרש של 72 שעות כדי להישאר מתחת ל-75$!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
