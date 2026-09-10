"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  PlusCircle,
  ExternalLink,
  Calendar,
  Edit,
  Trash2,
  FileText,
  Layers,
  Search,
  Check,
} from "lucide-react";

interface PageRecord {
  id: string;
  slug: string;
  type: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  targetCategory?: string;
  updatedAt: string;
  productIds?: string;
}

export default function AdminPagesList() {
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [filterType, setFilterType] = useState<"all" | "review" | "top5">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const fetchPages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/pages");
      const data = await res.json();
      if (data.pages) setPages(data.pages);
    } catch (e) {
      console.error("Failed to load pages", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את העמוד "${title}" לצמיתות?`)) return;

    try {
      const res = await fetch(`/api/pages/delete?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setPages(pages.filter((p) => p.id !== id));
      } else {
        alert("שגיאה במחיקת העמוד");
      }
    } catch {
      alert("שגיאת תקשורת עם השרת");
    }
  };

  const filtered = pages.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.title.toLowerCase().includes(q) ||
        p.slug.toLowerCase().includes(q) ||
        (p.targetCategory || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">ניהול ועריכת עמודי תוכן</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ערוך רטרואקטיבית כל עמוד, מחק סקירות ישנות, או צפה בעמודים החיים ברשת.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/find-replace"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition-all"
          >
            <span>Find & Replace גלובלי</span>
          </Link>
          <Link
            href="/admin/ingest"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-md shadow-ali-600/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>הזן עמוד חדש</span>
          </Link>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-stretch sm:items-center bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש לפי כותרת, מילת מפתח או קטגוריה..."
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterType === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            הכל ({pages.length})
          </button>
          <button
            onClick={() => setFilterType("review")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterType === "review" ? "bg-white text-ali-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            סקירות בודדות ({pages.filter((p) => p.type === "review").length})
          </button>
          <button
            onClick={() => setFilterType("top5")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              filterType === "top5" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            השוואות TOP 5 ({pages.filter((p) => p.type === "top5").length})
          </button>
        </div>
      </div>

      {/* Pages Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <FileText className="w-8 h-8 animate-pulse mx-auto mb-2 text-indigo-500" />
            <p className="text-xs font-bold">טוען עמודים...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            לא נמצאו עמודים התואמים לחיפוש
          </div>
        ) : (
          <table className="w-full text-right border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase">
                <th className="py-3 px-4">סוג</th>
                <th className="py-3 px-4">כותרת העמוד</th>
                <th className="py-3 px-4">קטגוריה</th>
                <th className="py-3 px-4">תאריך עדכון</th>
                <th className="py-3 px-4 text-center">פעולות ועריכה</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((page) => {
                const route = page.type === "top5" ? "top5" : "reviews";
                return (
                  <tr key={page.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          page.type === "top5"
                            ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                            : "bg-ali-50 text-ali-600 border border-ali-200"
                        }`}
                      >
                        {page.type === "top5" ? "TOP 5" : "סקירה"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900 max-w-sm truncate">
                      <Link
                        href={`/admin/pages/edit/${page.id}`}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {page.title}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {page.targetCategory || "כללי"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(page.updatedAt).toLocaleDateString("he-IL")}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Button */}
                        <Link
                          href={`/admin/pages/edit/${page.id}`}
                          className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-semibold flex items-center gap-1"
                          title="ערוך עמוד רטרואקטיבית"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span className="text-[11px]">ערוך</span>
                        </Link>

                        {/* View Live Page */}
                        <Link
                          href={`/${route}/${page.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-slate-600 hover:text-ali-600 hover:bg-ali-50 transition-all font-semibold flex items-center gap-1"
                          title="צפה באתר החי"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span className="text-[11px]">צפה</span>
                        </Link>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(page.id, page.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all font-semibold flex items-center gap-1"
                          title="מחק עמוד לצמיתות"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
