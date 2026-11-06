"use client";

import React, { useState, useEffect } from "react";
import { ArrowUp, List, ChevronDown, ChevronUp } from "lucide-react";
import ShareDealButton from "@/components/share/ShareDealButton";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface ArticleInteractionsProps {
  title: string;
  url: string;
  toc?: TocItem[];
  showToc?: boolean;
  showSocialShare?: boolean;
}

export function ArticleShareBar({
  title,
  url,
  className = "",
}: {
  title: string;
  url: string;
  className?: string;
}) {
  return (
    <div className={`my-8 ${className}`}>
      <ShareDealButton
        title={title}
        url={url}
        contentType="article"
        variant="inline"
      />
    </div>
  );
}

export default function ArticleInteractions({
  title,
  url,
  toc = [],
  showToc = false,
  showSocialShare = false,
}: ArticleInteractionsProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        const progress = Math.min(100, Math.max(0, (window.scrollY / totalHeight) * 100));
        setScrollProgress(progress);
      }
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      {/* 1. Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-100 z-50 pointer-events-none">
        <div
          className="h-full bg-gradient-to-r from-ali-500 via-amber-500 to-indigo-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. Collapsible Table of Contents (if enabled & items exist) */}
      {showToc && toc.length > 0 && (
        <nav
          aria-label="תוכן עניינים"
          className="my-6 p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 not-prose text-right"
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="w-full flex items-center justify-between text-slate-900 font-extrabold text-sm sm:text-base focus:outline-none cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-indigo-600" />
              <span>תוכן עניינים וראשי פרקים במדריך</span>
              <span className="text-[11px] font-normal text-slate-500">({toc.length} פרקים)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs">
                <span>{isTocOpen ? "סגור תוכן עניינים" : "לניווט מהיר בעמוד"}</span>
                {isTocOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </span>
            </div>
          </button>

          {isTocOpen && (
            <ol className="mt-3.5 space-y-2 border-t border-slate-200/60 pt-3 text-xs sm:text-sm">
              {toc.map((item, idx) => (
                <li
                  key={`toc_${idx}`}
                  style={{ marginRight: item.level === 3 ? "1.25rem" : "0" }}
                  className="leading-relaxed"
                >
                  <a
                    href={`#${item.id}`}
                    onClick={() => setIsTocOpen(false)}
                    className="text-slate-700 hover:text-indigo-600 transition-colors flex items-center gap-1.5 font-medium"
                  >
                    <span className="text-[10px] text-slate-400 font-mono select-none">{idx + 1}.</span>
                    <span>{item.text}</span>
                  </a>
                </li>
              ))}
            </ol>
          )}
        </nav>
      )}

      {/* 3. Floating Back to Top Button */}
      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          title="חזרה לראש העמוד"
          className="fixed bottom-6 left-6 z-40 p-3 rounded-full bg-white/95 border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 shadow-lg shadow-slate-900/10 transition-all transform hover:scale-105 cursor-pointer"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* 4. Social Sharing Toolbar (if enabled) */}
      {showSocialShare && (
        <ArticleShareBar title={title} url={url} />
      )}
    </>
  );
}
