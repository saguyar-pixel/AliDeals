import Link from "next/link";
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  TrendingUp,
  Settings,
  ExternalLink,
  ShoppingBag,
  Bot,
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.length > 5);
  const hasAliKey = Boolean(process.env.ALIEXPRESS_APP_KEY && process.env.ALIEXPRESS_APP_SECRET);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900" dir="rtl">
      {/* Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 p-4 border-l border-slate-800">
        <div className="space-y-6">
          {/* Logo */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <Link href="/admin" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-ali-600 flex items-center justify-center text-white font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-white text-base leading-none">AliDeals</span>
                <span className="text-[10px] text-ali-400 font-bold uppercase tracking-wider mt-0.5">CMS Studio</span>
              </div>
            </Link>
            <Link
              href="/"
              target="_blank"
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
              title="צפה באתר הציבורי"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* Nav Links */}
          <nav className="space-y-1 text-sm font-medium">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-slate-400" />
              <span>דשבורד ראשי</span>
            </Link>

            {/* Agent Team Command Center */}
            <Link
              href="/admin/agent-team"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 transition-colors font-bold border border-indigo-500/30"
            >
              <Bot className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span>חמ&quot;ל צוות סוכנים (AI)</span>
            </Link>

            <Link
              href="/admin/ingest"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-ali-600/15 text-ali-400 hover:bg-ali-600/25 transition-colors font-semibold"
            >
              <PlusCircle className="w-4 h-4 text-ali-500" />
              <span>הזנת מוצר ידנית</span>
            </Link>

            <Link
              href="/admin/pages"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>ניהול עמודים</span>
            </Link>

            <Link
              href="/admin/arbitrage"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>ארביטראז&apos; ו-SubIDs</span>
            </Link>

            <Link
              href="/admin/settings"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4 text-slate-400" />
              <span>הגדרות API ומפתחות</span>
            </Link>
          </nav>
        </div>

        {/* Integration Status Badges */}
        <div className="pt-4 border-t border-slate-800 space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>חיבור Gemini AI:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                hasGeminiKey ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-amber-950 text-amber-400 border border-amber-800"
              }`}
            >
              {hasGeminiKey ? "Free Tier מוגן" : "מצב סקריפט"}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span>חיבור AliExpress API:</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                hasAliKey ? "bg-emerald-950 text-emerald-400 border border-emerald-800" : "bg-slate-800 text-slate-400"
              }`}
            >
              {hasAliKey ? "מחובר" : "סקרייפר פעיל"}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-6 sm:p-10 overflow-y-auto">{children}</main>
    </div>
  );
}
