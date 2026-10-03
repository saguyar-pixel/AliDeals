"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ChevronRight, ChevronLeft, ShoppingBag, Star, ArrowLeft } from "lucide-react";

export interface RelatedProductItem {
  id: string;
  aliId?: string;
  title: string;
  priceUsd: number;
  priceIls: number;
  originalPriceUsd?: number;
  discountPercent?: number;
  rating: number;
  ordersCount?: number;
  mainImage: string;
  affiliateUrl: string;
  reviewSlug?: string;
}

interface RelatedProductsCarouselProps {
  title?: string;
  subtitle?: string;
  items: RelatedProductItem[];
  currentProductTitle: string;
  pageSlug: string;
}

export default function RelatedProductsCarousel({
  title = "מוצרים נוספים שאולי תאהבו",
  subtitle = "מוצרים פופולריים מאותה קטגוריה ומוצרים שנרכשו יחד",
  items,
  currentProductTitle,
  pageSlug,
}: RelatedProductsCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!items || items.length === 0) {
    return null;
  }

  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="my-10 rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/60 p-5 sm:p-7 shadow-sm space-y-5" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ali-50 border border-ali-100 text-ali-600 text-xs font-bold mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-ali-500" />
            <span>דילים קשורים ומומלצים</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>
        </div>

        {/* Desktop Arrow Controls */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scroll("right")}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="גלול ימינה"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("left")}
            className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer"
            aria-label="גלול שמאלה"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Swipeable Scroll-Snap Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory scrollbar-none focus:outline-hidden"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {items.map((item) => {
          const buyUrl = item.aliId
            ? `/go/${item.aliId}?sub_id=related_carousel&page=${encodeURIComponent(pageSlug)}`
            : item.affiliateUrl || "#";

          return (
            <div
              key={item.id || item.aliId}
              className="snap-start shrink-0 w-[220px] sm:w-[240px] rounded-2xl border border-slate-200 bg-white hover:border-ali-300 transition-all flex flex-col justify-between overflow-hidden shadow-2xs group hover:shadow-md"
            >
              <div>
                {/* Image Box */}
                <div className="relative aspect-square w-full bg-slate-50 overflow-hidden">
                  <Image
                    src={item.mainImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"}
                    alt={item.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="240px"
                  />
                  {item.discountPercent ? (
                    <span className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-ali-600 text-white text-[11px] font-black shadow-xs">
                      -{item.discountPercent}%
                    </span>
                  ) : null}
                </div>

                {/* Content */}
                <div className="p-3.5 space-y-2">
                  {/* Rating */}
                  <div className="flex items-center gap-1.5 text-xs">
                    <div className="flex items-center gap-0.5 text-amber-500 font-bold">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{item.rating || 4.8}</span>
                    </div>
                    {item.ordersCount ? (
                      <span className="text-[11px] text-slate-400 font-medium">
                        ({item.ordersCount}+ נמכרו)
                      </span>
                    ) : null}
                  </div>

                  {/* Title */}
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-ali-600 transition-colors">
                    {item.title}
                  </h4>

                  {/* Price */}
                  <div className="pt-1 flex items-baseline gap-1.5">
                    <span className="text-base sm:text-lg font-black text-slate-950">
                      ₪{item.priceIls}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      (${item.priceUsd})
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-3.5 pt-0 space-y-2">
                <a
                  href={buyUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white text-xs font-bold shadow-xs hover:shadow transition-all"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>קנה עכשיו עם דיל</span>
                </a>

                {item.reviewSlug && (
                  <Link
                    href={`/reviews/${item.reviewSlug}`}
                    className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 font-semibold transition-colors py-1"
                  >
                    <span>קרא סקירה</span>
                    <ArrowLeft className="w-3 h-3" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
