"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FolderPlus,
  Tag,
  Edit2,
  Trash2,
  Plus,
  X,
  Search,
  Check,
  Package,
  FileText,
  Sparkles,
  ExternalLink,
  Layers,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

interface CategoryItem {
  id: string;
  nameHe: string;
  slug: string;
  icon?: string;
  aliCategoryId?: string;
  descriptionHe?: string;
  tags: string[];
  productCount?: number;
  pageCount?: number;
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit / Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);
  const [formNameHe, setFormNameHe] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formIcon, setFormIcon] = useState("🏷️");
  const [formAliCategoryId, setFormAliCategoryId] = useState("");
  const [formDescriptionHe, setFormDescriptionHe] = useState("");
  const [formTags, setFormTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
      if (data.allTags) setAllTags(data.allTags);
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: "שגיאה בטעינת קטגוריות" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormNameHe("");
    setFormSlug("");
    setFormIcon("🏷️");
    setFormAliCategoryId("");
    setFormDescriptionHe("");
    setFormTags([]);
    setTagInput("");
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormNameHe(cat.nameHe);
    setFormSlug(cat.slug);
    setFormIcon(cat.icon || "🏷️");
    setFormAliCategoryId(cat.aliCategoryId || "");
    setFormDescriptionHe(cat.descriptionHe || "");
    setFormTags(cat.tags || []);
    setTagInput("");
    setIsModalOpen(true);
  };

  const handleAddTag = (e?: React.KeyboardEvent | React.MouseEvent) => {
    if (e && "key" in e && e.key !== "Enter" && e.key !== ",") return;
    if (e) e.preventDefault();

    const trimmed = tagInput.trim().replace(/,/g, "");
    if (!trimmed) return;

    if (!formTags.includes(trimmed)) {
      setFormTags([...formTags, trimmed]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormTags(formTags.filter((t) => t !== tagToRemove));
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameHe.trim() || !formSlug.trim()) {
      alert("חובה להזין שם בעברית ומזהה באנגלית (Slug)");
      return;
    }

    setIsSaving(true);
    setFeedbackMsg(null);

    try {
      const payload: Partial<CategoryItem> = {
        id: editingCategory ? editingCategory.id : `cat_${formSlug.trim()}`,
        nameHe: formNameHe.trim(),
        slug: formSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        icon: formIcon.trim() || "🏷️",
        aliCategoryId: formAliCategoryId.trim() || undefined,
        descriptionHe: formDescriptionHe.trim(),
        tags: formTags,
      };

      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בשמירת הקטגוריה");
      }

      setFeedbackMsg({
        type: "success",
        text: editingCategory
          ? `הקטגוריה "${formNameHe}" עודכנה בהצלחה!`
          : `הקטגוריה "${formNameHe}" נוצרה בהצלחה!`,
      });

      setIsModalOpen(false);
      await fetchCategories();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "שגיאה בשמירת הקטגוריה" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (cat: CategoryItem) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את הקטגוריה "${cat.nameHe}" לצמיתות?`)) return;

    try {
      const res = await fetch(`/api/categories?id=${encodeURIComponent(cat.id)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setCategories(categories.filter((c) => c.id !== cat.id));
        setFeedbackMsg({ type: "success", text: `הקטגוריה "${cat.nameHe}" נמחקה.` });
      } else {
        alert("שגיאה במחיקת הקטגוריה");
      }
    } catch {
      alert("שגיאת תקשורת עם השרת");
    }
  };

  // Filter categories by search or selected tag
  const filteredCategories = categories.filter((cat) => {
    if (selectedTagFilter && !cat.tags?.includes(selectedTagFilter)) {
      return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = cat.nameHe.toLowerCase().includes(q);
      const matchSlug = cat.slug.toLowerCase().includes(q);
      const matchDesc = (cat.descriptionHe || "").toLowerCase().includes(q);
      const matchTag = cat.tags?.some((t) => t.toLowerCase().includes(q));
      return matchName || matchSlug || matchDesc || matchTag;
    }
    return true;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">
              ניהול תוכן וטקסונומיה
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            ניהול קטגוריות ותגיות (Taxonomy Studio)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            הגדר קטגוריות תוכן, שייך מזהה קטגוריה רשמי ב-AliExpress API, וערוך תגיות לשיפור חיפושים ו-SEO.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-md shadow-ali-600/20 transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            <span>הוסף קטגוריה חדשה</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between animate-in fade-in duration-200 ${
            feedbackMsg.type === "success"
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Global Tag Cloud Strip */}
      {allTags.length > 0 && (
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" />
              <span>כל התגיות באתר ({allTags.length}):</span>
            </div>
            {selectedTagFilter && (
              <button
                type="button"
                onClick={() => setSelectedTagFilter(null)}
                className="text-indigo-600 hover:underline text-[11px]"
              >
                נקה סינון תגית
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5 pt-1">
            {allTags.map((tag) => {
              const isSelected = selectedTagFilter === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTagFilter(isSelected ? null : tag)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  #{tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="חפש לפי שם קטגוריה, Slug או תגית..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pr-10 pl-4 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-ali-500"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold self-end sm:self-auto">
          <span>נמצאו {filteredCategories.length} קטגוריות</span>
          <button
            type="button"
            onClick={fetchCategories}
            className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
            title="רענן"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative group"
          >
            <div className="space-y-3">
              {/* Card Top: Icon, Title, Actions */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">
                    {cat.icon || "🏷️"}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-900 truncate" title={cat.nameHe}>
                      {cat.nameHe}
                    </h3>
                    <span className="font-mono text-[10px] text-slate-400 block truncate">
                      /{cat.slug}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                    title="ערוך קטגוריה ותגיות"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="מחק קטגוריה"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Description */}
              {cat.descriptionHe && (
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {cat.descriptionHe}
                </p>
              )}

              {/* AliExpress API ID Badge */}
              {cat.aliCategoryId && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono bg-slate-50 px-2 py-1 rounded-lg border border-slate-200 w-fit">
                  <span className="font-bold text-ali-600">AliExpress ID:</span>
                  <span>{cat.aliCategoryId}</span>
                </div>
              )}

              {/* Tags Chips */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 block">תגיות משויכות:</span>
                <div className="flex flex-wrap gap-1">
                  {cat.tags && cat.tags.length > 0 ? (
                    cat.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md"
                      >
                        #{t}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">אין תגיות עדיין</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card Footer: Usage Counts & Links */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span title="מוצרים בקטלוג המשויכים לקטגוריה">
                  📦 {cat.productCount || 0} מוצרים
                </span>
                <span title="עמודים שפורסמו בקטגוריה">
                  📄 {cat.pageCount || 0} עמודים
                </span>
              </div>

              <Link
                href={`/admin/ingest?category=${encodeURIComponent(cat.nameHe)}`}
                className="text-[11px] font-bold text-ali-600 hover:text-ali-700 flex items-center gap-0.5"
              >
                <span>הזן מוצר לקטגוריה</span>
                <span>←</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Create or Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-ali-600 text-white flex items-center justify-center font-bold">
                  {editingCategory ? <Edit2 className="w-4 h-4" /> : <FolderPlus className="w-4 h-4" />}
                </div>
                <h3 className="font-bold text-base text-slate-900">
                  {editingCategory ? `עריכת קטגוריה: ${editingCategory.nameHe}` : "הוספת קטגוריה חדשה"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              {/* Row 1: Name and Emoji Icon */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3 space-y-1">
                  <label className="font-bold text-slate-700 block">שם הקטגוריה בעברית:</label>
                  <input
                    type="text"
                    required
                    placeholder="לדוגמה: אלקטרוניקה וגאדג'טים"
                    value={formNameHe}
                    onChange={(e) => {
                      setFormNameHe(e.target.value);
                      if (!editingCategory && !formSlug) {
                        setFormSlug(
                          e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9]/g, "-")
                            .slice(0, 30)
                        );
                      }
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-ali-500"
                  />
                </div>

                <div className="col-span-1 space-y-1">
                  <label className="font-bold text-slate-700 block">אייקון:</label>
                  <input
                    type="text"
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full text-center px-2 py-2 rounded-xl border border-slate-200 text-base focus:outline-none focus:ring-2 focus:ring-ali-500"
                  />
                </div>
              </div>

              {/* Row 2: Slug & AliExpress Category ID */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">מזהה באנגלית (Slug / URL):</label>
                  <input
                    type="text"
                    required
                    placeholder="electronics"
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">מזהה קטגוריה ב-AliExpress:</label>
                  <input
                    type="text"
                    placeholder="למשל 44 או 15"
                    value={formAliCategoryId}
                    onChange={(e) => setFormAliCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block">תיאור הקטגוריה (SEO וגולשים):</label>
                <textarea
                  rows={2}
                  placeholder="תיאור קצר של סוגי המוצרים בקטגוריה..."
                  value={formDescriptionHe}
                  onChange={(e) => setFormDescriptionHe(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500 leading-relaxed"
                />
              </div>

              {/* Dynamic Tag Management */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="font-bold text-slate-700 block">
                  תגיות משויכות לקטגוריה (הזן מילה ולחץ Enter):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="הוסף תגית (למשל: מקרן, שקע EU)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleAddTag}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-slate-200 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors"
                  >
                    הוסף
                  </button>
                </div>

                {/* Form Tags Display */}
                <div className="flex flex-wrap gap-1.5 pt-1 max-h-28 overflow-y-auto">
                  {formTags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-xs"
                    >
                      <span>#{t}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="hover:text-rose-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold transition-colors"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold shadow-md shadow-ali-600/20 transition-all disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>{editingCategory ? "שמור שינויים" : "צור קטגוריה"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
