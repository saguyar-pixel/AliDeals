"use client";

import { useState } from "react";
import { Sparkles, Maximize2, Minimize2 } from "lucide-react";

interface InfographicViewerProps {
  svgContent: string;
  title?: string;
}

export default function InfographicViewer({
  svgContent,
  title = "אינפוגרפיקת מפרט ושימושיות בלעדית",
}: InfographicViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!svgContent) return null;

  return (
    <div className="my-10 rounded-2xl border border-slate-200 bg-slate-950 p-4 sm:p-6 shadow-xl overflow-hidden relative">
      <div className="flex items-center justify-between gap-4 mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-ali-500/20 text-ali-400">
            <Sparkles className="w-4 h-4" />
          </span>
          <h3 className="text-sm sm:text-base font-bold text-white">{title}</h3>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
        >
          {isExpanded ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span>תצוגה רגילה</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span>הרחב תצוגה</span>
            </>
          )}
        </button>
      </div>

      <div
        className={`w-full transition-all duration-300 rounded-xl overflow-hidden ${
          isExpanded ? "max-h-[1000px]" : "max-h-[500px]"
        }`}
        dangerouslySetInnerHTML={{ __html: svgContent }}
      />
    </div>
  );
}
