import Link from "next/link";
import { jsonDb } from "@/lib/db";
import {
  FileText,
  Package,
  PlusCircle,
  ExternalLink,
  Github,
  Globe,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

export default function AdminDashboardPage() {
  const pages = jsonDb.getPages();
  const products = jsonDb.getProducts();

  const reviewsCount = pages.filter((p) => p.type === "review").length;
  const top5Count = pages.filter((p) => p.type === "top5").length;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">CMS Studio מקומי</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">לוח בקרה וניהול תוכן</h1>
          <p className="text-sm text-slate-500 mt-1">
            תשתית אירוח סטטית חינמית ב-GitHub Pages עם אוטומציית Gemini ודומיין מותאם.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/ingest"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-sm shadow-md shadow-ali-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>הזנת מוצר חדש ב-AI</span>
          </Link>
        </div>
      </div>

      {/* GitHub Infrastructure Status Card */}
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 shadow-lg border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Github className="w-5 h-5 text-white" />
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              GitHub Pages + GitHub Actions (100% חינמי לתמיד)
            </span>
          </div>
          <h3 className="text-lg sm:text-xl font-bold">האתר מוגדר לפריסה אוטומטית בענן</h3>
          <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
            כל עמוד חדש שנשמר ב-CMS נכתב ישירות לקובצי ה-JSON במאגר. בלחיצת Git Push, עולה Workflow ב-GitHub Actions
            שבונה ומפרסם את האתר תוך כ-40 שניות ישירות לדומיין שלך עם 100/100 בביצועי טעינה!
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 shrink-0">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-medium text-slate-200">
            <Globe className="w-4 h-4 text-ali-400" />
            <span>דומיין: alideals.co.il</span>
          </div>
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-800 text-xs font-medium text-emerald-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>עלות שרתים: 0 ₪</span>
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">סך עמודי תוכן</span>
            <FileText className="w-4 h-4 text-ali-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{pages.length}</div>
          <div className="text-[11px] text-slate-400">עמודי סקירה, TOP 5 ודילים</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">סקירות מוצר עמוקות</span>
            <Package className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{reviewsCount}</div>
          <div className="text-[11px] text-indigo-600 font-semibold">מותאמות ל-GEO ו-AI Search</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">טבלאות השוואת TOP 5</span>
            <TrendingUp className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-slate-900">{top5Count}</div>
          <div className="text-[11px] text-slate-400">השוואות קטגוריה מדורגות</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">מוצרים במאגר</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-slate-900">{products.length}</div>
          <div className="text-[11px] text-slate-400">נשמרו מסקרייפר ו-API</div>
        </div>
      </div>

      {/* Recent Pages Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900">עמודי תוכן שפורסמו לאחרונה</h3>
          <Link href="/admin/pages" className="text-xs font-semibold text-ali-600 hover:underline">
            צפה בכל העמודים
          </Link>
        </div>

        <div className="divide-y divide-slate-100 text-sm">
          {pages.slice(0, 5).map((p) => (
            <div key={p.id} className="py-3 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                    {p.type === "top5" ? "TOP 5" : "סקירה"}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(p.updatedAt).toLocaleDateString("he-IL")}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 truncate max-w-md">{p.title}</h4>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <Link
                  href={`/${p.type === "top5" ? "top5" : "reviews"}/${p.slug}`}
                  target="_blank"
                  className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-ali-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  <span>צפה בעמוד</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
