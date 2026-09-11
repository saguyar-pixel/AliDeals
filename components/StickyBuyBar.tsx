"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, ExternalLink, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useCtaVariant } from "@/lib/cro/ab-testing";

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
  const [isVisible, setIsVisible] = useState(false);
  const { variantId, variant } = useCtaVariant();
  const isTaxExempt = priceUsd < 75;

  // Internal cloaked redirect URL with standardized SubID and CTA variant
  const outboundUrl = `/go/${productId}?sub_id=product_review_cta&source=sticky_bar&cta=${encodeURIComponent(variantId)}&page=${encodeURIComponent(pageId || "review")}`;

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      // Appear smoothly after user scrolls down past 280px
      if (window.scrollY > 280) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Check initial position
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleClick = () => {
    if (typeof window !== "undefined" && window.trackAliExpressClick) {
      window.trackAliExpressClick({
        productId,
        productTitle: title,
        priceUsd,
        priceIls,
        linkType: `sticky_${variantId}`,
        destinationUrl: outboundUrl,
      });
    }
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl p-3 sm:p-4 transform transition-all duration-300 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
      dir="rtl"
    >
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        {/* Thumbnail & Title (Clickable link to product) */}
        <a
          href={outboundUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          onClick={handleClick}
          className="flex items-center gap-3 min-w-0 group hover:opacity-85 transition-opacity"
        >
          <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-50 group-hover:border-ali-400 transition-colors">
            <Image
              src={mainImage}
              alt={title}
              fill
              className="object-cover"
              sizes="48px"
            />
          </div>
          <div className="min-w-0 hidden sm:block">
            <h4 className="text-xs font-bold text-slate-900 truncate max-w-xs group-hover:text-ali-600 transition-colors">
              {title}
            </h4>
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
        </a>

        {/* Pricing & CTA Button */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0 mr-auto">
          <div className="text-left flex flex-col">
            <span className="text-[10px] sm:text-xs text-slate-500">מחיר מבצע:</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg sm:text-2xl font-black text-slate-950">₪{priceIls}</span>
              <span className="text-xs font-semibold text-slate-500">(${priceUsd})</span>
            </div>
            {originalPriceUsd && originalPriceUsd > priceUsd && (
              <span className="text-[10px] text-slate-400 line-through">(${originalPriceUsd})</span>
            )}
          </div>

          <a
            href={outboundUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={handleClick}
            data-affiliate="true"
            data-product-id={productId}
            data-product-title={title}
            data-price-usd={priceUsd}
            data-price-ils={priceIls}
            data-cta-variant={variantId}
            className="flex items-center gap-2 px-4 sm:px-7 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-xs sm:text-sm shadow-lg shadow-ali-500/30 hover:shadow-ali-500/40 transform active:scale-95 transition-all hover:scale-[1.02]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>{variant.labelHe}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80 hidden sm:inline" />
          </a>
        </div>
      </div>
    </div>
  );
}
