"use client";

import { useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

interface FaqAccordionProps {
  title?: string;
  items: FaqItem[];
}

export default function FaqAccordion({
  title = "שאלות נפוצות ותשובות לקונים בישראל",
  items,
}: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0); // First item open by default

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
        <HelpCircle className="w-5 h-5 text-ali-600" />
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
      </div>

      <div className="space-y-3">
        {items.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all overflow-hidden ${
                isOpen ? "border-ali-200 bg-ali-50/20" : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-50"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full py-4 px-5 flex items-center justify-between gap-4 text-right cursor-pointer"
                aria-expanded={isOpen}
              >
                <span className="font-bold text-slate-900 text-sm sm:text-base leading-snug">
                  {item.question}
                </span>
                <span
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                    isOpen ? "bg-ali-100 text-ali-600 rotate-180" : "bg-white border border-slate-200 text-slate-400"
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs sm:text-sm text-slate-600 leading-relaxed border-t border-slate-100 animate-in fade-in-50 duration-150">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
