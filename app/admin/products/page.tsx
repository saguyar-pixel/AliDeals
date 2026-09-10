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
} from "lucide-react";
import { CustomsBadge } from "@/components/admin/CustomsBadge";

interface ProductItem {
  id: string;
  aliId: string;
  originalTitle: string;
  titleHe?: string;
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

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customsFilter, setCustomsFilter] = useState<"all" | "safe" | "buffer" | "taxable">("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/products");
      const data = await res.json();
      if (data.products) setProducts(data.products);
    } catch (e) {
      console.error("Failed to load products", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleCopyLink = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDeleteProduct = async (id: string, name: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את המוצר "${name}"?`)) return;
    try {
      await fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
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
        headers: { "Content-Type": "application/json" },
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
      if (selectedIds.length >= 5) {
        alert("ניתן לבחור עד 5 מוצרים להשוואת TOP 5");
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

    if (customsFilter === "safe") return p.priceUsd <= 73.0;
    if (customsFilter === "buffer") return p.priceUsd > 73.0 && p.priceUsd <= 75.0;
    if (customsFilter === "taxable") return p.priceUsd > 75.0;

    return true;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24" dir="rtl">
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

        <div className="flex items-center gap-3">
          <Link
            href="/admin/bulk-ingest"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>הזנת קישורים מהירה</span>
          </Link>
          <Link
            href="/admin/ingest"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-md shadow-ali-600/20 transition-all"
          >
            <Search className="w-4 h-4" />
            <span>חיפוש ב-AliExpress API</span>
          </Link>
        </div>
      </div>

      {/* Floating Batch Action Bar (if items selected) */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-3.5 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-6 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-ali-500 text-white font-bold text-xs flex items-center justify-center">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold">מוצרים נבחרו</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/admin/ingest?batchIds=${selectedIds.join(",")}&type=top5`}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-ali-500 to-amber-500 text-white font-bold text-xs hover:brightness-110 shadow-md transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>צור עמוד השוואת TOP 5 מהנבחרים!</span>
            </Link>

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
          <Link
            href="/admin/bulk-ingest"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ali-600 text-white font-bold text-xs hover:bg-ali-700 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>הזן מוצרים ראשונים עכשיו</span>
          </Link>
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

                    {/* Titles */}
                    <div>
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
    </div>
  );
}
