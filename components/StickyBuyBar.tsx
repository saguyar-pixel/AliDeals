"use client";

import { ShoppingCart, ExternalLink, ShieldCheck } from "lucide-react";
import Image from "next/image";

interface StickyBuyBarProps {
  productId: string;
  pageId?: string;
  title: string;
  priceIls: number;
  priceUsd: number;
  mainImage: string;
  originalPriceUsd?: number;
  discountPercent?: number;
  affiliateUrl?: string;
  aliUrl?: string;
}

export default function StickyBuyBar({
  productId,
  pageId,
  title,
  priceIls,
  priceUsd,
  mainImage,
  originalPriceUsd,
  discountPercent = 0,
  affiliateUrl,
  aliUrl,
}: StickyBuyBarProps) {
  const isTaxExempt = priceUsd < 75;

  const handleClick = () => {
    if (typeof window !== "undefined" && (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag) {
      (window as unknown as { gtag: (...args: unknown[]) => void }).gtag("event", "affiliate_outbound_click", {
        product_id: productId,
        page_id: pageId,
        product_name: title,
        price_usd: priceUsd,
        price_ils: priceIls,
        position: "sticky_bar",
      });
    }
  };

  const outboundUrl = affiliateUrl || aliUrl || `https://www.aliexpress.com/item/${productId}.html`;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl p-3 sm:p-4 transition-all">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Thumbnail & Title (Hidden on tiny mobile) */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
            <Image
              src={mainImage}
              alt={title}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h4 className="text-xs font-bold text-slate-900 truncate max-w-xs">{title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              {isTaxExempt && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                  <ShieldCheck className="w-3 h-3" />
                  פטור ממכס ומע&quot;מ
                </span>
              )}
              {discountPercent > 0 && (
                <span className="text-[11px] font-bold text-ali-600 bg-ali-50 px-1.5 py-0.5 rounded">
                  -{discountPercent}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Pricing & CTA Button */}
        <div className="flex items-center gap-4 shrink-0 mr-auto">
          <div className="text-left flex flex-col">
            <span className="text-xs text-slate-500">מחיר מבצע:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-slate-950">₪{priceIls}</span>
              <span className="text-xs font-semibold text-slate-500">(${priceUsd})</span>
            </div>
            {originalPriceUsd && originalPriceUsd > priceUsd && (
              <span className="text-[11px] text-slate-400 line-through">(${originalPriceUsd})</span>
            )}
          </div>

          <a
            href={outboundUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={handleClick}
            className="flex items-center gap-2 px-5 sm:px-7 py-3 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-sm sm:text-base shadow-lg shadow-ali-500/30 hover:shadow-ali-500/40 transform active:scale-95 transition-all"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>לרכישה באלי אקספרס</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </a>
        </div>
      </div>
    </div>
  );
}
