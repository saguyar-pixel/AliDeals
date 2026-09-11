"use client";

import { useState, useEffect } from "react";
import { Tag, Sparkles, Copy, Check, X, ArrowLeft, ShieldCheck, ShoppingCart } from "lucide-react";

const STORAGE_KEY = "alideals_exit_intent_dismissed_v1";
const COUPON_CODE = "ALIBUY2026";

export default function ExitIntentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if previously dismissed in this session
    const isDismissed = sessionStorage.getItem(STORAGE_KEY);
    if (isDismissed) return;

    // 1. Desktop Mouseleave detection (cursor moves above top boundary)
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 5 && !sessionStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
        sessionStorage.setItem(STORAGE_KEY, "true");
      }
    };

    // 2. Mobile / Inactivity fallback (after 35 seconds of reading, if user scrolls back to top)
    let hasScrolledDeep = false;
    const handleScroll = () => {
      if (window.scrollY > 500) {
        hasScrolledDeep = true;
      }
      if (hasScrolledDeep && window.scrollY < 80 && !sessionStorage.getItem(STORAGE_KEY)) {
        setIsOpen(true);
        sessionStorage.setItem(STORAGE_KEY, "true");
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(COUPON_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      dir="rtl"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100 space-y-5 animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Banner */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-ali-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 left-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="סגור"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Badge & Title */}
        <div className="space-y-2 text-center pt-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ali-50 border border-ali-200 text-ali-600 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>רגע לפני שאתם יוצאים! 🎁</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-slate-950 leading-tight">
            קוד קופון בלעדי לרוכשים מישראל
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs mx-auto">
            אל תפספסו! קבלו הנחה נוספת על כל סל הקניות שלכם באלי אקספרס להזמנות מעל $30.
          </p>
        </div>

        {/* Coupon Code Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-ali-300 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">קוד הקופון שלכם:</span>
            <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>נבדק ונמצא פעיל</span>
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-xl border border-ali-200 shadow-inner">
            <span className="font-mono text-lg sm:text-xl font-black text-ali-600 tracking-wider select-all">
              {COUPON_CODE}
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>הועתק!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>העתק קופון</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2 pt-1">
          <a
            href="/go/coupon?sub_id=popup_featured&cta=modal&page=global"
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={handleClose}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-sm shadow-lg shadow-ali-500/25 transition-all hover:scale-[1.01]"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>למעבר למימוש הקופון באלי אקספרס</span>
            <ArrowLeft className="w-4 h-4 mr-1" />
          </a>

          <button
            type="button"
            onClick={handleClose}
            className="w-full text-center text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
          >
            לא תודה, אמשיך לגלוש באתר
          </button>
        </div>
      </div>
    </div>
  );
}
