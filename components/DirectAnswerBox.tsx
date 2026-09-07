import { Sparkles, CheckCircle } from "lucide-react";

interface DirectAnswerBoxProps {
  answerText: string;
  badgeText?: string;
  sourceNote?: string;
}

export default function DirectAnswerBox({
  answerText,
  badgeText = "השורה התחתונה (תקציר AI מהיר)",
  sourceNote = "מבוסס על ניתוח מעמיק של מפרט המוצר וביקורות רוכשים מאומתות",
}: DirectAnswerBoxProps) {
  return (
    <div className="my-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white shadow-xl border border-indigo-500/20 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-10 -left-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-ali-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
          {badgeText}
        </span>
      </div>

      {/* Answer content for humans and GEO engines */}
      <p className="text-base sm:text-lg font-medium leading-relaxed text-slate-100">
        {answerText}
      </p>

      {/* Verification note */}
      <div className="mt-4 pt-4 border-t border-slate-700/60 flex items-center gap-2 text-xs text-slate-400">
        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>{sourceNote}</span>
      </div>
    </div>
  );
}
