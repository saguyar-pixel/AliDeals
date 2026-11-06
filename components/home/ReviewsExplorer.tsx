"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Star, ShieldCheck, ArrowLeft, Sparkles, Filter, ChevronDown } from "lucide-react";
import ShareDealButton from "@/components/share/ShareDealButton";

export interface EnrichedReviewCardItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  featuredImage: string | null;
  category: string;
  updatedAt?: string;
  priceIls?: number;
  priceUsd?: number;
  rating?: number;
  ordersCount?: number;
  isTaxExempt?: boolean;
  prosPreview?: string[];
}

interface ReviewsExplorerProps {
  items: EnrichedReviewCardItem[];
}

const INITIAL_VISIBLE_COUNT = 6;

export default function ReviewsExplorer({ items }: ReviewsExplorerProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_VISIBLE_COUNT);

  // Extract top categories dynamically from existing reviews
  const dynamicCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      const cat = (item.category || "").trim();
      if (cat && cat !== "סקירה" && cat !== "כללי") {
        counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([cat]) => cat);
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "tax_free") {
      return items.filter((i) => i.isTaxExempt !== false && (!i.priceUsd || i.priceUsd < 75));
    }
    if (activeFilter === "under_150") {
      return items.filter((i) => typeof i.priceIls === "number" && i.priceIls > 0 && i.priceIls <= 150);
    }
    return items.filter((i) => i.category === activeFilter);
  }, [items, activeFilter]);

  const spotlightItem = activeFilter === "all" && filteredItems.length > 0 ? filteredItems[0] : null;
  const gridSource = spotlightItem ? filteredItems.slice(1) : filteredItems;
  const displayedGridItems = gridSource.slice(0, visibleCount);
  const hasMore = visibleCount < gridSource.length;

  const handleSelectFilter = (filterKey: string) => {
    setActiveFilter(filterKey);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8" dir="rtl">
      {/* Category & Smart Budget Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 pl-1 shrink-0">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span>סינון מהיר:</span>
        </span>

        <button
          type="button"
          onClick={() => handleSelectFilter("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
            activeFilter === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-xs"
              : "bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          הכל ({items.length})
        </button>

        <button
          type="button"
          onClick={() => handleSelectFilter("tax_free")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border flex items-center gap-1 ${
            activeFilter === "tax_free"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-emerald-50/70 text-emerald-800 border-emerald-200 hover:bg-emerald-100/70"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>פטור ממכס (עד $75)</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectFilter("under_150")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
            activeFilter === "under_150"
              ? "bg-ali-600 text-white border-ali-600 shadow-xs"
              : "bg-white text-slate-700 border-slate-200 hover:border-ali-300 hover:text-ali-600"
          }`}
        >
          מציאות עד ₪150
        </button>

        {dynamicCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => handleSelectFilter(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer border ${
              activeFilter === cat
                ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Featured Spotlight Card (Editor's Latest / Top Pick) */}
      {spotlightItem && (
        <article className="group relative rounded-3xl bg-white border border-slate-200/90 shadow-md hover:shadow-xl transition-all overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Spotlight Image */}
          <Link
            href={`/reviews/${spotlightItem.slug}`}
            className="lg:col-span-6 relative aspect-video lg:aspect-auto lg:min-h-[320px] bg-slate-100 overflow-hidden block"
          >
            {spotlightItem.featuredImage ? (
              <Image
                src={spotlightItem.featuredImage}
                alt={spotlightItem.title}
                fill
                priority
                className="object-cover group-hover:scale-105 transition-transform duration-500"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400">תמונה</div>
            )}
            <div className="absolute top-4 right-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-ali-600 text-white text-xs font-extrabold shadow-md">
                <Sparkles className="w-3.5 h-3.5" />
                <span>סקירה בולטת</span>
              </span>
              <span className="px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur text-white text-xs font-bold">
                {spotlightItem.category}
              </span>
            </div>
          </Link>

          {/* Spotlight Content */}
          <div className="lg:col-span-6 p-6 sm:p-8 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 text-xs">
                  {spotlightItem.rating ? (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span>{spotlightItem.rating}</span>
                    </span>
                  ) : null}
                  {spotlightItem.isTaxExempt && (
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>פטור ממכס</span>
                    </span>
                  )}
                </div>

                {spotlightItem.priceIls ? (
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-950">₪{spotlightItem.priceIls}</span>
                    {spotlightItem.priceUsd ? (
                      <span className="text-xs font-semibold text-slate-400">(${spotlightItem.priceUsd})</span>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <Link href={`/reviews/${spotlightItem.slug}`} className="block">
                <h3 className="text-xl sm:text-2xl font-black text-slate-950 leading-snug group-hover:text-ali-600 transition-colors">
                  {spotlightItem.title}
                </h3>
              </Link>

              <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
                {spotlightItem.summary}
              </p>

              {spotlightItem.prosPreview && spotlightItem.prosPreview.length > 0 && (
                <ul className="pt-1 space-y-1.5 text-xs text-slate-700">
                  {spotlightItem.prosPreview.slice(0, 2).map((pro, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="line-clamp-1 font-medium">{pro}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={`/reviews/${spotlightItem.slug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-ali-600 text-white font-bold text-xs sm:text-sm transition-colors shadow-xs"
              >
                <span>לסקירה המלאה ולבדיקת המחיר</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>

              <ShareDealButton
                title={spotlightItem.title}
                url={`/reviews/${spotlightItem.slug}`}
                priceIls={spotlightItem.priceIls}
                priceUsd={spotlightItem.priceUsd}
                isTaxExempt={spotlightItem.isTaxExempt}
                contentType="review"
                itemId={spotlightItem.slug}
                variant="compact"
                label="שתף:"
              />
            </div>
          </div>
        </article>
      )}

      {/* Filtered Reviews Grid */}
      {displayedGridItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedGridItems.map((page) => (
            <article
              key={page.id}
              className="group relative rounded-2xl bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-lg transition-all flex flex-col"
            >
              {/* Card Image Wrapper */}
              <div className="relative aspect-video w-full bg-slate-100 rounded-t-2xl overflow-hidden">
                {page.featuredImage ? (
                  <Image
                    src={page.featuredImage}
                    alt={page.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">תמונה</div>
                )}

                {/* Category Pill (Top Right) */}
                <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur text-white text-[11px] font-bold z-10 pointer-events-none">
                  {page.category}
                </span>

                {/* Peer Share Trigger (Top Left — above card overlay) */}
                <div className="absolute top-2.5 left-2.5 z-20">
                  <ShareDealButton
                    title={page.title}
                    url={`/reviews/${page.slug}`}
                    priceIls={page.priceIls}
                    priceUsd={page.priceUsd}
                    isTaxExempt={page.isTaxExempt}
                    contentType="review"
                    itemId={page.slug}
                    variant="card"
                  />
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  {/* Rating + Tax Status Row */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      {page.rating ? (
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{page.rating}</span>
                        </span>
                      ) : null}
                      {page.isTaxExempt && (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/80">
                          פטור ממכס ✓
                        </span>
                      )}
                    </div>

                    {page.priceIls ? (
                      <span className="text-base font-black text-slate-950">₪{page.priceIls}</span>
                    ) : null}
                  </div>

                  <h3 className="font-bold text-base text-slate-900 line-clamp-2 group-hover:text-ali-600 transition-colors leading-snug">
                    {page.title}
                  </h3>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {page.summary}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-bold text-ali-600 group-hover:underline flex items-center gap-1">
                    <span>קרא את הסקירה המלאה</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  </span>
                  {page.ordersCount ? (
                    <span className="text-[11px] text-slate-400">{page.ordersCount}+ הזמנות</span>
                  ) : null}
                </div>
              </div>

              {/* Main Card Clickable Overlay */}
              <Link href={`/reviews/${page.slug}`} className="absolute inset-0 z-10 rounded-2xl">
                <span className="sr-only">{page.title}</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
          <p className="text-sm font-bold text-slate-700">לא נמצאו סקירות בקטגוריה זו כעת.</p>
          <button
            type="button"
            onClick={() => handleSelectFilter("all")}
            className="text-xs font-bold text-ali-600 hover:underline cursor-pointer"
          >
            הצג את כל הסקירות באתר
          </button>
        </div>
      )}

      {/* Load More Reviews Button */}
      {hasMore && (
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setVisibleCount((prev) => prev + 6)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs sm:text-sm border border-slate-300 shadow-xs transition-all cursor-pointer"
          >
            <span>הצג סקירות נוספות ({gridSource.length - visibleCount} נותרו)</span>
            <ChevronDown className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      )}
    </div>
  );
}
