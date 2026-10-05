import { supabaseDb } from "@/lib/db";
import { CodeSnippetManager } from "@/components/admin/CodeSnippetManager";
import Link from "next/link";
import { ArrowLeft, Settings, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ניהול מקטעי קוד, פיקסלים ו-GTM | AliDeals CMS",
  description: "מערכת ניהול מקטעי קוד דינאמיים, פיקסל פייסבוק, GTM ויומן שינויים sitewide",
};

export default async function AdminCodeSnippetsPage() {
  const [snippets, logs] = await Promise.all([
    supabaseDb.getCodeSnippets(),
    supabaseDb.getCodeSnippetLogs(100),
  ]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24" dir="rtl">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-bold">
          <Link href="/admin" className="hover:text-indigo-600 transition-colors">
            ניהול ראשי
          </Link>
          <span>/</span>
          <Link href="/admin/settings" className="hover:text-indigo-600 transition-colors">
            הגדרות
          </Link>
          <span>/</span>
          <span className="text-slate-900">קודי מעקב ופיקסלים</span>
        </div>

        <Link
          href="/admin/settings"
          className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>חזרה להגדרות כלליות</span>
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Code Snippet Manager Component */}
      <CodeSnippetManager initialSnippets={snippets} initialLogs={logs} />
    </div>
  );
}
