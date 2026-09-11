"use client";

import { useState } from "react";
import Image from "next/image";
import { ProductRecord } from "@/lib/db/json-db";
import { Check, Plus, ShieldCheck, ShoppingCart, Sparkles, ExternalLink, AlertTriangle } from "lucide-react";

interface FrequentlyBoughtTogetherProps {
  mainProduct: {
    id: string;
    aliId?: string;
    title: string;
    priceUsd: number;
    priceIls: number;
    originalPriceUsd?: number;
    mainImage: string;
    affiliateUrl?: string;
    aliUrl?: string;
  };
  complementaryProducts: ProductRecord[];
  crossSellReason?: string;
}

export default function FrequentlyBoughtTogether({
  mainProduct,
  complementaryProducts,
  crossSellReason,
}: FrequentlyBoughtTogetherProps) {
  if (!complementaryProducts || complementaryProducts.length === 0) {
    return null;
  }

  // Combine main + complementary products into unified list
  const allItems = [
    {
      id: mainProduct.id || mainProduct.aliId || "main",
      title: mainProduct.title,
      priceUsd: mainProduct.priceUsd,
      priceIls: mainProduct.priceIls,
      originalPriceUsd: mainProduct.originalPriceUsd || Math.round(mainProduct.priceUsd * 1.3 * 100) / 100,
      mainImage: mainProduct.mainImage,
      affiliateUrl: mainProduct.affiliateUrl || mainProduct.aliUrl || "#",
      isMain: true,
    },
    ...complementaryProducts.map((p) => ({
      id: p.id || p.aliId,
      title: p.titleHe || p.originalTitle,
      priceUsd: p.priceUsd,
      priceIls: p.priceIls,
      originalPriceUsd: p.originalPriceUsd || Math.round(p.priceUsd * 1.3 * 100) / 100,
      mainImage: p.mainImage,
      affiliateUrl: p.affiliateUrl || p.aliUrl || (p.aliId ? `https://www.aliexpress.com/item/${p.aliId}.html` : "#"),
      isMain: false,
    })),
  ];

  // State: tracking which items are selected (default all true)
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    allItems.forEach((item) => {
      initial[item.id] = true;
    });
    return initial;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const selectedItems = allItems.filter((item) => selectedIds[item.id]);

  const totalUsd = Math.round(selectedItems.reduce((sum, item) => sum + item.priceUsd, 0) * 100) / 100;
  const totalIls = Math.round(selectedItems.reduce((sum, item) => sum + item.priceIls, 0) * 10) / 10;
  const totalOriginalUsd = Math.round(selectedItems.reduce((sum, item) => sum + item.originalPriceUsd, 0) * 100) / 100;
  const estimatedSavingsUsd = Math.max(0, Math.round((totalOriginalUsd - totalUsd) * 100) / 100);
  const isTaxExempt = totalUsd <= 75;

  const handleBuyBundle = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "cross_sell_bundle_click", {
        item_count: selectedItems.length,
        total_usd: totalUsd,
        sub_id: "cross_sell_bundle",
      });
    }

    // Open each selected item in AliExpress with sub_id=cross_sell_bundle
    selectedItems.forEach((item) => {
      let dest = item.affiliateUrl;
      const separator = dest.includes("?") ? "&" : "?";
      if (!dest.includes("sub_id=")) {
        dest = `${dest}${separator}sub_id=cross_sell_bundle`;
      }
      window.open(dest, "_blank", "noopener,noreferrer");
    });
  };

  const getItemClickUrl = (affiliateUrl: string) => {
    const separator = affiliateUrl.includes("?") ? "&" : "?";
    if (affiliateUrl.includes("sub_id=")) {
      return affiliateUrl;
    }
    return `${affiliateUrl}${separator}sub_id=cross_sell_item`;
  };

  return (
    <section className="my-10 rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-ali-500/10 text-ali-600 flex items-center justify-center font-bold">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-ali-600">שילוב מנצח וחיסכון בעלויות</span>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">נרכשים יחד לעיתים קרובות</h3>
          </div>
        </div>

        {estimatedSavingsUsd > 0 && (
          <span className="self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
            חיסכון משוער של כ-${estimatedSavingsUsd} על החבילה
          </span>
        )}
      </div>

      {/* Ron's Copywriter Bundle Explanation */}
      {crossSellReason && (
        <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-xs sm:text-sm text-indigo-950 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-indigo-900">מדוע כדאי לרכוש את החבילה המשולבת? </span>
            <span className="leading-relaxed text-indigo-900/90">{crossSellReason}</span>
          </div>
        </div>
      )}

      {/* Visual Product Grid with '+' Signs */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 py-2">
        {allItems.map((item, idx) => {
          const isChecked = Boolean(selectedIds[item.id]);

          return (
            <div key={item.id} className="flex items-center gap-4">
              <div
                className={`relative w-28 sm:w-32 rounded-2xl border p-2 text-center transition-all cursor-pointer ${
                  isChecked
                    ? "border-ali-500 bg-ali-50/20 shadow-sm"
                    : "border-slate-200 bg-slate-50 opacity-60 hover:opacity-100"
                }`}
                onClick={() => toggleSelect(item.id)}
              >
                {/* Selection Checkbox */}
                <div
                  className={`absolute top-2 right-2 w-5 h-5 rounded-md flex items-center justify-center text-white text-xs transition-colors z-10 ${
                    isChecked ? "bg-ali-600" : "border border-slate-300 bg-white"
                  }`}
                >
                  {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </div>

                {/* Main product badge */}
                {item.isMain && (
                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-900 text-white z-10">
                    המוצר בסקירה
                  </span>
                )}

                {/* Image */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-100 mb-2">
                  <Image
                    src={item.mainImage}
                    alt={item.title}
                    fill
                    className="object-cover"
                    sizes="128px"
                  />
                </div>

                <div className="text-[11px] font-semibold text-slate-800 line-clamp-1 leading-snug" title={item.title}>
                  {item.title}
                </div>
                <div className="mt-1 font-black text-xs text-slate-900">
                  ₪{item.priceIls} <span className="text-[10px] text-slate-400">(${item.priceUsd})</span>
                </div>
              </div>

              {/* Plus icon between items */}
              {idx < allItems.length - 1 && (
                <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-bold shrink-0">
                  <Plus className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* List of checkboxes with single item links */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        {allItems.map((item) => {
          const isChecked = Boolean(selectedIds[item.id]);

          return (
            <div key={`chk_${item.id}`} className="flex items-center justify-between text-xs py-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSelect(item.id)}
                  className="w-4 h-4 rounded text-ali-600 focus:ring-ali-500 border-slate-300"
                />
                <span className={isChecked ? "font-semibold text-slate-900" : "text-slate-400"}>
                  {item.isMain ? <strong className="text-ali-600 font-bold ml-1">פריט זה:</strong> : ""}
                  {item.title}
                </span>
              </label>

              <div className="flex items-center gap-3">
                <span className="font-bold text-slate-900">₪{item.priceIls} (${item.priceUsd})</span>
                <a
                  href={getItemClickUrl(item.affiliateUrl)}
                  target="_blank"
                  rel="sponsored noopener noreferrer"
                  className="text-slate-400 hover:text-ali-600 transition-colors p-1"
                  title="פתיחת מוצר בודד באלי אקספרס"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Box & Bundle CTA */}
      <div className="pt-4 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50/70 p-4 sm:p-5 rounded-2xl">
        <div className="space-y-1 w-full md:w-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-xs text-slate-500 font-semibold">
              מחיר כולל ({selectedItems.length} פריטים):
            </span>
            <span className="text-2xl sm:text-3xl font-black text-slate-950">₪{totalIls}</span>
            <span className="text-sm font-bold text-slate-500">(${totalUsd})</span>
          </div>

          {/* Customs status */}
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${
              isTaxExempt
                ? "bg-emerald-100/70 text-emerald-800"
                : "bg-amber-100/70 text-amber-800"
            }`}
          >
            {isTaxExempt ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>פטור מלא ממכס ומע&quot;מ (סכום כולל מתחת ל-$75)</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>מעל רף המכס ($75) - מומלץ להזמין במשלוחים נפרדים למניעת מע&quot;מ</span>
              </>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleBuyBundle}
          disabled={selectedItems.length === 0}
          className="w-full md:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-black text-sm shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>קנה את כל החבילה ({selectedItems.length} מוצרים) באלי אקספרס</span>
        </button>
      </div>
    </section>
  );
}
