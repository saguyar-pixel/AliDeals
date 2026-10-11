"use client";

import React, { useState } from "react";
import { List, ChevronDown, ChevronUp, Compass, ArrowDownCircle, X } from "lucide-react";

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface ArticleTocDrawerProps {
  toc: TocItem[];
  className?: string;
}

export default function ArticleTocDrawer({ toc = [], className = "" }: ArticleTocDrawerProps) {
  // Closed by default as required
  const [isOpen, setIsOpen] = useState(false);

  if (!toc || toc.length === 0) return null;

  const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // Update hash in address bar without jumping
      window.history.pushState(null, "", `#${id}`);
    }
  };

  return (
    <nav
      aria-label="תוכן עניינים וניווט מהיר"
      className={`my-6 rounded-2xl bg-gradient-to-r from-slate-50 to-indigo-50/30 border border-slate-200/90 shadow-xs text-right transition-all duration-200 overflow-hidden ${className}`}
      dir="rtl"
    >
      {/* Header / Trigger Accordion */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="w-full px-4 sm:px-5 py-3.5 sm:py-4 flex items-center justify-between gap-3 text-slate-900 hover:bg-slate-100/60 transition-colors focus:outline-none cursor-pointer"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <List className="w-4 h-4" />
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base text-slate-900">
                תוכן עניינים וראשי פרקים
              </span>
              <span className="px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700 font-bold text-[11px]">
                {toc.length} פרקים
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden sm:block">
              קפיצה ישירה לכל סעיף, בדיקה או המלצה במדריך של רוֹן
            </p>
          </div>
        </div>

        {/* Clear CTA Button */}
        <div className="shrink-0">
          <span
            className={`inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-xs ${
              isOpen
                ? "bg-slate-200 text-slate-800 hover:bg-slate-300"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20"
            }`}
          >
            <span>{isOpen ? "סגור תוכן עניינים" : "לניווט מהיר בעמוד"}</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? "rotate-180" : ""
              }`}
            />
          </span>
        </div>
      </button>

      {/* Collapsible Content Drawer */}
      {isOpen && (
        <div className="px-4 sm:px-6 pb-5 pt-2 border-t border-slate-200/70 bg-white/70 animate-in slide-in-from-top-2 duration-150">
          <div className="py-2 mb-2 flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-100">
            <span className="flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-indigo-600" />
              <span>לחץ על סעיף כדי לדלג אליו ישירות:</span>
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 flex items-center gap-0.5 cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>סגור</span>
            </button>
          </div>

          <ol className="space-y-1.5 text-xs sm:text-sm">
            {toc.map((item, idx) => (
              <li
                key={`toc_${idx}`}
                className={`${item.level === 3 ? "mr-5 sm:mr-6" : ""}`}
              >
                <a
                  href={`#${item.id}`}
                  onClick={(e) => handleItemClick(e, item.id)}
                  className={`group flex items-center justify-between p-2 rounded-xl transition-all ${
                    item.level === 3
                      ? "text-slate-600 hover:text-indigo-600 hover:bg-slate-100/70 text-xs"
                      : "text-slate-800 hover:text-indigo-700 hover:bg-indigo-50/80 font-bold"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono shrink-0 ${
                        item.level === 3
                          ? "bg-slate-100 text-slate-500"
                          : "bg-indigo-100 text-indigo-700 font-bold"
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <span className="truncate group-hover:translate-x-0.5 transition-transform">
                      {item.text}
                    </span>
                  </div>

                  <ArrowDownCircle className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            ))}
          </ol>

          <div className="mt-4 pt-3 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              ▲ סגור את תוכן העניינים והמשך בקריאה
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
