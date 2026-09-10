"use client";

import { useMemo } from "react";
import { evaluateGeoReadiness } from "@/lib/seo/geo-scorer";
import { Sparkles, CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

interface GeoScoreWidgetProps {
  text: string;
}

export default function GeoScoreWidget({ text }: GeoScoreWidgetProps) {
  const result = useMemo(() => evaluateGeoReadiness(text), [text]);

  const levelColor =
    result.level === "excellent"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : result.level === "good"
      ? "text-sky-700 bg-sky-50 border-sky-200"
      : "text-amber-700 bg-amber-50 border-amber-200";

  const barColor =
    result.level === "excellent"
      ? "bg-emerald-500"
      : result.level === "good"
      ? "bg-sky-500"
      : "bg-amber-500";

  return (
    <div className={`p-4 rounded-2xl border ${levelColor} space-y-3`} dir="rtl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="font-bold text-xs">מדד מוכנות ל-AI Search (ציטוט ב-Google AI / ChatGPT)</span>
        </div>
        <div className="flex items-center gap-1.5 font-bold font-mono text-sm">
          <span>{result.score}/100</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-black/10 rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${result.score}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-600">
        <span>אורך נוכחי: {result.wordCount} מילים (יעד מומלץ: 45–70 מילים)</span>
        <span className="font-semibold">
          {result.level === "excellent" ? "מוכן לציטוט! 🚀" : result.level === "good" ? "רמה טובה 👍" : "דורש שיפור ✏️"}
        </span>
      </div>

      {/* Tips */}
      <ul className="space-y-1 text-[11px] pt-1 border-t border-black/5">
        {result.tips.map((tip, idx) => (
          <li key={idx} className="flex items-start gap-1.5">
            <span className="shrink-0 mt-0.5">•</span>
            <span>{tip}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
