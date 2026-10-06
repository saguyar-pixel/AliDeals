"use client";

import React, { useState, useEffect } from "react";
import { Share2, Check, Copy, ArrowUp, List, ChevronDown, ChevronUp } from "lucide-react";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface ArticleInteractionsProps {
  title: string;
  url: string;
  toc?: TocItem[];
}

export default function ArticleInteractions({ title, url, toc = [] }: ArticleInteractionsProps) {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isTocOpen, setIsTocOpen] = useState(true);

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

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(url || window.location.href);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const shareText = encodeURIComponent(`${title}\nמדריך מומלץ מתוך AliDeals:\n${url}`);
  const whatsappUrl = `https://api.whatsapp.com/send?text=${shareText}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`;

  return (
    <>
      {/* 1. Reading Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-slate-100 z-50">
        <div
          className="h-full bg-gradient-to-r from-ali-500 via-amber-500 to-indigo-600 transition-all duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* 2. Collapsible Table of Contents (if items exist) */}
      {toc.length > 0 && (
        <nav
          aria-label="תוכן עניינים"
          className="my-6 p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/90 not-prose text-right"
          dir="rtl"
        >
          <button
            type="button"
            onClick={() => setIsTocOpen(!isTocOpen)}
            className="w-full flex items-center justify-between text-slate-900 font-extrabold text-sm sm:text-base focus:outline-none"
          >
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-indigo-600" />
              <span>תוכן עניינים וראשי פרקים במדריך</span>
              <span className="text-[11px] font-normal text-slate-500">({toc.length} פרקים)</span>
            </div>
            {isTocOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
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
          className="fixed bottom-6 left-6 z-40 p-3 rounded-full bg-white/95 border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 shadow-lg shadow-slate-900/10 transition-all transform hover:scale-105"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      )}

      {/* 4. Social Sharing Toolbar */}
      <div className="my-8 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-right" dir="rtl">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-xs sm:text-sm">
          <Share2 className="w-4 h-4 text-indigo-600" />
          <span>מצאת ערך במדריך? שתף עם חברים:</span>
        </div>
        <div className="flex items-center gap-2">
          {/* WhatsApp */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>וואטסאפ</span>
          </a>

          {/* Telegram */}
          <a
            href={telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <span>טלגרם</span>
          </a>

          {/* Copy Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            {isCopied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">הקישור הועתק!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>העתק קישור</span>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
