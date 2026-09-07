import Link from "next/link";
import { jsonDb } from "@/lib/db";
import { PlusCircle, ExternalLink, Calendar } from "lucide-react";

export default function AdminPagesList() {
  const allPages = jsonDb.getPages();

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900">ניהול עמודי תוכן</h1>
          <p className="text-xs text-slate-500 mt-1">צפייה וניהול של כל עמודי הסקירה וטבלאות ה-TOP 5 שנשמרו במאגר.</p>
        </div>
        <Link
          href="/admin/ingest"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          <span>עמוד חדש</span>
        </Link>
      </div>

      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-right border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase">
              <th className="py-3 px-4">סוג</th>
              <th className="py-3 px-4">כותרת העמוד</th>
              <th className="py-3 px-4">קטגוריה</th>
              <th className="py-3 px-4">תאריך</th>
              <th className="py-3 px-4 text-center">פעולות</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {allPages.map((page) => {
              const route = page.type === "top5" ? "top5" : "reviews";
              return (
                <tr key={page.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                        page.type === "top5"
                          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                          : "bg-ali-50 text-ali-600 border border-ali-200"
                      }`}
                    >
                      {page.type === "top5" ? "TOP 5" : "סקירה"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900 max-w-sm truncate">
                    {page.title}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-medium">
                    {page.targetCategory || "כללי"}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{new Date(page.updatedAt).toLocaleDateString("he-IL")}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Link
                      href={`/${route}/${page.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1 text-slate-600 hover:text-ali-600 font-semibold bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <span>צפה באתר</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
