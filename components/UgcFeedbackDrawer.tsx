"use client";

import { useState } from "react";
import { ChevronDown, MessageSquareHeart, Sparkles } from "lucide-react";
import UgcFeedbackForm from "./UgcFeedbackForm";
import { trackUgcDrawerOpened } from "@/lib/analytics/ga4";

interface UgcFeedbackDrawerProps {
  productId: string;
  productTitle?: string;
  className?: string;
}

export default function UgcFeedbackDrawer({
  productId,
  productTitle,
  className = "",
}: UgcFeedbackDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasTracked, setHasTracked] = useState(false);

  const toggleDrawer = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);

    if (nextState && !hasTracked && productId) {
      trackUgcDrawerOpened(productId);
      setHasTracked(true);
    }
  };

  return (
    <div
      className={`rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-sm overflow-hidden transition-all ${className}`}
      dir="rtl"
    >
      {/* Accordion Trigger Header */}
      <button
        type="button"
        onClick={toggleDrawer}
        aria-expanded={isOpen}
        className="w-full p-5 sm:p-6 flex items-center justify-between text-right cursor-pointer hover:bg-slate-50/80 transition-colors group focus:outline-hidden"
      >
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-ali-50 border border-ali-100 text-ali-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <MessageSquareHeart className="w-5 h-5 text-ali-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 group-hover:text-ali-600 transition-colors">
                רכשת כבר? ספר לנו איך היה! ✍️
              </h3>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                10 שניות
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              שתף את קהילת הרוכשים בישראל בחוות הדעת שלך על המוצר
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 group-hover:text-slate-700 hidden sm:inline">
            {isOpen ? "הסתר טופס" : "פתח משוב"}
          </span>
          <div
            className={`w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-600 shadow-2xs transition-transform duration-300 ${
              isOpen ? "rotate-180 bg-slate-100" : ""
            }`}
          >
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </button>

      {/* Accordion Content Body */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isOpen ? "max-h-[900px] opacity-100 border-t border-slate-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="p-5 sm:p-6 bg-white/70">
          <UgcFeedbackForm productId={productId} productTitle={productTitle} />
        </div>
      </div>
    </div>
  );
}
