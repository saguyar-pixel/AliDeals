"use client";

import { useState, useEffect } from "react";
import { Bell, Send, MessageCircle, X, ChevronUp, Sparkles, CheckCircle2 } from "lucide-react";

interface CommunityDropChannelsProps {
  telegramUrl?: string;
  whatsappUrl?: string;
  className?: string;
}

export default function CommunityDropChannels({
  telegramUrl = process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL || "https://t.me/AliDealsIL",
  whatsappUrl = process.env.NEXT_PUBLIC_WHATSAPP_CHANNEL_URL || "https://chat.whatsapp.com/AliDealsVIP",
  className = "",
}: CommunityDropChannelsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    try {
      const dismissed = sessionStorage.getItem("alideals_drop_widget_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("alideals_drop_widget_dismissed", "true");
    } catch {}
  };

  const handleChannelClick = (platform: "telegram" | "whatsapp", url: string) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "community_channel_click", {
        platform,
        channel_url: url,
        source: "drop_widget",
      });
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (isDismissed) return null;

  return (
    <div
      className={`fixed bottom-5 left-5 z-40 font-sans ${className}`}
      dir="rtl"
    >
      {/* Expanded Modal Card */}
      {isOpen ? (
        <div className="w-[330px] sm:w-[360px] rounded-3xl bg-white/95 backdrop-blur-md border-2 border-ali-500 shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-200 text-right space-y-4">
          <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-ali-500 to-amber-500 text-white flex items-center justify-center shadow-md shadow-ali-500/20">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-ali-600 bg-ali-50 px-2 py-0.5 rounded-full">
                  ערוץ VIP בזמן אמת
                </span>
                <h4 className="text-base font-black text-slate-900 leading-snug">
                  דילים וקופונים חמים ב-Drop!
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
            רוצה לקבל התראה מיידית לנייד ברגע שהמחיר של מוצר מבוקש צונח, או כשיוצא קופון בזק בלעדי לקהילה הישראלית?
          </p>

          <div className="space-y-1.5 text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>ירידות מחיר קיצוניות ומבצעי 0-10$</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>קופוני הנחה גלובליים ללא הגבלת מינימום</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>בדיקות תאימות לישראל (מתח 220V ותקע EU)</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            {/* Telegram Channel Button */}
            <button
              type="button"
              onClick={() => handleChannelClick("telegram", telegramUrl)}
              className="w-full py-3 px-4 rounded-xl bg-[#229ED9] hover:bg-[#1d8bc0] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md shadow-[#229ED9]/25 transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>הצטרפות לערוץ הטלגרם השקט (ללא ספאם)</span>
            </button>

            {/* WhatsApp Community Button */}
            <button
              type="button"
              onClick={() => handleChannelClick("whatsapp", whatsappUrl)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20 transition-all cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4" />
              <span>ערוץ עדכוני וואטסאפ (Drops VIP)</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 text-[10px] text-slate-400 border-t border-slate-100">
            <span>חינם לחלוטין • פתוח לכל חברי AliDeals</span>
            <button
              onClick={handleDismiss}
              className="text-slate-400 hover:text-slate-600 underline cursor-pointer"
            >
              אל תציג שוב
            </button>
          </div>
        </div>
      ) : (
        /* Collapsed Floating Pill */
        <div className="relative group">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-ali-600 via-ali-500 to-amber-500 text-white font-black text-xs sm:text-sm shadow-xl hover:shadow-2xl hover:scale-105 transition-all cursor-pointer"
            aria-label="ערוץ התראות דילים בזמן אמת"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400"></span>
            </span>
            <Bell className="w-4 h-4 text-white" />
            <span>התראות ירידת מחיר בזמן אמת</span>
            <ChevronUp className="w-3.5 h-3.5 text-white/80" />
          </button>
        </div>
      )}
    </div>
  );
}
