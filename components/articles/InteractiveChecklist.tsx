"use client";

import React, { useState } from "react";
import { ListChecks, Check, Copy, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";

export interface ChecklistItem {
  id: string;
  text: string;
  initialChecked?: boolean;
}

interface InteractiveChecklistProps {
  title?: string;
  items: ChecklistItem[];
  className?: string;
}

export default function InteractiveChecklist({
  title = "צ'קליסט קנייה חכמה של רוֹן",
  items = [],
  className = "",
}: InteractiveChecklistProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    items.forEach((it) => {
      if (it.initialChecked) {
        initial.add(it.id);
      }
    });
    return initial;
  });

  const [copied, setCopied] = useState(false);

  if (!items || items.length === 0) return null;

  const total = items.length;
  const completed = checkedIds.size;
  const percent = Math.round((completed / total) * 100);
  const isAllCompleted = completed === total;

  const toggleItem = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCopy = () => {
    const textLines = items.map((it) => {
      const isChecked = checkedIds.has(it.id);
      return `${isChecked ? "[✓]" : "[ ]"} ${it.text}`;
    });
    const content = `${title}\n${textLines.join("\n")}\n\nמתוך AliDeals ישראל: https://ali-deals.co.il`;

    navigator.clipboard.writeText(content).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const resetAll = () => {
    setCheckedIds(new Set());
  };

  return (
    <div
      className={`my-8 p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-50 via-white to-indigo-50/20 border border-slate-200/90 shadow-xs hover:shadow-md transition-all ${className}`}
      dir="rtl"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shrink-0">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 leading-tight">
              {title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              סמנו את הסעיפים שבדקתם כדי לוודא רכישה בטוחה וחסכונית
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
            title="העתק את הצ'קליסט להודעה או לפתקים"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700">הועתק ללוח!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>העתק צ'קליסט</span>
              </>
            )}
          </button>

          {completed > 0 && (
            <button
              type="button"
              onClick={resetAll}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="איפוס סימונים"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="my-4">
        <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
          <span className="text-slate-700">
            התקדמות בדיקות הקנייה:
          </span>
          <span
            className={`font-mono text-xs ${
              isAllCompleted ? "text-emerald-600 font-black" : "text-indigo-600 font-bold"
            }`}
          >
            {completed} מתוך {total} הושלמו ({percent}%)
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isAllCompleted
                ? "bg-gradient-to-r from-emerald-500 to-teal-500 shadow-xs shadow-emerald-500/30"
                : "bg-gradient-to-r from-indigo-500 to-ali-500"
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2.5 pt-1">
        {items.map((item) => {
          const isChecked = checkedIds.has(item.id);
          return (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-3 rounded-2xl border transition-all cursor-pointer select-none flex items-start gap-3 ${
                isChecked
                  ? "bg-emerald-50/70 border-emerald-200/90 text-emerald-950"
                  : "bg-white hover:bg-slate-50/80 border-slate-200/90 text-slate-800"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                  isChecked
                    ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                    : "bg-white border-slate-300 text-transparent hover:border-indigo-400"
                }`}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </div>
              <span
                className={`text-xs sm:text-sm leading-relaxed ${
                  isChecked ? "line-through text-slate-600 font-normal" : "font-semibold text-slate-800"
                }`}
              >
                {item.text}
              </span>
            </div>
          );
        })}
      </div>

      {/* Completion Celebration Banner */}
      {isAllCompleted && (
        <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-emerald-100/90 via-teal-100/70 to-emerald-50 border border-emerald-300 flex items-center gap-2.5 text-xs text-emerald-900 font-extrabold animate-in fade-in slide-in-from-top-2 duration-300">
          <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>מעולה! השלמת את כל הבדיקות החשובות – החבילה שלך מוכנה להזמנה בטוחה!</span>
        </div>
      )}
    </div>
  );
}
