"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ChevronRight, ChevronLeft, ExternalLink, ArrowLeft, ShieldCheck, Tag } from "lucide-react";

export interface ComplementaryItem {
  id: string;
  aliId?: string;
  title: string;
  priceUsd: number;
  priceIls: number;
  originalPriceUsd?: number;
  discountPercent?: number;
  mainImage: string;
  affiliateUrl: string;
  reviewSlug?: string;
}

interface ComplementaryCarouselProps {
  mainProductTitle: string;
  items: ComplementaryItem[];
  crossSellReason?: string;
}

export default function ComplementaryCarousel({
  mainProductTitle,
  items,
  crossSellReason,
}: ComplementaryCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  if (!items || items.length === 0) {
    return null;
  }

  // Slow auto-scroll effect with pause on hover/touch
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let animationFrameId: number;
    const speed = 0.6; // Slow and smooth pixels per frame

    const step = () => {
      if (!isPaused && container) {
        // In RTL, scrollLeft is usually negative or decrements towards left
        const maxScroll = container.scrollWidth - container.clientWidth;
        if (Math.abs(container.scrollLeft) >= maxScroll - 2) {
          // Reset to beginning smoothly
          container.scrollLeft = 0;
        } else {
          container.scrollLeft -= speed; // Move left in RTL
        }
      }
      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPaused]);

  const handleScrollManual = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = 300;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="my-10 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ali-50 border border-ali-100 text-ali-600 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>שילובים מומלצים ומוצרים משלימים</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900">
            מוצרים מומלצים לצד {mainProductTitle}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            מוצרים שנבדקו ונמצאו כמשלימים מעולים לרכישה זו, עם תאימות מלאה לישראל
          </p>
        </div>

        {/* Manual Navigation Controls */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => handleScrollManual("right")}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="מוצר קודם"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={() => handleScrollManual("left")}
            className="w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="מוצר הבא"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Ron's Cross-Sell Reason */}
      {crossSellReason && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-100/90 text-xs sm:text-sm text-indigo-950 flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-bold text-indigo-900">למה כדאי לשלב מוצרים אלו? </span>
            <span className="text-indigo-900/90">{crossSellReason}</span>
          </div>
        </div>
      )}

      {/* Auto-scrolling Track */}
      <div
        ref={scrollContainerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
        className="flex items-stretch gap-5 overflow-x-auto pb-4 pt-1 scrollbar-thin scroll-smooth select-none"
        style={{ scrollbarWidth: "thin" }}
      >
        {items.map((item) => {
          const isTaxExempt = item.priceUsd < 75;

          return (
            <div
              key={item.id}
              className="w-64 sm:w-72 shrink-0 rounded-2xl bg-white border border-slate-200 hover:border-ali-400 p-4 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* 1. Clickable Product Image -> Outbound AliExpress Affiliate Link */}
                <a
                  href={item.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="block relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100 hover:opacity-95 transition-opacity"
                  title={`מעבר לרכישת ${item.title} באלי אקספרס`}
                >
                  <Image
                    src={item.mainImage}
                    alt={item.title}
                    fill
                    className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 256px, 288px"
                  />
                  {item.discountPercent ? (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-ali-600 text-white text-[10px] font-black shadow-sm">
                      -{item.discountPercent}%
                    </span>
                  ) : null}
                  <div className="absolute bottom-2 right-2">
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-md border shadow-xs ${
                        isTaxExempt
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isTaxExempt ? "פטור ממכס" : "מעל $75"}
                    </span>
                  </div>
                </a>

                {/* Title & Price */}
                <div>
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 line-clamp-2 leading-snug group-hover:text-ali-600 transition-colors">
                    {item.title}
                  </h4>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-black text-slate-950">₪{item.priceIls}</span>
                    <span className="text-xs font-semibold text-slate-400">(${item.priceUsd})</span>
                  </div>
                </div>
              </div>

              {/* 2. Dual Action Buttons */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                {/* Button 1: Internal link to review page if published */}
                {item.reviewSlug && (
                  <Link
                    href={`/reviews/${item.reviewSlug}`}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>לסקירה המלאה</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                )}

                {/* Button 2: Direct outbound AliExpress affiliate link */}
                <a
                  href={item.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="w-full py-2.5 px-3 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02] active:scale-95 text-center"
                >
                  <span>לאלי אקספרס</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
