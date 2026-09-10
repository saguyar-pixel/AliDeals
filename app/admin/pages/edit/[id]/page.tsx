"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  Save,
  ArrowRight,
  ExternalLink,
  Eye,
  Sparkles,
  Package,
  Layers,
  Check,
  FolderTree,
  Tag,
  X,
  Plus,
} from "lucide-react";
import GeoScoreWidget from "@/components/admin/GeoScoreWidget";
import MarkdownContent from "@/components/MarkdownContent";

interface PageRecord {
  id: string;
  slug: string;
  type: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  directAnswerGeo: string;
  contentMarkdown: string;
  featuredImage?: string;
  productIds: string;
  targetCategory?: string;
  tags?: string[];
  status?: string;
}

interface ProductItem {
  id: string;
  aliId: string;
  titleHe?: string;
  originalTitle: string;
  priceUsd: number;
  mainImage: string;
}

interface CategoryItem {
  id: string;
  nameHe: string;
  slug: string;
  icon?: string;
  tags?: string[];
}

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const pageId = resolvedParams.id;

  const [page, setPage] = useState<PageRecord | null>(null);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allExistingTags, setAllExistingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"content" | "seo" | "products">("content");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load page
        const pagesRes = await fetch("/api/pages");
        const pagesData = await pagesRes.json();
        const found = (pagesData.pages || []).find(
          (p: PageRecord) => p.id === pageId || p.slug === pageId
        );

        if (found) {
          setPage(found);
          try {
            const parsedIds = JSON.parse(found.productIds || "[]");
            setSelectedProductIds(parsedIds);
          } catch {
            setSelectedProductIds([]);
          }
        }

        // Load all products for product linking
        const prodRes = await fetch("/api/products");
        const prodData = await prodRes.json();
        if (prodData.products) setAllProducts(prodData.products);

        // Load categories and tags
        const catRes = await fetch("/api/categories");
        const catData = await catRes.json();
        if (catData.categories) setCategories(catData.categories);
        if (catData.allTags) setAllExistingTags(catData.allTags);
      } catch (e) {
        console.error("Failed to load page data", e);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [pageId]);

  const handleToggleProduct = (prodId: string) => {
    if (selectedProductIds.includes(prodId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== prodId));
    } else {
      setSelectedProductIds([...selectedProductIds, prodId]);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmed = tagToAdd.trim().replace(/^#/, "");
    if (!trimmed || !page) return;
    const currentTags = page.tags || [];
    if (!currentTags.includes(trimmed)) {
      setPage({ ...page, tags: [...currentTags, trimmed] });
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!page) return;
    const currentTags = page.tags || [];
    setPage({ ...page, tags: currentTags.filter((t) => t !== tagToRemove) });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!page) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const payload = {
        ...page,
        productIds: JSON.stringify(selectedProductIds),
        tags: page.tags || [],
      };

      const res = await fetch("/api/pages/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        alert(result.error || "שגיאה בשמירת העמוד");
      }
    } catch (e) {
      alert("שגיאת תקשורת עם השרת");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400" dir="rtl">
        <FileText className="w-10 h-10 animate-pulse mx-auto mb-2 text-indigo-500" />
        <p className="text-sm font-bold">טוען נתוני עמוד לעריכה...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="py-20 text-center bg-white rounded-3xl border border-slate-200 p-8 space-y-4" dir="rtl">
        <h3 className="text-base font-bold text-slate-800">העמוד לא נמצא</h3>
        <Link
          href="/admin/pages"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה לרשימת העמודים</span>
        </Link>
      </div>
    );
  }

  const publicUrl = `/${page.type === "top5" ? "top5" : "reviews"}/${page.slug}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-24" dir="rtl">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all"
            title="חזרה לכל העמודים"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
          </Link>
          <div>
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
              עריכה רטרואקטיבית | {page.type === "top5" ? "מדריך TOP 5" : "סקירת מוצר"}
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 line-clamp-1 mt-0.5">
              {page.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 font-bold text-xs transition-all"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>צפה באתר החי</span>
          </a>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "שומר..." : "שמור שינויים"}</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <span>✓ השינויים נשמרו בהצלחה ומשתקפים בענן!</span>
          <a href={publicUrl} target="_blank" className="underline hover:text-emerald-950">
            פתח עמוד
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab("content")}
          className={`pb-3 px-4 font-bold text-xs transition-all border-b-2 ${
            activeTab === "content"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          תוכן ומאמר (Markdown)
        </button>
        <button
          onClick={() => setActiveTab("seo")}
          className={`pb-3 px-4 font-bold text-xs transition-all border-b-2 ${
            activeTab === "seo"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          הגדרות SEO & שורה תחתונה (GEO)
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`pb-3 px-4 font-bold text-xs transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "products"
              ? "border-indigo-600 text-indigo-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>מוצרים משוייכים ({selectedProductIds.length})</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: Content */}
        {activeTab === "content" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block font-bold text-slate-800 text-xs mb-1">
                כותרת העמוד הראשית (H1)
              </label>
              <input
                type="text"
                value={page.title}
                onChange={(e) => setPage({ ...page, title: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  כתובת העמוד (Slug / URL)
                </label>
                <input
                  type="text"
                  value={page.slug}
                  onChange={(e) => setPage({ ...page, slug: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  תמונת שער ראשית (URL)
                </label>
                <input
                  type="text"
                  value={page.featuredImage || ""}
                  onChange={(e) => setPage({ ...page, featuredImage: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block font-bold text-slate-800 text-xs">
                  גוף הכתבה (Markdown)
                </label>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPreviewMode("edit")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      previewMode === "edit"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    עריכת טקסט
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("preview")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      previewMode === "preview"
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    תצוגה מקדימה נקייה (Live Preview)
                  </button>
                </div>
              </div>

              {previewMode === "edit" ? (
                <textarea
                  rows={16}
                  value={page.contentMarkdown}
                  onChange={(e) => setPage({ ...page, contentMarkdown: e.target.value })}
                  className="w-full p-4 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed bg-white"
                  placeholder="תוכן הכתבה בפורמט Markdown..."
                />
              ) : (
                <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 max-h-[600px] overflow-y-auto">
                  <MarkdownContent content={page.contentMarkdown} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SEO & GEO */}
        {activeTab === "seo" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div>
              <label className="block font-bold text-slate-800 text-xs mb-1">
                כותרת מטא לגוגל (Meta Title)
              </label>
              <input
                type="text"
                value={page.metaTitle || ""}
                onChange={(e) => setPage({ ...page, metaTitle: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 text-xs mb-1">
                תיאור מטא (Meta Description)
              </label>
              <textarea
                rows={3}
                value={page.metaDescription || ""}
                onChange={(e) => setPage({ ...page, metaDescription: e.target.value })}
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5 text-indigo-900">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>בלוק שורה תחתונה ממוקדת ל-AI Search (Direct Answer GEO)</span>
              </label>
              <textarea
                rows={4}
                value={page.directAnswerGeo || ""}
                onChange={(e) => setPage({ ...page, directAnswerGeo: e.target.value })}
                className="w-full p-3 rounded-xl border border-indigo-200 bg-indigo-50/20 text-xs text-slate-900 focus:outline-none focus:border-indigo-500 leading-relaxed"
                placeholder="פסקת שורה תחתונה שמנועי חיפוש AI (Perplexity, Gemini, SearchGPT) שולפים ומצטטים ישירות..."
              />
              <div className="mt-3">
                <GeoScoreWidget text={page.directAnswerGeo || ""} />
              </div>
            </div>

            {/* Category & Tags Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                  <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                  <span>קטגוריית תוכן</span>
                </label>
                <select
                  value={page.targetCategory || "כללי"}
                  onChange={(e) => setPage({ ...page, targetCategory: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500 bg-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.nameHe}>
                      {c.icon || "🏷️"} {c.nameHe} ({c.slug})
                    </option>
                  ))}
                  {!categories.some((c) => c.nameHe === page.targetCategory) && page.targetCategory && (
                    <option value={page.targetCategory}>{page.targetCategory}</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  משייך את העמוד לקטגוריית על לניווט, breadcrumbs ו-SEO.
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-600" />
                  <span>תגיות חיפוש ו-SEO</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        handleAddTag(tagInput);
                      }
                    }}
                    placeholder="הקלד תגית ולחץ Enter או פסיק..."
                    className="flex-1 p-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddTag(tagInput)}
                    className="px-3 py-2 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    הוסף
                  </button>
                </div>
                
                {/* Active Tags */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(page.tags || []).map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-medium"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {(!page.tags || page.tags.length === 0) && (
                    <span className="text-[11px] text-slate-400 italic">לא הוגדרו תגיות עדיין</span>
                  )}
                </div>

                {/* Popular / Existing Tags Suggestions */}
                {allExistingTags.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 block mb-1">הצעות תגיות מהמערכת:</span>
                    <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                      {allExistingTags
                        .filter((t) => !(page.tags || []).includes(t))
                        .slice(0, 10)
                        .map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleAddTag(t)}
                            className="px-2 py-0.5 rounded-md bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 text-[10px] border border-slate-200 hover:border-indigo-200"
                          >
                            +{t}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Associated Products */}
        {activeTab === "products" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  בחר אילו מוצרים מקושרים לעמוד זה
                </h3>
                <p className="text-[11px] text-slate-500">
                  כל מוצר שנבחר יוצג בטבלת ההשוואה או בכרטיסי הקנייה של העמוד.
                </p>
              </div>
              <Link
                href="/admin/products"
                className="text-indigo-600 hover:underline text-xs font-bold"
              >
                + הוסף מוצרים למאגר
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto p-1">
              {allProducts.map((prod) => {
                const isSelected = selectedProductIds.includes(prod.id) || selectedProductIds.includes(prod.aliId);
                return (
                  <div
                    key={prod.id}
                    onClick={() => handleToggleProduct(prod.id)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected
                        ? "bg-indigo-50/60 border-indigo-500 shadow-sm"
                        : "bg-slate-50 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center p-1">
                      {prod.mainImage ? (
                        <img src={prod.mainImage} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <Package className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">
                        {prod.titleHe || prod.originalTitle}
                      </h4>
                      <div className="flex items-center justify-between mt-1 text-[11px]">
                        <span className="font-bold text-slate-700">${prod.priceUsd}</span>
                        <div
                          className={`w-5 h-5 rounded-lg flex items-center justify-center ${
                            isSelected ? "bg-indigo-600 text-white" : "border border-slate-300 bg-white"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
