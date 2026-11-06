"use client";

import React, { useState, useRef, useEffect } from "react";
import { Share2, Check, Copy } from "lucide-react";

export type ShareContentType = "review" | "deal" | "top5" | "article" | "calculator";

export interface ShareDealButtonProps {
  title: string;
  /** Relative path (e.g. "/reviews/my-slug") or full URL */
  url: string;
  priceIls?: number;
  priceUsd?: number;
  isTaxExempt?: boolean;
  contentType?: ShareContentType;
  itemId?: string;
  /**
   * "inline" = full non-sticky horizontal share bar (for Review, Top 5, Article pages)
   * "compact" = compact header/hero button row (WhatsApp + Telegram + Copy)
   * "card" = subtle corner button on product/review cards with quick menu
   */
  variant?: "inline" | "compact" | "card";
  label?: string;
  className?: string;
}

function WhatsAppSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.031 2c-5.516 0-9.969 4.453-9.969 9.969 0 1.766.469 3.484 1.359 5.016L2 22l5.156-1.359a9.922 9.922 0 0 0 4.875 1.281h.004c5.512 0 9.965-4.453 9.965-9.969 0-2.664-1.039-5.168-2.922-7.051A9.907 9.907 0 0 0 12.031 2zm5.82 14.289c-.246.695-1.43 1.328-1.988 1.414-.512.078-1.16.109-1.875-.117-.434-.137-.988-.32-1.699-.629-2.988-1.289-4.941-4.297-5.09-4.496-.148-.199-1.215-1.617-1.215-3.086 0-1.469.77-2.191 1.043-2.488.273-.297.598-.371.797-.371.199 0 .398.004.57.012.184.008.43-.07.672.512.246.594.844 2.059.918 2.207.074.148.125.324.023.523-.098.199-.148.324-.297.496-.148.172-.312.387-.445.52-.148.148-.305.309-.133.605.172.297.766 1.266 1.645 2.047 1.133 1.008 2.086 1.32 2.383 1.469.297.148.473.125.648-.074.172-.199.742-.867.941-1.164.199-.297.398-.246.672-.148.273.098 1.738.82 2.035.969.297.148.496.223.57.348.074.125.074.719-.172 1.414z" />
    </svg>
  );
}

function TelegramShareSvg({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

export default function ShareDealButton({
  title,
  url,
  priceIls,
  priceUsd,
  isTaxExempt,
  contentType = "review",
  itemId,
  variant = "inline",
  label,
  className = "",
}: ShareDealButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const buildTrackedUrl = (medium: "whatsapp" | "telegram" | "copy_link") => {
    const baseOrigin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://ali-deals.co.il";

    const fullUrl = url.startsWith("http")
      ? url
      : `${baseOrigin}${url.startsWith("/") ? url : `/${url}`}`;

    try {
      const parsed = new URL(fullUrl);
      parsed.searchParams.set("utm_source", medium);
      parsed.searchParams.set("utm_medium", "peer_share");
      parsed.searchParams.set("utm_campaign", `share_${contentType}`);
      return parsed.toString();
    } catch {
      return fullUrl;
    }
  };

  const buildShareMessage = () => {
    const hasPrice = typeof priceIls === "number" && priceIls > 0;
    const taxBadge =
      isTaxExempt === true
        ? " — פטור ממכס! ✅"
        : typeof priceUsd === "number" && priceUsd > 0 && priceUsd < 75
        ? " — פטור ממכס! ✅"
        : "";

    if (contentType === "top5") {
      return `🏆 שווה בדיקה — השוואת 5 הדגמים המומלצים ב-AliDeals:\n${title}`;
    }
    if (contentType === "article") {
      return `📖 מדריך מומלץ לקנייה חכמה באלי אקספרס מתוך AliDeals:\n${title}`;
    }
    if (hasPrice) {
      const usdPart = typeof priceUsd === "number" && priceUsd > 0 ? ` ($${priceUsd}${taxBadge})` : taxBadge;
      return `🔥 תראו איזו מציאה מצאתי ב-AliDeals:\n${title} ב-₪${priceIls} בלבד${usdPart}`;
    }
    return `🔥 מציאה שווה מתוך AliDeals:\n${title}`;
  };

  const trackShareEvent = (method: "whatsapp" | "telegram" | "copy_link") => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "share_deal", {
        method,
        content_type: contentType,
        item_id: itemId || url,
        title,
      });
    }
  };

  const handleWhatsAppShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackShareEvent("whatsapp");
    const trackedUrl = buildTrackedUrl("whatsapp");
    const fullText = `${buildShareMessage()}\n${trackedUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(fullText)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setMenuOpen(false);
  };

  const handleTelegramShare = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackShareEvent("telegram");
    const trackedUrl = buildTrackedUrl("telegram");
    const message = buildShareMessage();
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(trackedUrl)}&text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setMenuOpen(false);
  };

  const handleCopyLink = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    trackShareEvent("copy_link");
    const trackedUrl = buildTrackedUrl("copy_link");
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(trackedUrl);
      }
      setIsCopied(true);
      setTimeout(() => {
        setIsCopied(false);
        setMenuOpen(false);
      }, 2000);
    } catch {
      // Ignore clipboard permission errors
    }
  };

  // 1. Card Corner Trigger (for Homepage review/deal cards)
  if (variant === "card") {
    return (
      <div
        ref={containerRef}
        className={`relative z-20 ${className}`}
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setMenuOpen((prev) => !prev);
          }}
          aria-label={`שתף את "${title}" עם חברים`}
          title="שלח מציאה לחבר בוואטסאפ או בטלגרם"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/95 hover:bg-white text-slate-700 hover:text-slate-950 border border-slate-200/90 shadow-sm text-[11px] font-bold transition-all cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-ali-600" />
          <span>שתף</span>
        </button>

        {menuOpen && (
          <div
            className="absolute left-0 mt-1.5 w-44 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 space-y-1 z-30 animate-in fade-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-2.5 py-1 text-[10px] font-bold text-slate-400 border-b border-slate-100">
              שלח מציאה לחבר:
            </div>
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer text-right"
            >
              <WhatsAppSvg className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>שליחה בוואטסאפ</span>
            </button>
            <button
              type="button"
              onClick={handleTelegramShare}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-sky-700 hover:bg-sky-50 transition-colors cursor-pointer text-right"
            >
              <TelegramShareSvg className="w-4 h-4 text-sky-500 shrink-0" />
              <span>שליחה בטלגרם</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-right"
            >
              {isCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span className="text-emerald-700">הקישור הועתק!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>העתקת קישור</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 2. Compact Button Row (for Page Headers / Purchase Box)
  if (variant === "compact") {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`} dir="rtl">
        <span className="text-xs font-bold text-slate-500 flex items-center gap-1 ml-1">
          <Share2 className="w-3.5 h-3.5 text-slate-400" />
          <span>{label || "שלח לחבר:"}</span>
        </span>
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition-colors cursor-pointer"
        >
          <WhatsAppSvg className="w-3.5 h-3.5 text-emerald-600" />
          <span>וואטסאפ</span>
        </button>
        <button
          type="button"
          onClick={handleTelegramShare}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs transition-colors cursor-pointer"
        >
          <TelegramShareSvg className="w-3.5 h-3.5 text-sky-600" />
          <span>טלגרם</span>
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
        >
          {isCopied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-emerald-700">הועתק!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>העתק</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // 3. Full Non-Sticky Inline Share Bar
  const defaultBarLabel =
    contentType === "top5"
      ? "מכירים מישהו שמחפש דגם מומלץ? שלחו לו את ההשוואה:"
      : contentType === "article"
      ? "מצאתם ערך במדריך? שלחו לחברים או למשפחה:"
      : "מצאתם מציאה שמתאימה לחבר או לבן/בת זוג? שלחו להם:";

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-l from-slate-50 via-white to-emerald-50/40 border border-slate-200/90 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 text-right ${className}`}
      dir="rtl"
    >
      <div className="flex items-center gap-2.5 text-slate-800 font-bold text-xs sm:text-sm">
        <span className="w-8 h-8 rounded-xl bg-ali-50 border border-ali-100 text-ali-600 flex items-center justify-center shrink-0">
          <Share2 className="w-4 h-4" />
        </span>
        <span>{label || defaultBarLabel}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleWhatsAppShare}
          className="px-3.5 py-2 rounded-xl bg-[#25D366] hover:bg-[#1fb855] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <WhatsAppSvg className="w-4 h-4" />
          <span>שליחה בוואטסאפ</span>
        </button>

        <button
          type="button"
          onClick={handleTelegramShare}
          className="px-3.5 py-2 rounded-xl bg-[#229ED9] hover:bg-[#1c8ec4] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
        >
          <TelegramShareSvg className="w-4 h-4" />
          <span>שליחה בטלגרם</span>
        </button>

        <button
          type="button"
          onClick={handleCopyLink}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
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
  );
}
