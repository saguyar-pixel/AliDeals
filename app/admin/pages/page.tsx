"use client";

import { useState, useEffect, useMemo } from "react";
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
  Flame,
  BookOpen,
  FolderTree,
  Eye,
  Filter,
  CheckSquare,
  Square,
  Sparkles,
  AlertTriangle,
  ArrowUpDown,
  RefreshCw,
} from "lucide-react";

interface PageRecord {
  id: string;
  slug: string;
  type: string; // 'review' | 'top5' | 'deal' | 'guide' | 'category'
  title: string;
  metaTitle?: string;
  metaDescription?: string;
  targetCategory?: string;
  tags?: string[];
  updatedAt: string;
  productIds?: string;
  viewsCount?: number;
  status?: string;
}

export default function AdminPagesList() {
  const [pages, setPages] = useState<PageRecord[]>([]);
  const [filterType, setFilterType] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date-desc" | "date-asc" | "views-desc" | "title-asc">("date-desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

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

  // Compute unique categories
  const categoriesList = useMemo(() => {
    const cats = new Set<string>();
    pages.forEach((p) => {
      if (p.targetCategory) cats.add(p.targetCategory);
    });
    return Array.from(cats).sort();
  }, [pages]);

  // Counts by type
  const counts = useMemo(() => {
    return {
      all: pages.length,
      top5: pages.filter((p) => p.type === "top5").length,
      review: pages.filter((p) => p.type === "review").length,
      deal: pages.filter((p) => p.type === "deal").length,
      guide: pages.filter((p) => p.type === "guide" || p.type === "category").length,
    };
  }, [pages]);

  const getPageRoute = (page: PageRecord): string => {
    switch (page.type) {
      case "top5":
        return `/top5/${page.slug}`;
      case "deal":
        return `/deals/${page.slug}`;
      case "category":
        return `/categories/${page.slug}`;
      case "review":
      default:
        return `/reviews/${page.slug}`;
    }
  };

  const getProductCount = (productIds?: string): number => {
    if (!productIds) return 0;
    try {
      const arr = JSON.parse(productIds);
      return Array.isArray(arr) ? arr.length : 0;
    } catch {
      return 0;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "top5":
        return "מדריך השוואת TOP 5";
      case "deal":
        return "דיל בזק ומבצע";
      case "category":
        return "עמוד קטגוריה";
      case "guide":
        return "מדריך קנייה";
      case "review":
      default:
        return "סקירת מוצר";
    }
  };

  // Single Delete
  const handleDelete = async (page: PageRecord) => {
    const typeLabel = getTypeLabel(page.type);
    const confirmMessage = `האם אתה בטוח שברצונך למחוק לצמיתות את ${typeLabel}:\n\n"${page.title}"?\n\nפעולה זו תמחק את העמוד ממסד הנתונים (Supabase ו-JSON), תנקה את כל המוצרים המקושרים אליו, ותבצע Revalidation באתר החי.`;

    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const res = await fetch(
        `/api/pages/delete?id=${encodeURIComponent(page.id)}&slug=${encodeURIComponent(page.slug)}`,
        { method: "DELETE" }
      );
      const data = await res.json();

      if (res.ok && data.success) {
        setPages((prev) => prev.filter((p) => p.id !== page.id && p.slug !== page.slug));
        setSelectedIds((prev) => prev.filter((id) => id !== page.id));
        setActionNotice(`העמוד "${page.title}" נמחק בהצלחה לצמיתות!`);
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        alert(data.error || "שגיאה במחיקת העמוד");
      }
    } catch {
      alert("שגיאת תקשורת עם השרת במחיקת העמוד");
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Delete
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;

    const confirmMessage = `האם אתה בטוח שברצונך למחוק לצמיתות ${selectedIds.length} עמודים שנבחרו?\n\nפעולה זו תסיר את כל העמודים הנבחרים, תנקה את מסד הנתונים והמטמון. לא ניתן לשחזר פעולה זו.`;

    if (!confirm(confirmMessage)) return;

    setIsDeleting(true);
    try {
      const res = await fetch("/api/pages/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setPages((prev) => prev.filter((p) => !selectedIds.includes(p.id)));
        setActionNotice(`נמחקו בהצלחה ${selectedIds.length} עמודים!`);
        setSelectedIds([]);
        setTimeout(() => setActionNotice(null), 4000);
      } else {
        alert(data.error || "שגיאה במחיקה מרוכזת");
      }
    } catch {
      alert("שגיאת תקשורת עם השרת במחיקה מרוכזת");
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle selection
  const toggleSelectPage = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Filter & Sort
  const filteredPages = useMemo(() => {
    return pages
      .filter((p) => {
        // Type filter
        if (filterType !== "all") {
          if (filterType === "other") {
            if (p.type === "review" || p.type === "top5" || p.type === "deal") return false;
          } else if (p.type !== filterType) {
            return false;
          }
        }

        // Category filter
        if (selectedCategory !== "all" && p.targetCategory !== selectedCategory) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = (p.title || "").toLowerCase().includes(q);
          const matchSlug = (p.slug || "").toLowerCase().includes(q);
          const matchCat = (p.targetCategory || "").toLowerCase().includes(q);
          const matchTags = (p.tags || []).some((t) => t.toLowerCase().includes(q));
          return matchTitle || matchSlug || matchCat || matchTags;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "date-desc") {
          return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
        }
        if (sortBy === "date-asc") {
          return new Date(a.updatedAt || 0).getTime() - new Date(b.updatedAt || 0).getTime();
        }
        if (sortBy === "views-desc") {
          return (b.viewsCount || 0) - (a.viewsCount || 0);
        }
        if (sortBy === "title-asc") {
          return a.title.localeCompare(b.title, "he");
        }
        return 0;
      });
  }, [pages, filterType, selectedCategory, searchQuery, sortBy]);

  const isAllFilteredSelected =
    filteredPages.length > 0 && filteredPages.every((p) => selectedIds.includes(p.id));

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      const filteredIds = new Set(filteredPages.map((p) => p.id));
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.has(id)));
    } else {
      const allFilteredIds = filteredPages.map((p) => p.id);
      setSelectedIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              ניהול ושליטה בכל עמודי האתר
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-900 text-white">
              {pages.length} עמודים
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            שליטה מלאה על כל סוגי העמודים: ערוך, סנן, בדוק קישורים חיים ומחק לצמיתות מדריכי TOP 5, דילים וסקירות.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/ingest?type=top5"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>+ השוואת TOP 5</span>
          </Link>
          <Link
            href="/admin/ingest?type=review"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-md shadow-ali-600/20 transition-all"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>+ סקירת מוצר</span>
          </Link>
          <Link
            href="/admin/ingest?type=deal"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>+ דיל בזק</span>
          </Link>
          <Link
            href="/admin/find-replace"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow transition-all"
          >
            <span>Find & Replace</span>
          </Link>
        </div>
      </div>

      {/* Success / Action Notification Banner */}
      {actionNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs underline"
          >
            סגור
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {/* All Pages */}
        <button
          onClick={() => setFilterType("all")}
          className={`text-right p-4 rounded-2xl border transition-all ${
            filterType === "all"
              ? "bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-900/10"
              : "bg-white text-slate-800 border-slate-200 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-80">כל העמודים</span>
            <FileText className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-black mt-2">{counts.all}</div>
          <p className="text-[10px] opacity-70 mt-1">אינדקס תוכן מלא</p>
        </button>

        {/* TOP 5 Comparisons */}
        <button
          onClick={() => setFilterType("top5")}
          className={`text-right p-4 rounded-2xl border transition-all ${
            filterType === "top5"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20"
              : "bg-white text-slate-800 border-slate-200 hover:border-indigo-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-80">השוואות TOP 5</span>
            <Layers className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-black mt-2">{counts.top5}</div>
          <p className="text-[10px] opacity-70 mt-1">מדריכי השוואה עשירים</p>
        </button>

        {/* Single Reviews */}
        <button
          onClick={() => setFilterType("review")}
          className={`text-right p-4 rounded-2xl border transition-all ${
            filterType === "review"
              ? "bg-ali-600 text-white border-ali-600 shadow-lg shadow-ali-600/20"
              : "bg-white text-slate-800 border-slate-200 hover:border-ali-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-80">סקירות מוצרים</span>
            <Sparkles className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-black mt-2">{counts.review}</div>
          <p className="text-[10px] opacity-70 mt-1">סקירות מעמיקות למוצר בודד</p>
        </button>

        {/* Deals & Alerts */}
        <button
          onClick={() => setFilterType("deal")}
          className={`text-right p-4 rounded-2xl border transition-all ${
            filterType === "deal"
              ? "bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-600/20"
              : "bg-white text-slate-800 border-slate-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold opacity-80">דילי בזק</span>
            <Flame className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-2xl font-black mt-2">{counts.deal}</div>
          <p className="text-[10px] opacity-70 mt-1">מבצעים מהירים מוגבלים בזמן</p>
        </button>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חיפוש חופשי לפי כותרת עמוד, כתובת URL (slug), קטגוריה או תגית..."
              className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                נקה
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="all">כל הקטגוריות ({categoriesList.length})</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="date-desc">תאריך עדכון (חדש לישן)</option>
              <option value="date-asc">תאריך עדכון (ישן לחדש)</option>
              <option value="views-desc">הכי נצפה באתר</option>
              <option value="title-asc">כותרת עמוד (א-ב)</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchPages}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 transition-all disabled:opacity-50"
            title="רענן רשימת עמודים"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>

        {/* Filter Type Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-xs">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterType === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:text-slate-900"
            }`}
          >
            הכל ({counts.all})
          </button>
          <button
            onClick={() => setFilterType("top5")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filterType === "top5"
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>מדריכי TOP 5 ({counts.top5})</span>
          </button>
          <button
            onClick={() => setFilterType("review")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filterType === "review"
                ? "bg-ali-600 text-white shadow-sm"
                : "bg-ali-50 text-ali-700 hover:bg-ali-100"
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>סקירות מוצרים ({counts.review})</span>
          </button>
          <button
            onClick={() => setFilterType("deal")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
              filterType === "deal"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            <Flame className="w-3 h-3" />
            <span>דילי בזק ({counts.deal})</span>
          </button>
          <button
            onClick={() => setFilterType("other")}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
              filterType === "other"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            מדריכים וקטגוריות ({counts.guide})
          </button>
        </div>
      </div>

      {/* Floating / Sticky Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-4 z-20 bg-slate-900 text-white p-3.5 rounded-2xl shadow-xl border border-slate-700 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-black">
              {selectedIds.length}
            </span>
            <span className="text-xs font-bold">
              עמודים נבחרו לפעולה מרוכזת
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 rounded-xl text-slate-300 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-all"
            >
              בטל בחירה
            </button>
            <button
              onClick={handleBatchDelete}
              disabled={isDeleting}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isDeleting ? "מוחק..." : `מחק ${selectedIds.length} עמודים לצמיתות`}</span>
            </button>
          </div>
        </div>
      )}

      {/* Pages Table */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400">
            <FileText className="w-10 h-10 animate-pulse mx-auto mb-3 text-indigo-500" />
            <p className="text-sm font-bold text-slate-600">טוען את כל עמודי האתר...</p>
            <p className="text-xs text-slate-400 mt-1">בודק התאמה מול Supabase ומערכת התוכן</p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <AlertTriangle className="w-8 h-8 mx-auto text-amber-500 opacity-80" />
            <p className="text-sm font-bold text-slate-700">לא נמצאו עמודים התואמים לסינון הנוכחי</p>
            <p className="text-xs text-slate-400">
              נסה לשנות את מונח החיפוש או לבחור בלשונית "הכל"
            </p>
            <button
              onClick={() => {
                setFilterType("all");
                setSearchQuery("");
                setSelectedCategory("all");
              }}
              className="mt-3 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all"
            >
              איפוס כל המסננים
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3.5 px-4 w-10 text-center">
                    <button
                      onClick={toggleSelectAllFiltered}
                      className="text-slate-400 hover:text-slate-700 transition-colors"
                      title={isAllFilteredSelected ? "בטל סימון הכל" : "בחר את כל העמודים המוצגים"}
                    >
                      {isAllFilteredSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th className="py-3.5 px-4">סוג עמוד</th>
                  <th className="py-3.5 px-4">כותרת וכתובת URL</th>
                  <th className="py-3.5 px-4">קטגוריה ותגיות</th>
                  <th className="py-3.5 px-4 text-center">צפיות ועדכון</th>
                  <th className="py-3.5 px-4 text-center">פעולות ניהול ומחיקה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPages.map((page) => {
                  const isSelected = selectedIds.includes(page.id);
                  const publicUrl = getPageRoute(page);
                  const prodCount = getProductCount(page.productIds);

                  return (
                    <tr
                      key={page.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isSelected ? "bg-indigo-50/40" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => toggleSelectPage(page.id)}
                          className="text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-indigo-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          {page.type === "top5" && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Layers className="w-3 h-3 text-indigo-600" />
                                <span>השוואת TOP 5</span>
                              </span>
                              <span className="text-[10px] font-semibold text-indigo-500">
                                כולל {prodCount > 0 ? prodCount : 5} מוצרים
                              </span>
                            </>
                          )}

                          {page.type === "review" && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-ali-50 text-ali-700 border border-ali-200">
                                <Sparkles className="w-3 h-3 text-ali-600" />
                                <span>סקירת מוצר</span>
                              </span>
                              <span className="text-[10px] font-semibold text-slate-400">
                                מוצר בודד
                              </span>
                            </>
                          )}

                          {page.type === "deal" && (
                            <>
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                                <Flame className="w-3 h-3 text-rose-600" />
                                <span>דיל בזק</span>
                              </span>
                              <span className="text-[10px] font-semibold text-rose-500">
                                מבצע מיוחד
                              </span>
                            </>
                          )}

                          {page.type === "guide" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <BookOpen className="w-3 h-3 text-emerald-600" />
                              <span>מדריך קנייה</span>
                            </span>
                          )}

                          {page.type === "category" && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-sky-50 text-sky-700 border border-sky-200">
                              <FolderTree className="w-3 h-3 text-sky-600" />
                              <span>עמוד קטגוריה</span>
                            </span>
                          )}

                          {!["top5", "review", "deal", "guide", "category"].includes(page.type) && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-bold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                              <span>{page.type}</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Title & Slug */}
                      <td className="py-3.5 px-4 max-w-md">
                        <Link
                          href={`/admin/pages/edit/${page.id}`}
                          className="font-bold text-slate-900 hover:text-indigo-600 transition-colors line-clamp-1 text-xs"
                          title={page.title}
                        >
                          {page.title}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-400 font-mono">
                          <span className="truncate max-w-xs">{page.slug}</span>
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-indigo-600"
                            title="פתח כתובת זו באתר החי"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </td>

                      {/* Category & Tags */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                            {page.targetCategory || "כללי"}
                          </span>
                          {page.tags && page.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {page.tags.slice(0, 2).map((t, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] text-slate-400 font-mono"
                                >
                                  #{t}
                                </span>
                              ))}
                              {page.tags.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{page.tags.length - 2}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date & Views */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1 text-slate-500 font-mono text-[11px]">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {page.updatedAt
                                ? new Date(page.updatedAt).toLocaleDateString("he-IL")
                                : "-"}
                            </span>
                          </div>
                          {typeof page.viewsCount === "number" && (
                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                              <Eye className="w-2.5 h-2.5" />
                              <span>{page.viewsCount.toLocaleString()} צפיות</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
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
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-ali-600 hover:bg-ali-50 transition-all font-semibold flex items-center gap-1"
                            title={`צפה באתר החי (${publicUrl})`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span className="text-[11px]">צפה</span>
                          </a>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(page)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all font-semibold flex items-center gap-1 disabled:opacity-50"
                            title={`מחק את עמוד ה-${page.type} לצמיתות`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                            <span className="text-[11px] text-rose-600 font-bold">מחק</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

