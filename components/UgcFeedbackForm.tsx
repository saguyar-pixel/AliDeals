"use client";

import { useState, useEffect } from "react";
import { CheckCircle, ThumbsUp, ThumbsDown, Send, ShieldCheck, HeartHandshake, Sparkles } from "lucide-react";
import { trackUgcVoteSubmitted } from "@/lib/analytics/ga4";

interface UgcFeedbackFormProps {
  productId: string;
  productTitle?: string;
  className?: string;
  onSubmitted?: () => void;
}

export default function UgcFeedbackForm({
  productId,
  productTitle,
  className = "",
  onSubmitted,
}: UgcFeedbackFormProps) {
  const [isEuPlug, setIsEuPlug] = useState<boolean>(true);
  const [voltage220vCompatible, setVoltage220vCompatible] = useState<boolean>(true);
  const [deliveryDays, setDeliveryDays] = useState<number>(11);
  const [isRecommended, setIsRecommended] = useState<boolean>(true);
  const [buyerComment, setBuyerComment] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!productId) return;
    try {
      const alreadyVoted = localStorage.getItem(`ugc_voted_${productId}`);
      if (alreadyVoted === "true") {
        setSubmitted(true);
      }
    } catch {}
  }, [productId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || loading) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/ugc-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          isEuPlug,
          voltage220vCompatible,
          deliveryDays,
          isRecommended,
          buyerComment: buyerComment.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "שגיאה בשליחת המשוב");
      }

      // Track in GA4
      trackUgcVoteSubmitted({
        product_id: productId,
        is_eu_plug: isEuPlug,
        delivery_days: deliveryDays,
        is_recommended: isRecommended,
      });

      setSubmitted(true);
      try {
        localStorage.setItem(`ugc_voted_${productId}`, "true");
      } catch {}

      if (onSubmitted) {
        onSubmitted();
      }
    } catch (err: any) {
      setErrorMsg(err.message || "שגיאה זמנית בשליחת הנתונים");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div
        className={`rounded-2xl bg-emerald-50/90 border-2 border-emerald-200 p-5 text-right shadow-xs space-y-2 text-emerald-900 ${className}`}
        dir="rtl"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-emerald-950">תודה על התרומה לקהילה!</h4>
            <p className="text-xs text-emerald-800">
              הפידבק שלך נשמר בהצלחה ועוזר לקונים ישראלים הבאים להזמין בביטחון ובשקט נפשי.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl border-2 border-slate-200 bg-white p-6 sm:p-7 shadow-sm text-right space-y-5 ${className}`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-ali-500/10 text-ali-600 flex items-center justify-center font-bold">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-ali-600 bg-ali-50 px-2 py-0.5 rounded-full">
              עזרה הדדית לרוכשים בישראל
            </span>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-snug">
              רכשת את המוצר? עזור לקהילה הישראלית!
            </h3>
          </div>
        </div>

        <span className="self-start sm:self-auto text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          ⏱️ סקר מהיר של 10 שניות (ללא הרשמה)
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Toggle 1: EU Plug */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 block">
            🔌 האם המוצר הגיע עם תקע אירופאי (EU Plug) מקורי?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsEuPlug(true)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isEuPlug
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>כן, תקע EU ישראלי מקורי 👍</span>
            </button>
            <button
              type="button"
              onClick={() => setIsEuPlug(false)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isEuPlug
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>לא, הגיע תקע אחר / מתאם 👎</span>
            </button>
          </div>
        </div>

        {/* Toggle 2: 220V */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 block">
            ⚡ האם עובד חלק ברשת החשמל הישראלית (220V)?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVoltage220vCompatible(true)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                voltage220vCompatible
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>עובד מושלם (220V תקין) ⚡</span>
            </button>
            <button
              type="button"
              onClick={() => setVoltage220vCompatible(false)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !voltage220vCompatible
                  ? "bg-red-600 text-white border-red-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>דורש שנאי מיוחד ❌</span>
            </button>
          </div>
        </div>

        {/* Toggle 3: Delivery Days */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 block">
            📦 כמה זמן לקח המשלוח עד לסניף הדואר / נקודת החלוקה?
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { days: 7, label: "עד 7 ימים 🚀" },
              { days: 11, label: "8-12 ימים ⚡" },
              { days: 16, label: "13-18 ימים 📦" },
              { days: 24, label: "מעל 3 שבועות 🐢" },
            ].map((option) => (
              <button
                key={option.days}
                type="button"
                onClick={() => setDeliveryDays(option.days)}
                className={`py-2 px-2.5 rounded-xl border text-xs font-bold text-center transition-all cursor-pointer ${
                  deliveryDays === option.days
                    ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle 4: Overall Recommendation */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 block">
            ⭐ האם היית ממליץ/ה לחברים ישראלים לרכוש את המוצר?
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsRecommended(true)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isRecommended
                  ? "bg-ali-600 text-white border-ali-600 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>כן, ממליץ/ה בחום!</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRecommended(false)}
              className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                !isRecommended
                  ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                  : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <ThumbsDown className="w-3.5 h-3.5" />
              <span>פחות מומלץ</span>
            </button>
          </div>
        </div>

        {/* Short optional comment */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700 block">
            טיפ קצר לקונה הבא (אופציונלי):
          </label>
          <input
            type="text"
            value={buyerComment}
            onChange={(e) => setBuyerComment(e.target.value)}
            placeholder="לדוגמה: מומלץ לבחור משלוח Choice, איכות בנייה מעולה..."
            maxLength={150}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-ali-500 focus:border-transparent outline-none bg-slate-50/50"
          />
        </div>

        {errorMsg && (
          <div className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-black text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? "שולח פידבק..." : "שליחת פידבק ב-1 קליק (ללא הרשמה)"}</span>
        </button>
      </form>
    </div>
  );
}
