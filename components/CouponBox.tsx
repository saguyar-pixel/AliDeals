"use client";

import { useState } from "react";
import { Ticket, Copy, Check } from "lucide-react";

interface CouponBoxProps {
  couponCode: string;
  discountText?: string;
  minSpend?: string;
}

export default function CouponBox({
  couponCode,
  discountText = "הנחה נוספת במעמד הצ'ק-אאוט",
  minSpend = "בקנייה מעל $30",
}: CouponBoxProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(couponCode);
    setCopied(true);

    if (typeof window !== "undefined" && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "coupon_copy", {
        coupon_code: couponCode,
      });
    }

    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="my-6 rounded-2xl border-2 border-dashed border-ali-500/40 bg-ali-50/50 p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-ali-500 text-white flex items-center justify-center shrink-0">
          <Ticket className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-ali-600">קוד קופון בלעדי</span>
            <span className="text-xs text-slate-500">• {minSpend}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800 mt-0.5">{discountText}</p>
        </div>
      </div>

      <button
        onClick={handleCopy}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-ali-300 hover:border-ali-500 text-slate-900 font-mono font-bold text-sm shadow-sm hover:shadow transition-all group cursor-pointer active:scale-95"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-emerald-700 font-sans">הקוד הועתק!</span>
          </>
        ) : (
          <>
            <span className="tracking-widest text-ali-600 group-hover:scale-105 transition-transform">
              {couponCode}
            </span>
            <Copy className="w-3.5 h-3.5 text-slate-400 group-hover:text-ali-600" />
          </>
        )}
      </button>
    </div>
  );
}
