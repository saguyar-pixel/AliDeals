"use client";

import { useState, useEffect, FormEvent } from "react";
import Image from "next/image";
import {
  Tag,
  Sparkles,
  Copy,
  Check,
  X,
  ArrowLeft,
  ShieldCheck,
  ShoppingCart,
  Search,
  Loader2,
  ExternalLink,
  Star,
} from "lucide-react";
import { trackExitModalSearch, trackAffiliateClickout } from "@/lib/analytics/ga4";

const STORAGE_KEY = "alideals_exit_intent_shown_v2";

interface ExitCoupon {
  code: string;
  discountText: string;
  minSpendUsd?: number;
}

interface SearchItem {
  aliId: string;
  title: string;
  priceUsd: number;
  priceIls: number;
  rating?: number;
  mainImage: string;
  affiliateUrl: string;
}

export default function ExitIntentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [coupon, setCoupon] = useState<ExitCoupon>({
    code: "ALIBUY2026",
    discountText: "$5 הנחה בהזמנה מעל $30",
    minSpendUsd: 30,
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchItem[]>([]);
  const [searchHasExecuted, setSearchHasExecuted] = useState(false);

  // 1. Fetch active exit-intent coupon from DB
  useEffect(() => {
    fetch("/api/coupons?exitModal=true")
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.coupons) && data.coupons.length > 0) {
          const top = data.coupons[0];
          setCoupon({
            code: top.code,
            discountText: top.discountText || top.title || "$5 הנחה",
            minSpendUsd: top.minSpendUsd || 30,
          });
        }
      })
      .catch(() => {});
  }, []);

  // 2. Exit Intent Trigger Detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const isShown = sessionStorage.getItem(STORAGE_KEY);
    if (isShown) return;

    // A. Desktop Mouseleave: cursor moves beyond top edge
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !sessionStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
        sessionStorage.setItem(STORAGE_KEY, "true");
      }
    };

    // B. Mobile detection: deep scroll then rapid reverse scroll towards top
    let hasScrolledDeep = false;
    const handleScroll = () => {
      if (window.scrollY > 400) {
        hasScrolledDeep = true;
      }
      if (hasScrolledDeep && window.scrollY < 80 && !sessionStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
        sessionStorage.setItem(STORAGE_KEY, "true");
      }
    };

    // C. Mobile Back Button (popstate)
    const handlePopState = () => {
      if (!sessionStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
        sessionStorage.setItem(STORAGE_KEY, "true");
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  // Copy coupon action
  const handleCopy = () => {
    navigator.clipboard.writeText(coupon.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  // Perform quick AliExpress search inside popup
  const handleSearchSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    const clean = searchQuery.trim();
    if (!clean) return;

    setIsSearching(true);
    setSearchHasExecuted(true);

    try {
      const res = await fetch(`/api/live-search?q=${encodeURIComponent(clean)}&subId=exit_modal_result`);
      const data = await res.json();
      const items: SearchItem[] = (data?.results || []).slice(0, 4);
      setSearchResults(items);

      // GA4 Event: exit_modal_search
      trackExitModalSearch({
        search_term: clean,
        results_count: items.length,
      });
    } catch {
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Clickout on product card
  const handleProductClickout = (item: SearchItem) => {
    trackAffiliateClickout({
      product_id: item.aliId,
      product_title: item.title,
      price_usd: item.priceUsd,
      sub_id: "exit_modal_result",
      placement: "exit_modal",
      destination_url: item.affiliateUrl,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto"
      dir="rtl"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-7 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-200 overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glow */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-ali-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 left-4 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors z-10"
          title="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Section: Active Coupon */}
        <div className="space-y-2 text-center pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ali-50 border border-ali-200 text-ali-600 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>רגע לפני שאתם עוזבים! 🎁</span>
          </div>

          <h3 className="text-lg sm:text-xl font-black text-slate-950 leading-tight">
            קופון בלעדי לרוכשים מישראל באלי אקספרס
          </h3>
        </div>

        {/* Coupon Code Card */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-ali-300 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-950">{coupon.discountText}</span>
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>פעיל כעת</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-white p-2 rounded-xl border border-ali-200 shadow-inner">
            <span className="font-mono text-base sm:text-lg font-black text-ali-600 tracking-wider select-all mr-2">
              {coupon.code}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>הועתק!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>העתק</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Center Section: Personal Search Assistant */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="text-center space-y-1">
            <h4 className="text-sm font-black text-slate-900">
              לא מצאת בדיוק מה שחיפשת? נשמח לעזור לך למצוא כל מוצר במחיר הטוב ביותר!
            </h4>
            <p className="text-xs text-slate-500">
              חפשו מקרן, אוזניות, רחפן או כל פריט - נשלוף לכם תוצאות חיות מאלי אקספרס:
            </p>
          </div>

          {/* Quick Search Form */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="למשל: מקרן נייד, אוזניות בלוטוס, שעון חכם..."
                className="w-full pr-9 pl-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ali-500/20 focus:border-ali-500"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
            >
              {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>חפש</span>}
            </button>
          </form>

          {/* Search Results Grid */}
          {isSearching && (
            <div className="py-6 flex flex-col items-center justify-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-ali-600" />
              <span>סורק את אלי אקספרס למחירים הטובים ביותר...</span>
            </div>
          )}

          {!isSearching && searchHasExecuted && searchResults.length === 0 && (
            <div className="py-4 text-center text-xs text-slate-500">
              לא נמצאו תוצאות עבור החיפוש. נסו מילות חיפוש נוספות.
            </div>
          )}

          {!isSearching && searchResults.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1">
              {searchResults.map((item) => (
                <a
                  key={item.aliId}
                  href={item.affiliateUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  onClick={() => handleProductClickout(item)}
                  className="group block p-2 rounded-xl border border-slate-200 hover:border-ali-400 hover:shadow-md bg-white transition-all text-right"
                >
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden bg-slate-100 mb-1.5">
                    <Image
                      src={item.mainImage}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="120px"
                    />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-800 line-clamp-1 leading-snug">
                    {item.title}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-black text-xs text-ali-600">₪{item.priceIls}</span>
                    <span className="text-[10px] text-slate-400">(${item.priceUsd})</span>
                  </div>
                  <div className="mt-1.5 w-full py-1 text-center rounded-lg bg-ali-600 group-hover:bg-ali-700 text-white font-bold text-[10px] shadow-sm flex items-center justify-center gap-1">
                    <span>קנה עכשיו</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Global CTA fallback */}
        <div className="pt-2">
          <a
            href={`/go/coupon?sub_id=exit_modal_result&coupon=${coupon.code}`}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>למעבר ישיר לקניות באלי אקספרס עם הקופון</span>
            <ArrowLeft className="w-4 h-4 mr-1" />
          </a>
        </div>
      </div>
    </div>
  );
}
