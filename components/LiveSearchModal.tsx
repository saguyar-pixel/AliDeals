"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import Image from "next/image";
import { Search, X, Star, ShieldCheck, ShoppingBag, ExternalLink, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface SearchProduct {
  aliId: string;
  title: string;
  priceUsd: number;
  priceIls: number;
  originalPriceUsd: number;
  discountPercent: number;
  rating: number;
  ordersCount: number;
  mainImage: string;
  storeName: string;
  aliUrl: string;
  affiliateUrl: string;
  underCustomsLimit: boolean;
}

interface LiveSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const POPULAR_SUGGESTIONS = [
  { label: "מקרן נייד", query: "mini projector" },
  { label: "אוזניות אלחוטיות", query: "wireless earbuds" },
  { label: "שעון חכם", query: "smart watch" },
  { label: "שואב רובוטי", query: "robot vacuum" },
  { label: "בייבי מוניטור", query: "baby monitor" },
  { label: "רחפן עם מצלמה", query: "drone 4k camera" },
];

export default function LiveSearchModal({ isOpen, onClose }: LiveSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Global Esc key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const executeSearch = async (query: string) => {
    const clean = query.trim();
    if (!clean) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage("");
    setHasSearched(true);

    try {
      const res = await fetch(`/api/live-search?q=${encodeURIComponent(clean)}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.results)) {
        setResults(data.results);
      } else {
        setResults([]);
        if (data.error) {
          setErrorMessage(data.error);
        }
      }
    } catch (err: any) {
      console.error("Live search failed:", err);
      setErrorMessage("אירעה שגיאה בטעינת תוצאות החיפוש. נסה שוב בעוד רגע.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (val: string) => {
    setSearchTerm(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      executeSearch(val);
    }, 400);
  };

  const handleSuggestionClick = (query: string) => {
    setSearchTerm(query);
    executeSearch(query);
  };

  const handleClear = () => {
    setSearchTerm("");
    setResults([]);
    setHasSearched(false);
    setErrorMessage("");
    inputRef.current?.focus();
  };

  const trackProductClick = (prod: SearchProduct) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "live_search_clickout", {
        product_id: prod.aliId,
        product_title: prod.title,
        price_usd: prod.priceUsd,
        sub_id: "live_search_result",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 sm:my-10 flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute right-4 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && executeSearch(searchTerm)}
                placeholder="חפש מוצר באלי אקספרס (למשל: mini projector, smartwatch, drone, או בעברית)..."
                className="w-full pr-12 pl-10 py-3.5 rounded-2xl bg-white border border-slate-200 focus:border-ali-500 focus:ring-4 focus:ring-ali-500/10 text-slate-900 text-sm sm:text-base placeholder:text-slate-400 outline-none transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="absolute left-3 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-3 rounded-2xl text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              title="סגור חלון חיפוש (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Quick Suggestions & English Tips */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-1.5 text-slate-600">
              <span className="font-semibold text-slate-500 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-ali-500" />
                חיפושים חמים:
              </span>
              {POPULAR_SUGGESTIONS.map((item) => (
                <button
                  key={item.query}
                  type="button"
                  onClick={() => handleSuggestionClick(item.query)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 hover:border-ali-400 hover:text-ali-600 text-slate-700 font-medium transition-colors"
                >
                  {item.label}
                </button>
              ))}
            </div>

            <span className="text-[11px] text-slate-400 bg-white/80 px-2 py-0.5 rounded border border-slate-200">
              💡 טיפ: חיפוש באנגלית יניב תוצאות עשירות במיוחד
            </span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Loading state */}
          {isLoading && (
            <div className="py-20 flex flex-col items-center justify-center space-y-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-ali-500" />
              <p className="text-sm font-medium text-slate-600">מחפש מוצרים בזמן אמת ב-AliExpress API...</p>
            </div>
          )}

          {/* Error Message */}
          {!isLoading && errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Empty Initial State */}
          {!isLoading && !hasSearched && (
            <div className="py-16 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-ali-50 text-ali-600 flex items-center justify-center mx-auto shadow-inner">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">חיפוש ישיר מתוך קטלוג AliExpress</h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                הקלידו שם מוצר, דגם או קישור מאלי אקספרס כדי לקבל מחירים מעודכנים, בדיקת מכס ($75) וקישור ישיר למבצע.
              </p>
            </div>
          )}

          {/* No results */}
          {!isLoading && hasSearched && results.length === 0 && !errorMessage && (
            <div className="py-16 text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">לא נמצאו תוצאות עבור &quot;{searchTerm}&quot;</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                נסו לחפש באנגלית (למשל: <span className="font-mono text-ali-600">projector</span> במקום &quot;מקרן&quot;), או להשתמש במילים כלליות יותר.
              </p>
            </div>
          )}

          {/* Results Grid */}
          {!isLoading && results.length > 0 && (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs text-slate-500">
                <span>נמצאו {results.length} מוצרים זמינים לרכישה</span>
                <span className="text-emerald-700 font-semibold">כל הקישורים כוללים הגנת אפיליאציה ומעקב</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                {results.map((prod) => (
                  <div
                    key={prod.aliId}
                    className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 hover:shadow-lg hover:border-ali-300 transition-all"
                  >
                    <div>
                      {/* Product Image */}
                      <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-3">
                        {prod.mainImage ? (
                          <Image
                            src={prod.mainImage}
                            alt={prod.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                            sizes="(max-width: 640px) 100vw, 300px"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <ShoppingBag className="w-10 h-10" />
                          </div>
                        )}

                        {prod.discountPercent > 0 && (
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-ali-600 text-white font-black text-[11px] shadow-sm">
                            -{prod.discountPercent}%
                          </span>
                        )}

                        {/* Customs Badge */}
                        <div
                          className={`absolute bottom-2 right-2 left-2 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1 backdrop-blur-md ${
                            prod.underCustomsLimit
                              ? "bg-emerald-950/80 text-emerald-300 border border-emerald-500/40"
                              : "bg-amber-950/80 text-amber-300 border border-amber-500/40"
                          }`}
                        >
                          <ShieldCheck className="w-3 h-3 shrink-0" />
                          <span className="truncate">
                            {prod.underCustomsLimit ? "פטור מלא ממכס (עד $75)" : "מעל $75 (ייתכן מע\"מ)"}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h4
                        className="text-xs font-semibold text-slate-900 line-clamp-2 leading-relaxed group-hover:text-ali-600 transition-colors"
                        title={prod.title}
                        dir="ltr"
                      >
                        {prod.title}
                      </h4>

                      {/* Store & Rating */}
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1 text-amber-500 font-bold">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          {prod.rating.toFixed(1)}
                        </span>
                        <span>{prod.ordersCount.toLocaleString()}+ נמכרו</span>
                      </div>
                    </div>

                    {/* Price & Buy Button */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div>
                        <div className="text-base font-black text-slate-950">₪{prod.priceIls}</div>
                        <div className="text-[11px] font-medium text-slate-400">(${prod.priceUsd})</div>
                      </div>

                      <a
                        href={prod.affiliateUrl}
                        target="_blank"
                        rel="sponsored noopener noreferrer"
                        onClick={() => trackProductClick(prod)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-xs shadow-sm hover:shadow transition-all group-hover:scale-105 active:scale-95"
                      >
                        <span>צפה בדיל</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-500">
          תוצאות החיפוש מוזנות בזמן אמת מ-AliExpress Open Platform • רכישות דרך האתר תומכות בפעילות הסקירות ללא עלות נוספת
        </div>
      </div>
    </div>
  );
}
