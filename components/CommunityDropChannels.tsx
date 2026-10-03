"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Send, X, ChevronUp, CheckCircle2 } from "lucide-react";

interface CommunityDropChannelsProps {
  telegramUrl?: string;
  className?: string;
}

export default function CommunityDropChannels({
  telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || "https://t.me/AliDealsIL?start=site_deal_request",
  className = "",
}: CommunityDropChannelsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [effectiveUrl, setEffectiveUrl] = useState(telegramUrl);
  const [titleText, setTitleText] = useState("אתם מבקשים — אנחנו מוצאים!");
  const pathname = usePathname();

  // Hide widget entirely on admin/CMS routes
  const isAdminRoute = pathname?.startsWith("/admin");

  useEffect(() => {
    // Check if dismissed in this session
    try {
      const dismissed = sessionStorage.getItem("alideals_telegram_deal_widget_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    } catch {}

    // Load site settings dynamically to check if feature is enabled/disabled via CMS
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data?.settings?.enableDealRequestWidget === false) {
          setIsEnabled(false);
        }
        if (data?.settings?.dealRequestTelegramUrl) {
          setEffectiveUrl(data.settings.dealRequestTelegramUrl);
        }
        if (data?.settings?.dealRequestTitle) {
          setTitleText(data.settings.dealRequestTitle);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("alideals_telegram_deal_widget_dismissed", "true");
    } catch {}
  };

  const handleOpenTelegram = () => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "telegram_request_deal_click", {
        platform: "telegram",
        channel_url: effectiveUrl,
        source: "deal_request_widget",
      });
    }
    window.open(effectiveUrl, "_blank", "noopener,noreferrer");
  };

  // Don't render if disabled via CMS, in admin, or if dismissed by user
  if (!isEnabled || isAdminRoute || isDismissed) return null;

  return (
    <div
      className={`fixed z-40 font-sans transition-all duration-300 ${className} ${
        isOpen
          ? "bottom-5 left-4 right-4 sm:left-5 sm:right-auto"
          : "bottom-[84px] right-4 sm:bottom-5 sm:right-5"
      }`}
      dir="rtl"
    >
      {/* Expanded Modal Card */}
      {isOpen ? (
        <div className="w-full sm:w-[380px] rounded-3xl bg-white/95 backdrop-blur-md border-2 border-ali-500 shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200 text-right space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#229ED9] to-[#0088cc] text-white flex items-center justify-center shadow-md shadow-[#229ED9]/30">
                <Send className="w-5 h-5 -rotate-12" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-ali-600 bg-ali-50 px-2 py-0.5 rounded-full border border-ali-100">
                  חדש! קהילת AliDeals
                </span>
                <h4 className="text-base font-black text-slate-900 leading-snug">
                  {titleText}
                </h4>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="סגור חלון"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            מחפשים קישור למוצר ספציפי באלי אקספרס? צריכים עזרה במציאת הדיל הזול ביותר או בדיקת תאימות לשקע ישראלי? 
            פתחו שיחה אישית ישירה בטלגרם ונאתר לכם מיד את ההצעה הטובה ביותר!
          </p>

          <div className="space-y-1.5 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>איתור קישורים ישירים והשוואת מחירים בזמן אמת</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>סינון מוצרים מתחת לרף המכס (75$) וחיסכון מע&quot;מ</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>בדיקת שקע אירופאי (EU 220V) מותאם לישראל</span>
            </div>
          </div>

          <div className="pt-1">
            {/* Telegram Deal Finder Action Button */}
            <button
              type="button"
              onClick={handleOpenTelegram}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#229ED9] to-[#0088cc] hover:from-[#1d8bc0] hover:to-[#0077b3] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-lg shadow-[#229ED9]/25 transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>פתיחת שיחה בטלגרם ({titleText})</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 border-t border-slate-100">
            <span>שירות חינמי לגמרי לחברי הקהילה</span>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              אל תציג שוב
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Floating Trigger: Mobile Circle & Desktop Pill */
        <div className="relative group">
          {/* Mobile View: Compact Right-Aligned Circle Button placed above sticky CTA bar */}
          <button
            onClick={() => setIsOpen(true)}
            className="sm:hidden w-12 h-12 rounded-full bg-gradient-to-r from-[#229ED9] via-[#0088cc] to-ali-600 text-white font-black shadow-2xl border-2 border-white flex items-center justify-center transition-transform active:scale-90"
            aria-label={titleText}
          >
            <span className="relative flex h-2.5 w-2.5 absolute top-1 right-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400"></span>
            </span>
            <Send className="w-5 h-5 text-white -rotate-12" />
          </button>

          {/* Desktop View: Full Pill Button */}
          <button
            onClick={() => setIsOpen(true)}
            className="hidden sm:flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-[#229ED9] via-[#0088cc] to-ali-600 text-white font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
            aria-label={titleText}
          >
            <span className="relative flex h-2.5 w-2.5 sm:h-3 sm:w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-amber-400"></span>
            </span>
            <Send className="w-4 h-4 text-white" />
            <span>{titleText} 💬</span>
            <ChevronUp className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>
      )}
    </div>
  );
}
