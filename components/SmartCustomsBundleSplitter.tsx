"use client";

import { useMemo } from "react";
import { AlertTriangle, ShieldCheck, ShoppingBag, ArrowLeft, Split } from "lucide-react";
import { trackCustomsBundleSplitAction } from "@/lib/analytics/ga4";

export interface BundleItem {
  id: string;
  title: string;
  priceUsd: number;
  priceIls: number;
  affiliateUrl: string;
}

interface SmartCustomsBundleSplitterProps {
  items: BundleItem[];
  className?: string;
}

export default function SmartCustomsBundleSplitter({
  items,
  className = "",
}: SmartCustomsBundleSplitterProps) {
  // Calculate partition algorithm
  const { totalUsd, totalIls, basket1, basket2, order1Price, order2Price, estimatedTaxSavedUsd, isOverLimit } =
    useMemo(() => {
      const activeItems = items.filter((i) => i.priceUsd > 0);
      const sumUsd = Math.round(activeItems.reduce((acc, i) => acc + i.priceUsd, 0) * 100) / 100;
      const sumIls = Math.round(activeItems.reduce((acc, i) => acc + i.priceIls, 0) * 10) / 10;

      if (sumUsd <= 75 || activeItems.length < 2) {
        return {
          totalUsd: sumUsd,
          totalIls: sumIls,
          basket1: activeItems,
          basket2: [],
          order1Price: sumUsd,
          order2Price: 0,
          estimatedTaxSavedUsd: 0,
          isOverLimit: false,
        };
      }

      // Greedy partition to keep both baskets under $75
      const sorted = [...activeItems].sort((a, b) => b.priceUsd - a.priceUsd);
      const b1: BundleItem[] = [];
      const b2: BundleItem[] = [];
      let sum1 = 0;
      let sum2 = 0;

      for (const item of sorted) {
        if (sum1 <= sum2 && sum1 + item.priceUsd <= 75) {
          b1.push(item);
          sum1 = Math.round((sum1 + item.priceUsd) * 100) / 100;
        } else if (sum2 + item.priceUsd <= 75) {
          b2.push(item);
          sum2 = Math.round((sum2 + item.priceUsd) * 100) / 100;
        } else {
          // If both exceed 75, assign to smaller
          if (sum1 <= sum2) {
            b1.push(item);
            sum1 = Math.round((sum1 + item.priceUsd) * 100) / 100;
          } else {
            b2.push(item);
            sum2 = Math.round((sum2 + item.priceUsd) * 100) / 100;
          }
        }
      }

      // If one bucket is empty, force at least 1 item in each
      if (b1.length === 0 && b2.length > 1) {
        b1.push(b2.pop()!);
      } else if (b2.length === 0 && b1.length > 1) {
        b2.push(b1.pop()!);
      }

      const p1 = Math.round(b1.reduce((acc, i) => acc + i.priceUsd, 0) * 100) / 100;
      const p2 = Math.round(b2.reduce((acc, i) => acc + i.priceUsd, 0) * 100) / 100;

      // 17% Israeli VAT + ~$10 postal handling fee avoided
      const taxSaved = Math.round(sumUsd * 0.17 + 10);

      return {
        totalUsd: sumUsd,
        totalIls: sumIls,
        basket1: b1,
        basket2: b2,
        order1Price: p1,
        order2Price: p2,
        estimatedTaxSavedUsd: taxSaved,
        isOverLimit: true,
      };
    }, [items]);

  if (!isOverLimit) {
    return null;
  }

  const handleOrderClick = (basket: BundleItem[], subId: string, orderPrice: number) => {
    trackCustomsBundleSplitAction({
      total_bundle_price: totalUsd,
      order_1_price: order1Price,
      order_2_price: order2Price,
      estimated_tax_saved: estimatedTaxSavedUsd,
    });

    // Open item(s) in new tab with sub_id
    basket.forEach((item) => {
      let dest = item.affiliateUrl;
      const separator = dest.includes("?") ? "&" : "?";
      if (!dest.includes("sub_id=")) {
        dest = `${dest}${separator}sub_id=${subId}`;
      }
      window.open(dest, "_blank", "noopener,noreferrer");
    });
  };

  return (
    <div
      className={`rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50/90 via-orange-50/60 to-amber-50/90 p-4 sm:p-5 shadow-sm space-y-4 text-right ${className}`}
      dir="rtl"
    >
      {/* Alert Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-md">
              מפצל חבילות חכם ($75)
            </span>
            <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md">
              חיסכון של כ-${estimatedTaxSavedUsd} (₪{Math.round(estimatedTaxSavedUsd * 3.65)})
            </span>
          </div>
          <h4 className="text-sm sm:text-base font-black text-amber-950 leading-snug">
            זהירות, עברת את רף ה-$75 לפטור ממכס! (סך הכל: ${totalUsd} / ₪{totalIls})
          </h4>
          <p className="text-xs sm:text-sm text-amber-900 leading-relaxed">
            פצל את הקנייה לשני סלים: הזמן את פריט א&apos; היום ואת פריט ב&apos; בנפרד, וחסוך תשלום מע&quot;מ
            (17%) ועמלות דואר מיותרות.
          </p>
        </div>
      </div>

      {/* Two split baskets with dedicated purchase buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Basket 1 */}
        <div className="rounded-xl bg-white border border-amber-200 p-3 flex flex-col justify-between space-y-2 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">סל הזמנה 1 ({basket1.length} פריטים)</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                ${order1Price} (פטור ממכס)
              </span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
              {basket1.map((item) => (
                <li key={item.id} className="truncate" title={item.title}>
                  {item.title} (${item.priceUsd})
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleOrderClick(basket1, "smart_split_order1", order1Price)}
            className="w-full py-2.5 px-3 rounded-lg bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>הזמן סל 1 (${order1Price}) - ללא מכס</span>
          </button>
        </div>

        {/* Basket 2 */}
        <div className="rounded-xl bg-white border border-amber-200 p-3 flex flex-col justify-between space-y-2 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-black text-slate-900">סל הזמנה 2 ({basket2.length} פריטים)</span>
              <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[11px]">
                ${order2Price} {order2Price <= 75 ? "(פטור ממכס)" : ""}
              </span>
            </div>
            <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
              {basket2.map((item) => (
                <li key={item.id} className="truncate" title={item.title}>
                  {item.title} (${item.priceUsd})
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            onClick={() => handleOrderClick(basket2, "smart_split_order2", order2Price)}
            className="w-full py-2.5 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>הזמן סל 2 (${order2Price}) - ללא מכס</span>
          </button>
        </div>
      </div>
    </div>
  );
}
