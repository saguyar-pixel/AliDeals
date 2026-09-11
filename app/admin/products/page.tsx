"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Package,
  Search,
  ExternalLink,
  Edit,
  Trash2,
  Copy,
  Check,
  Plus,
  Sparkles,
  Layers,
  Store,
  Star,
  ShoppingBag,
  Filter,
  ArrowRight,
  AlertTriangle,
  FolderTree,
  Tag,
  X,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  Loader2,
  DollarSign,
  Link2,
} from "lucide-react";
import { CustomsBadge } from "@/components/admin/CustomsBadge";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";

interface ProductItem {
  id: string;
  aliId: string;
  originalTitle: string;
  titleHe?: string;
  descriptionHe?: string;
  metaTitle?: string;
  metaDescription?: string;
  category?: string;
  tags?: string[];
  priceUsd: number;
  priceIls: number;
  rating?: number;
  ordersCount?: number;
  storeName?: string;
  sellerPositiveRate?: string;
  mainImage: string;
  aliUrl: string;
  affiliateUrl?: string;
  usedInPages?: Array<{ id: string; title: string; slug: string; type: string }>;
}

interface CategoryItem {
  id: string;
  nameHe: string;
  slug: string;
  icon?: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [customsFilter, setCustomsFilter] = useState<"all" | "safe" | "buffer" | "taxable">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCheckingLinks, setIsCheckingLinks] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [linkCheckReport, setLinkCheckReport] = useState<{
    totalChecked: number;
    brokenCount: number;
    results: Array<{
      productId: string;
      aliId: string;
      title: string;
      url: string;
      status: string;
      error?: string;
    }>;
  } | null>(null);

  // Add Product Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addMode, setAddMode] = useState<"auto" | "manual">("auto");
  const [autoInput, setAutoInput] = useState("");
  const [autoCategory, setAutoCategory] = useState("אלקטרוניקה וגאדג'טים");
  const [isFetchingAuto, setIsFetchingAuto] = useState(false);
  const [autoError, setAutoError] = useState<string | null>(null);
  const [autoFetchedPreview, setAutoFetchedPreview] = useState<any | null>(null);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    aliId: "",
    titleHe: "",
    originalTitle: "",
    priceUsd: 25,
    priceIls: 91,
    category: "אלקטרוניקה וגאדג'טים",
    mainImage: "",
    aliUrl: "",
    affiliateUrl: "",
    descriptionHe: "",
  });

  const handleCheckLinks = async () => {
    setIsCheckingLinks(true);
    try {
      const res = await fetch("/api/admin/check-links", {
        method: "POST",
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.results) {
        setLinkCheckReport(data);
      }
    } catch (e) {
      console.error("Failed to check links", e);
      alert("שגיאה בבדיקת תקינות הקישורים");
    } finally {
      setIsCheckingLinks(false);
    }
  };

  // Auto-fetch product via /api/ingest
  const handleAutoFetch = async () => {
    const clean = autoInput.trim();
    if (!clean) {
      setAutoError("נא להזין קישור למוצר או מזהה מוצר");
      return;
    }

    setIsFetchingAuto(true);
    setAutoError(null);
    setAutoFetchedPreview(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ urlOrId: clean, category: autoCategory }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה במשיכת נתוני המוצר מאלי אקספרס");
      }
      if (data.product) {
        setAutoFetchedPreview(data.product);
      }
    } catch (err: any) {
      setAutoError(err?.message || "שגיאה בלתי צפויה בשליפה מאלי אקספרס");
    } finally {
      setIsFetchingAuto(false);
    }
  };

  // Confirm and Save fetched product to catalog
  const handleConfirmSaveAuto = async () => {
    if (!autoFetchedPreview) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          ...autoFetchedPreview,
          category: autoCategory || autoFetchedPreview.category,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בשמירת המוצר לקטלוג");
      }
      await fetchProducts();
      setIsAddModalOpen(false);
      setAutoInput("");
      setAutoFetchedPreview(null);
      setSaveToast(`המוצר "${autoFetchedPreview.titleHe || autoFetchedPreview.originalTitle}" נוסף בהצלחה למאגר המוצרים!`);
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err: any) {
      alert(err.message || "שגיאה בשמירת המוצר למאגר");
    } finally {
      setIsSaving(false);
    }
  };

  // Save manual product to catalog
  const handleSaveManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.titleHe && !manualForm.originalTitle) {
      alert("נא להזין כותרת למוצר");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify(manualForm),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בשמירת המוצר");
      }
      await fetchProducts();
      setIsAddModalOpen(false);
      setManualForm({
        aliId: "",
        titleHe: "",
        originalTitle: "",
        priceUsd: 25,
        priceIls: 91,
        category: "אלקטרוניקה וגאדג'טים",
        mainImage: "",
        aliUrl: "",
        affiliateUrl: "",
        descriptionHe: "",
      });
      setSaveToast("המוצר נשמר בהצלחה במאגר המוצרים המרכזי!");
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err: any) {
      alert(err.message || "שגיאה בשמירת המוצר");
    } finally {
      setIsSaving(false);
    }
  };

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/products", { headers: getAdminHeaders() });
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (e) {
      console.error("Failed to load products", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", { headers: getAdminHeaders() });
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
      if (data.allTags) setAllTags(data.allTags);
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המוצר "${name}"?`)) return;
    try {
      await fetch(`/api/products?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      setProducts(products.filter((p) => p.id !== id));
      setSelectedIds(selectedIds.filter((selId) => selId !== id));
    } catch (e) {
      alert("שגיאה במחיקת המוצר");
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSaving(true);
    try {
      await fetch("/api/products", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify(editingProduct),
      });
      await fetchProducts();
      setEditingProduct(null);
    } catch (e) {
      alert("שגיאה בעדכון המוצר");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      if (selectedIds.length >= 10) {
        alert("ניתן לבחור עד 10 מוצרים להשוואת TOP N");
        return;
      }
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Filtered Products
  const filtered = products.filter((p) => {
    const matchesSearch =
      (p.titleHe || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.originalTitle || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.aliId.includes(searchQuery);

    if (!matchesSearch) return false;

    if (selectedCategory !== "all") {
      if (p.category !== selectedCategory) return false;
    }

    if (customsFilter === "safe") return p.priceUsd <= 73.0;
    if (customsFilter === "buffer") return p.priceUsd > 73.0 && p.priceUsd <= 75.0;
    if (customsFilter === "taxable") return p.priceUsd > 75.0;

    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24" dir="rtl">
      {/* Toast Notification */}
      {saveToast && (
        <div className="p-4 rounded-2xl bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center justify-between shadow-lg shadow-emerald-500/20 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{saveToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="text-white/80 hover:text-white font-black text-sm px-2 py-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              ארכיטקטורה מוכוונת-מוצר (Product-Centric)
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            מאגר מוצרים מרכזי
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            כל מוצר מנוהל כרשומה עצמאית. עדכון קישור שותפים או מחיר כאן מתעדכן אוטומטית בכל עמודי האתר!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              setAutoInput("");
              setAutoError(null);
              setAutoFetchedPreview(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-xs shadow-md shadow-orange-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ הוסף מוצר חדש לקטלוג</span>
          </button>

          <button
            type="button"
            onClick={handleCheckLinks}
            disabled={isCheckingLinks}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs shadow-xs transition-all disabled:opacity-50"
          >
            {isCheckingLinks ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
            ) : (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            )}
            <span>{isCheckingLinks ? "סורק קישורים..." : "בדיקת תקינות לינקים"}</span>
          </button>
          <Link
            href="/admin/bulk-ingest"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
          >
            <Layers className="w-4 h-4" />
            <span>הזנת קישורים מרובה</span>
          </Link>
          <Link
            href="/admin/ingest"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-md shadow-ali-600/20 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>חיפוש ב-AliExpress API</span>
          </Link>
        </div>
      </div>

      {/* Dead-Link Report Banner if scanned */}
      {linkCheckReport && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-3 ${
            linkCheckReport.brokenCount > 0
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-emerald-50 border-emerald-200 text-emerald-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              {linkCheckReport.brokenCount > 0 ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>
                    אותרו {linkCheckReport.brokenCount} קישורים הדורשים עדכון מתוך {linkCheckReport.totalChecked} מוצרים שנבדקו!
                  </span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>
                    מצוין! כל {linkCheckReport.totalChecked} הקישורים שנבדקו באתר תקינים ומובילים לעמודי מוצר פעילים.
                  </span>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setLinkCheckReport(null)}
              className="text-slate-400 hover:text-slate-600 font-bold text-xs"
            >
              ✕
            </button>
          </div>

          {linkCheckReport.brokenCount > 0 && (
            <div className="bg-white/80 rounded-xl p-3 border border-rose-100 divide-y divide-rose-100">
              {linkCheckReport.results
                .filter((r) => r.status === "broken")
                .map((br) => (
                  <div key={br.productId} className="py-2 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <span className="font-bold text-rose-950 truncate block">{br.title}</span>
                      <span className="text-[11px] text-rose-700">סיבה: {br.error || "שגיאת גישה"}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const target = products.find((p) => p.id === br.productId || p.aliId === br.aliId);
                        if (target) setEditingProduct(target);
                      }}
                      className="px-3 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-700 shrink-0"
                    >
                      ערוך קישור
                    </button>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Batch Action Bar (if items selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-ali-500 text-white font-bold text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold">
              {selectedIds.length === 1
                ? "מוצר 1 נבחר (בחר עוד 2 לפחות להשוואה)"
                : selectedIds.length < 3
                ? `${selectedIds.length} מוצרים נבחרו (נדרשים 3 לפחות להשוואה)`
                : `${selectedIds.length} מוצרים נבחרו (טווח מותר: 3 עד 10)`}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.length >= 3 ? (
              <Link
                href={`/admin/ingest?batchIds=${selectedIds.join(",")}&type=top5`}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-ali-500 to-amber-500 text-white font-bold text-xs hover:brightness-110 shadow-md transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>צור עמוד השוואת TOP {selectedIds.length} מהנבחרים!</span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => alert("יש לבחור לפחות 3 מוצרים כדי לייצר עמוד השוואת TOP N")}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 text-slate-300 font-bold text-xs opacity-75 cursor-not-allowed"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>בחר עוד {3 - selectedIds.length} מוצרים להשוואה</span>
              </button>
            )}

            <button
              onClick={() => setSelectedIds([])}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              בטל בחירה
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="חפש לפי שם מוצר, מזהה (AliId) או מילת מפתח..."
            className="w-full pr-10 pl-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:border-ali-500 transition-all"
          />
        </div>

        {/* Category Filter */}
        {categories.length > 0 && (
          <div className="flex items-center gap-1.5">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white text-xs font-bold text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">כל הקטגוריות ({products.length})</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.nameHe}>
                  {cat.icon || "🏷️"} {cat.nameHe}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Customs Filter */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
          <button
            onClick={() => setCustomsFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              customsFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
            }`}
          >
            כל המוצרים ({products.length})
          </button>
          <button
            onClick={() => setCustomsFilter("safe")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              customsFilter === "safe" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-500 hover:text-emerald-700"
            }`}
          >
            פטור בטוח (עד 73$)
          </button>
          <button
            onClick={() => setCustomsFilter("buffer")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              customsFilter === "buffer" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-amber-700"
            }`}
          >
            מרווח ביטחון 2$ (73$-75$)
          </button>
          <button
            onClick={() => setCustomsFilter("taxable")}
            className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
              customsFilter === "taxable" ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:text-rose-700"
            }`}
          >
            חייב מכס (75$+)
          </button>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="py-24 text-center text-slate-400">
          <Package className="w-10 h-10 animate-bounce mx-auto mb-2 text-indigo-500" />
          <p className="text-sm font-bold">טוען מאגר מוצרים מרכזי...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">לא נמצאו מוצרים במאגר</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            הזן קישורים חדשים או חפש באלי אקספרס כדי להתחיל לבנות את קטלוג המוצרים שלך.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setAutoInput("");
                setAutoError(null);
                setAutoFetchedPreview(null);
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 text-white font-bold text-xs hover:from-orange-700 hover:to-amber-700 transition-all cursor-pointer shadow-md shadow-orange-500/20"
            >
              <Plus className="w-4 h-4" />
              <span>+ הוסף מוצר ראשון עכשיו</span>
            </button>
            <Link
              href="/admin/bulk-ingest"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>הזנת קישורים מרובה</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((prod) => {
            const isSelected = selectedIds.includes(prod.id);
            const priceIls = prod.priceIls || Math.round(prod.priceUsd * 3.65);

            return (
              <div
                key={prod.id}
                className={`rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-sm hover:shadow-md ${
                  isSelected ? "border-ali-500 ring-2 ring-ali-500/20" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div>
                  {/* Top Image + Checkbox & Customs Badge */}
                  <div className="relative aspect-video bg-slate-100 overflow-hidden border-b border-slate-100">
                    {prod.mainImage ? (
                      <img
                        src={prod.mainImage}
                        alt={prod.titleHe || prod.originalTitle}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300">
                        <ShoppingBag className="w-12 h-12" />
                      </div>
                    )}

                    {/* Checkbox for batch selection */}
                    <div className="absolute top-3 right-3">
                      <button
                        type="button"
                        onClick={() => toggleSelect(prod.id)}
                        className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-sm ${
                          isSelected
                            ? "bg-ali-600 text-white"
                            : "bg-white/90 text-slate-400 hover:text-slate-800 border border-slate-200 backdrop-blur-sm"
                        }`}
                        title="סמן לבחירה מרובה (להפקת TOP 5)"
                      >
                        {isSelected ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Customs Badge */}
                    <div className="absolute bottom-2 right-2">
                      <CustomsBadge priceUsd={prod.priceUsd} />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-3">
                    {/* Store & Rating */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-indigo-500" />
                        <span className="font-semibold line-clamp-1 max-w-[130px]">
                          {prod.storeName || "AliExpress Store"}
                        </span>
                        {prod.sellerPositiveRate && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1 rounded">
                            {prod.sellerPositiveRate}
                          </span>
                        )}
                      </div>

                      {prod.ordersCount !== undefined && (
                        <span className="font-medium bg-slate-100 px-2 py-0.5 rounded-lg text-slate-600">
                          {prod.ordersCount.toLocaleString()} הזמנות
                        </span>
                      )}
                    </div>

                    {/* Titles, Category & Tags */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        {prod.category && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <FolderTree className="w-2.5 h-2.5" />
                            {prod.category}
                          </span>
                        )}
                        {prod.tags && prod.tags.slice(0, 3).map((t) => (
                          <span key={t} className="text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            #{t}
                          </span>
                        ))}
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                        {prod.titleHe || prod.originalTitle}
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        מזהה: {prod.aliId}
                      </p>
                    </div>

                    {/* Price in USD & ILS */}
                    <div className="flex items-baseline gap-2 pt-1">
                      <span className="text-xl font-black text-slate-900">${prod.priceUsd}</span>
                      <span className="text-sm font-bold text-emerald-600"> כ-₪{priceIls}</span>
                    </div>

                    {/* Usage in Pages Badges */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        <span>משובץ ב-{prod.usedInPages?.length || 0} עמודים באתר:</span>
                      </div>
                      {prod.usedInPages && prod.usedInPages.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {prod.usedInPages.slice(0, 3).map((page) => (
                            <Link
                              key={page.id}
                              href={`/${page.type === "top5" ? "top5" : "reviews"}/${page.slug}`}
                              target="_blank"
                              className="text-[10px] font-medium bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 px-2 py-0.5 rounded-md transition-colors flex items-center gap-1"
                            >
                              <span>{page.title.slice(0, 20)}...</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[10px] text-amber-600 font-medium mt-1 block">
                          טרם שובץ בעמוד – לחץ למטה להפקת סקירה!
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingProduct(prod)}
                      className="p-2 rounded-xl text-slate-600 hover:text-indigo-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                      title="ערוך מוצר וקישור אפיליאציה"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyLink(prod.affiliateUrl || prod.aliUrl, prod.id)}
                      className="p-2 rounded-xl text-slate-600 hover:text-emerald-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                      title="העתק קישור אפיליאציה"
                    >
                      {copiedId === prod.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                    </button>

                    <a
                      href={prod.affiliateUrl || prod.aliUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl text-slate-600 hover:text-ali-600 hover:bg-white border border-transparent hover:border-slate-200 transition-all"
                      title="בדוק קישור באלי אקספרס"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(prod.id, prod.titleHe || prod.originalTitle)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                      title="מחק מוצר מהמאגר"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 1-Click AI Review Generator */}
                  <Link
                    href={`/admin/ingest?directAliId=${prod.aliId}&type=review`}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>הפק סקירה</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-base text-slate-900">
                  עריכת מוצר וקישור אפיליאציה
                </h3>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  כותרת המוצר בעברית
                </label>
                <input
                  type="text"
                  value={editingProduct.titleHe || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, titleHe: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  קישור אפיליאציה ראשי (משתקף בכל העמודים באתר!)
                </label>
                <input
                  type="url"
                  value={editingProduct.affiliateUrl || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, affiliateUrl: e.target.value })
                  }
                  placeholder="https://s.click.aliexpress.com/e/_..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none font-mono text-[11px]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    מחיר בדולר ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingProduct.priceUsd || 0}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setEditingProduct({
                        ...editingProduct,
                        priceUsd: val,
                        priceIls: Math.round(val * 3.65 * 10) / 10,
                      });
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    מחיר מחושב בש&quot;ח (₪)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingProduct.priceIls || 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        priceIls: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  קישור תמונה ראשית (URL)
                </label>
                <input
                  type="url"
                  value={editingProduct.mainImage || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, mainImage: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                    <span>קטגוריה ראשית</span>
                  </label>
                  <select
                    value={editingProduct.category || "כללי"}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, category: e.target.value })
                    }
                    className="w-full p-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none bg-white font-medium text-xs"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.nameHe}>
                        {c.icon || "🏷️"} {c.nameHe}
                      </option>
                    ))}
                    {!categories.some((c) => c.nameHe === editingProduct.category) && editingProduct.category && (
                      <option value={editingProduct.category}>{editingProduct.category}</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-600" />
                    <span>הוספת תגית</span>
                  </label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === ",") {
                          e.preventDefault();
                          const trimmed = tagInput.trim().replace(/^#/, "");
                          if (trimmed && !editingProduct.tags?.includes(trimmed)) {
                            setEditingProduct({
                              ...editingProduct,
                              tags: [...(editingProduct.tags || []), trimmed],
                            });
                          }
                          setTagInput("");
                        }
                      }}
                      placeholder="הקלד תגית ולחץ Enter..."
                      className="flex-1 p-2 rounded-xl border border-slate-300 text-xs focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const trimmed = tagInput.trim().replace(/^#/, "");
                        if (trimmed && !editingProduct.tags?.includes(trimmed)) {
                          setEditingProduct({
                            ...editingProduct,
                            tags: [...(editingProduct.tags || []), trimmed],
                          });
                        }
                        setTagInput("");
                      }}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold"
                    >
                      הוסף
                    </button>
                  </div>
                </div>
              </div>

              {/* Active Tags */}
              <div className="flex flex-wrap gap-1.5">
                {(editingProduct.tags || []).map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-medium"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() =>
                        setEditingProduct({
                          ...editingProduct,
                          tags: (editingProduct.tags || []).filter((tag) => tag !== t),
                        })
                      }
                      className="hover:text-rose-600 font-bold"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {(!editingProduct.tags || editingProduct.tags.length === 0) && (
                  <span className="text-[11px] text-slate-400 italic">לא הוגדרו תגיות</span>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  תיאור או דגשים בעברית
                </label>
                <textarea
                  rows={2}
                  value={editingProduct.descriptionHe || ""}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, descriptionHe: e.target.value })
                  }
                  placeholder="דגשים עיקריים על המוצר..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs"
                />
              </div>

              {/* SEO Meta Fields */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 text-xs">הגדרות SEO וגוגל (Meta Tags)</span>
                  <span className="text-[10px] text-slate-500">עבור תוצאות חיפוש בגוגל ו-AI Search</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">כותרת SEO (Meta Title)</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(editingProduct.metaTitle || "").length}/60 תווים
                    </span>
                  </div>
                  <input
                    type="text"
                    value={editingProduct.metaTitle || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, metaTitle: e.target.value })
                    }
                    placeholder="כותרת אטרקטיבית לגוגל (למשל: סקירה ומחיר מבצע בישראל)"
                    className="w-full p-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs"
                    maxLength={100}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">תיאור SEO (Meta Description)</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {(editingProduct.metaDescription || "").length}/160 תווים
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={editingProduct.metaDescription || ""}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, metaDescription: e.target.value })
                    }
                    placeholder="תיאור מטא מושך לגוגל הכולל מחיר, פטור מכס ומשלוח מהיר..."
                    className="w-full p-2 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs"
                    maxLength={250}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50"
                >
                  {isSaving ? "שומר שינויים..." : "שמור ועדכן בכל האתר"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Product Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-6 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                  <h2 className="text-xl font-black text-slate-900">
                    הוספת מוצר חדש למאגר
                  </h2>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  המוצר יישמר במאגר המרכזי ויהיה זמין לשיבוץ מיידי בעמודי TOP 5, סקירות וחיפוש
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setAutoFetchedPreview(null);
                  setAutoError(null);
                }}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-all"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex rounded-2xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAddMode("auto")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  addMode === "auto"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>ייבוא חכם ואוטומטי מ-AliExpress (מומלץ)</span>
              </button>
              <button
                type="button"
                onClick={() => setAddMode("manual")}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${
                  addMode === "manual"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Edit className="w-4 h-4 text-indigo-500" />
                <span>הזנה ידנית</span>
              </button>
            </div>

            {/* Mode A: Smart Auto-Ingest */}
            {addMode === "auto" && (
              <div className="space-y-5">
                <div className="space-y-3 p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                  <div>
                    <label className="block text-xs font-bold text-slate-800 mb-1">
                      קישור למוצר באלי אקספרס או מזהה מוצר מספרי
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={autoInput}
                          onChange={(e) => setAutoInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !isFetchingAuto) {
                              e.preventDefault();
                              handleAutoFetch();
                            }
                          }}
                          placeholder="למשל: https://he.aliexpress.com/item/1005006392019482.html או 1005006392019482"
                          className="w-full pl-3 pr-9 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:outline-none text-xs font-mono"
                          dir="ltr"
                        />
                        <Link2 className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                      </div>
                      <button
                        type="button"
                        onClick={handleAutoFetch}
                        disabled={isFetchingAuto || !autoInput.trim()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {isFetchingAuto ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>שולף נתונים...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>שלוף והעשר (AI)</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      שיוך לקטגוריה
                    </label>
                    <select
                      value={autoCategory}
                      onChange={(e) => setAutoCategory(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:outline-none text-xs bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.nameHe}>
                          {c.icon || "📁"} {c.nameHe}
                        </option>
                      ))}
                      {categories.length === 0 && (
                        <option value="אלקטרוניקה וגאדג'טים">אלקטרוניקה וגאדג'טים</option>
                      )}
                    </select>
                  </div>
                </div>

                {/* Error Banner */}
                {autoError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">שגיאה במשיכת המוצר:</p>
                      <p className="text-[11px] mt-0.5">{autoError}</p>
                    </div>
                  </div>
                )}

                {/* Loading status details */}
                {isFetchingAuto && (
                  <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-900 text-xs space-y-1 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-1" />
                    <p className="font-bold">מבצע שליפה חכמה וסינתזה בעברית...</p>
                    <p className="text-[11px] text-indigo-600">
                      פונה לממשקי AliExpress, מחלץ מפרטים, תמונות וביקורות, ומייצר תרגום וכותרות מותאמות SEO.
                    </p>
                  </div>
                )}

                {/* Fetched Product Preview */}
                {autoFetchedPreview && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in-50 duration-200">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        המוצר אותר והועשר בהצלחה!
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        ID: {autoFetchedPreview.aliId}
                      </span>
                    </div>

                    <div className="flex gap-4">
                      {autoFetchedPreview.mainImage && (
                        <div className="w-24 h-24 rounded-xl bg-white border border-slate-200 overflow-hidden shrink-0">
                          <img
                            src={autoFetchedPreview.mainImage}
                            alt="preview"
                            className="w-full h-full object-contain p-1"
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500">כותרת בעברית (עריכה חופשית):</label>
                          <input
                            type="text"
                            value={autoFetchedPreview.titleHe || autoFetchedPreview.originalTitle || ""}
                            onChange={(e) =>
                              setAutoFetchedPreview({ ...autoFetchedPreview, titleHe: e.target.value })
                            }
                            className="w-full p-1.5 rounded-lg border border-slate-300 text-xs font-bold text-slate-900 bg-white"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-1">
                          באנגלית: {autoFetchedPreview.originalTitle}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex items-baseline gap-1">
                            <span className="text-base font-black text-slate-900">
                              ${autoFetchedPreview.priceUsd}
                            </span>
                            <span className="text-xs font-bold text-emerald-600">
                              (כ-₪{autoFetchedPreview.priceIls || Math.round(autoFetchedPreview.priceUsd * 3.65)})
                            </span>
                          </div>
                          <CustomsBadge priceUsd={autoFetchedPreview.priceUsd} />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end gap-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setAutoFetchedPreview(null)}
                        className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-semibold text-xs"
                      >
                        נקה
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmSaveAuto}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSaving ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>שומר למאגר...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>אשר ושמור מוצר לקטלוג המרכזי</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mode B: Manual Entry Form */}
            {addMode === "manual" && (
              <form onSubmit={handleSaveManual} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      מזהה מוצר (Ali ID) או קישור מלא
                    </label>
                    <input
                      type="text"
                      required
                      value={manualForm.aliId}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = val.match(/\/item\/(\d+)\.html/) || val.match(/item\/(\d+)/) || val.match(/(\d{8,25})/);
                        setManualForm({
                          ...manualForm,
                          aliId: val,
                          aliUrl: val.includes("http") ? val : `https://www.aliexpress.com/item/${match ? match[1] : val}.html`,
                        });
                      }}
                      placeholder="למשל: 1005006392019482"
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      קטגוריה
                    </label>
                    <select
                      value={manualForm.category}
                      onChange={(e) => setManualForm({ ...manualForm, category: e.target.value })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.nameHe}>
                          {c.icon || "📁"} {c.nameHe}
                        </option>
                      ))}
                      {categories.length === 0 && (
                        <option value="אלקטרוניקה וגאדג'טים">אלקטרוניקה וגאדג'טים</option>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    כותרת המוצר בעברית (חובה)
                  </label>
                  <input
                    type="text"
                    required
                    value={manualForm.titleHe}
                    onChange={(e) => setManualForm({ ...manualForm, titleHe: e.target.value })}
                    placeholder="למשל: מקרן נייד חכם Magcubic HY300 4K אנדרואיד 11"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    כותרת מקורית באנגלית
                  </label>
                  <input
                    type="text"
                    value={manualForm.originalTitle}
                    onChange={(e) => setManualForm({ ...manualForm, originalTitle: e.target.value })}
                    placeholder="Original AliExpress Title"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs"
                    dir="ltr"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      מחיר בדולר ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={manualForm.priceUsd}
                      onChange={(e) => {
                        const usd = parseFloat(e.target.value) || 0;
                        setManualForm({
                          ...manualForm,
                          priceUsd: usd,
                          priceIls: Math.round(usd * 3.65 * 10) / 10,
                        });
                      }}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-bold"
                      dir="ltr"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      מחיר מוערך בשקלים (₪)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={manualForm.priceIls}
                      onChange={(e) =>
                        setManualForm({ ...manualForm, priceIls: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    קישור לתמונת המוצר (Image URL)
                  </label>
                  <input
                    type="url"
                    value={manualForm.mainImage}
                    onChange={(e) => setManualForm({ ...manualForm, mainImage: e.target.value })}
                    placeholder="https://ae01.alicdn.com/kf/..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                    dir="ltr"
                  />
                  {manualForm.mainImage && (
                    <div className="mt-2 w-20 h-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden">
                      <img
                        src={manualForm.mainImage}
                        alt="preview"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    קישור אפיליאציה (אופציונלי - יג'ונרט אוטומטית אם ריק)
                  </label>
                  <input
                    type="url"
                    value={manualForm.affiliateUrl}
                    onChange={(e) => setManualForm({ ...manualForm, affiliateUrl: e.target.value })}
                    placeholder="https://s.click.aliexpress.com/e/..."
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:outline-none text-xs font-mono"
                    dir="ltr"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                  >
                    ביטול
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? "שומר..." : "שמור מוצר חדש בקטלוג"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
