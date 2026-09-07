import { CheckCircle2, XCircle } from "lucide-react";

interface ProsConsBoxProps {
  pros: string[];
  cons: string[];
}

export default function ProsConsBox({ pros, cons }: ProsConsBoxProps) {
  return (
    <div className="my-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Pros Card */}
      <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-emerald-200/60">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-base text-emerald-950">יתרונות מרכזיים</h3>
        </div>
        <ul className="space-y-3">
          {pros.map((pro, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-emerald-900 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
              <span>{pro}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Cons Card */}
      <div className="rounded-2xl bg-rose-50/70 border border-rose-200/80 p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-rose-200/60">
          <XCircle className="w-5 h-5 text-rose-600" />
          <h3 className="font-bold text-base text-rose-950">נקודות לשיפור וחסרונות</h3>
        </div>
        <ul className="space-y-3">
          {cons.map((con, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm text-rose-900 leading-snug">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
              <span>{con}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
