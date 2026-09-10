"use client";

import { useState, useEffect } from "react";
import { Calculator, ShieldCheck, AlertTriangle, CheckCircle2, ArrowRightLeft, RefreshCw } from "lucide-react";

export default function CustomsCalculator() {
  const [currencyMode, setCurrencyMode] = useState<"usd" | "ils">("usd");
  const [inputValue, setInputValue] = useState<string>("45");
  const [ilsRate, setIlsRate] = useState<number>(3.65);
  const [rateSource, setRateSource] = useState<string>("default");
  const [isLoadingRate, setIsLoadingRate] = useState<boolean>(false);

  // Fetch live exchange rate
  useEffect(() => {
    setIsLoadingRate(true);
    fetch("/api/currency")
      .then((res) => res.json())
      .then((data) => {
        if (data?.rate && typeof data.rate === "number") {
          setIlsRate(data.rate);
          setRateSource(data.source || "live");
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingRate(false));
  }, []);

  const numVal = parseFloat(inputValue) || 0;

  // Calculate USD and ILS amounts
  const priceUsd = currencyMode === "usd" ? numVal : Math.round((numVal / ilsRate) * 100) / 100;
  const priceIls = currencyMode === "ils" ? numVal : Math.round(numVal * ilsRate * 10) / 10;

  // $2 Safety Margin Buffer:
  // - Safe: priceUsd <= 73.00
  // - Buffer: 73.00 < priceUsd <= 75.00
  // - Taxable: priceUsd > 75.00
  const isSafeZone = priceUsd > 0 && priceUsd <= 73.0;
  const isBufferZone = priceUsd > 73.0 && priceUsd <= 75.0;
  const isTaxable = priceUsd > 75.0;

  const vatAmountUsd = isTaxable ? (priceUsd * 0.17).toFixed(2) : "0";
  const vatAmountIls = Math.round(parseFloat(vatAmountUsd) * ilsRate);

  const thresholdInIls = Math.round(75 * ilsRate);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-6 sm:p-8 shadow-xl border border-slate-800 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ali-600/20 text-ali-400 flex items-center justify-center border border-ali-500/30">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-white">מחשבון מכס, מע&quot;מ ושער דולר חי</h3>
            <p className="text-xs text-slate-400">
              בדקו האם המוצר פטור ממס לפי שער נוכחי (רף הפטור בישראל: 75$ = כ-₪{thresholdInIls})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
            <span>שער חי: 1$ = ₪{ilsRate}</span>
            {isLoadingRate && <RefreshCw className="w-3 h-3 animate-spin text-ali-400" />}
          </div>
          <button
            type="button"
            onClick={() => {
              setCurrencyMode(currencyMode === "usd" ? "ils" : "usd");
              setInputValue(currencyMode === "usd" ? priceIls.toString() : priceUsd.toString());
            }}
            className="flex items-center gap-1 text-xs font-bold text-ali-400 hover:text-ali-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>החלף ל{currencyMode === "usd" ? 'ש"ח' : "דולר"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
        {/* Input Block */}
        <div className="space-y-2">
          <label htmlFor="customs-price-input" className="block text-xs font-semibold text-slate-300">
            {currencyMode === "usd"
              ? "הזן מחיר באלי אקספרס (בדולר $):"
              : 'הזן סכום בשקלים (ש"ח ₪):'}
          </label>
          <div className="relative">
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
              {currencyMode === "usd" ? "$" : "₪"}
            </span>
            <input
              id="customs-price-input"
              type="number"
              min="0.1"
              step={currencyMode === "usd" ? "0.01" : "1"}
              max="15000"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pr-10 pl-4 py-3 text-xl font-bold text-white focus:outline-none focus:border-ali-500 focus:ring-1 focus:ring-ali-500 transition-all text-right font-mono"
              placeholder={currencyMode === "usd" ? "45" : "165"}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>ערך מקביל:</span>
            <span className="font-bold text-slate-200 font-mono">
              {currencyMode === "usd" ? `₪${priceIls}` : `$${priceUsd}`}
            </span>
          </div>
        </div>

        {/* Calculation Result & Buffer Warning */}
        <div className="rounded-xl p-5 border transition-all bg-slate-800/40 border-slate-700/80">
          {numVal <= 0 ? (
            <p className="text-xs text-slate-400 text-center py-2">הזינו סכום כדי לחשב זכאות לפטור</p>
          ) : isSafeZone ? (
            <div className="space-y-2 text-emerald-400">
              <div className="flex items-center gap-2 font-bold text-base">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>פטור מלא ממע&quot;מ ומכס! 🎉</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                מחיר המוצר (${priceUsd}) נמוך משמעותית מרף ה-75$. החבילה תשוחרר בישראל ללא תשלום מס נוסף.
              </p>
              <div className="pt-1 text-[11px] text-emerald-300 font-semibold font-mono">
                עלות סופית: כ-₪{priceIls} בלבד
              </div>
            </div>
          ) : isBufferZone ? (
            <div className="space-y-2 text-amber-400">
              <div className="flex items-center gap-2 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                <span>זהירות: מרווח ביטחון של 2$ בלבד!</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed font-semibold">
                מחיר המוצר הנוכחי (${priceUsd}) קרוב מאוד לרף ה-75$.
              </p>
              <p className="text-[11px] text-slate-300 leading-relaxed bg-amber-950/40 border border-amber-800/60 p-2.5 rounded-lg">
                ⚠️ <strong>אזהרת מכס:</strong> שער הדולר נקבע ביום שחרור החבילה בארץ. תנודות קלות של אגורות בשער המטבע עלולות להקפיץ את הסכום מעל $75 ולגרור תשלום מע&quot;מ (17%) של כ-₪{Math.round(priceIls * 0.17)}!
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-rose-400">
              <div className="flex items-center gap-2 font-bold text-base">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                <span>חייב בתשלום מע&quot;מ (מעל $75)</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                המחיר (${priceUsd}) עובר את תקרת הפטור. צפוי חיוב במע&quot;מ (17%) בסך כ-<strong>${vatAmountUsd}</strong> (כ-₪{vatAmountIls}) בשחרור החבילה.
              </p>
              <div className="pt-1 text-[11px] text-amber-300 font-medium">
                💡 טיפ: במידה ואתם מזמינים מספר פריטים, מומלץ לפצל להזמנות בהפרש של 72 שעות כדי להישאר מתחת ל-75$!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
