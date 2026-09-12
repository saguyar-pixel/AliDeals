"use client";

import { useState, useEffect, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Loader2,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import GeoScoreWidget from "@/components/admin/GeoScoreWidget";
import MarkdownContent from "@/components/MarkdownContent";
import CloudMediaUploader from "@/components/admin/CloudMediaUploader";
import { useAdminNotification } from "@/components/admin/AdminNotificationContext";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";

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
  boughtTogetherIds?: string[];
  crossSellReason?: string;
}

interface ProductItem {
  id: string;
  aliId: string;
  titleHe?: string;
  originalTitle: string;
  priceUsd: number;
  mainImage: string;
  category?: string;
  tags?: string[];
}

interface CategoryItem {
  id: string;
  nameHe: string;
  slug: string;
  icon?: string;
  tags?: string[];
}

function EditPageContent({ pageId }: { pageId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryProductId = searchParams.get("productId");
  const { confirmModal, alertModal, showToast } = useAdminNotification();

  const [page, setPage] = useState<PageRecord | null>(null);
  const [allProducts, setAllProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [allExistingTags, setAllExistingTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [boughtTogetherIds, setBoughtTogetherIds] = useState<string[]>([]);
  const [crossSellReason, setCrossSellReason] = useState<string>("");
  const [isGeneratingCrossSell, setIsGeneratingCrossSell] = useState(false);
  const [quickAttachInput, setQuickAttachInput] = useState("");
  const [isAttaching, setIsAttaching] = useState(false);

  const [activeTab, setActiveTab] = useState<"content" | "seo" | "products" | "cross_sell">("content");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("edit");

  useEffect(() => {
    const loadData = async () => {
      try {
        // 1. Load all products for product linking first
        const prodRes = await fetch("/api/products", { headers: getAdminHeaders() });
        const prodData = await prodRes.json();
        const loadedProducts: ProductItem[] = prodData.products || [];
        if (prodData.products) setAllProducts(loadedProducts);

        // 2. Load page
        const pagesRes = await fetch("/api/pages", { headers: getAdminHeaders() });
        const pagesData = await pagesRes.json();
        const found = (pagesData.pages || []).find(
          (p: PageRecord) => p.id === pageId || p.slug === pageId
        );

        if (pageId === "new") {
          let initialTitle = "";
          let initialSlug = "";
          let initialCategory = "אלקטרוניקה וגאדג'טים";
          let initialTags: string[] = [];
          let initialImage = "";
          let initialMetaTitle = "";
          let initialMetaDesc = "";
          let initialGeo = "";
          let initialProdIds: string[] = [];

          if (queryProductId) {
            const foundProd = loadedProducts.find(
              (p) => p.id === queryProductId || p.aliId === queryProductId
            );
            if (foundProd) {
              const pTitle = foundProd.titleHe || foundProd.originalTitle;
              initialTitle = pTitle;
              initialSlug = (foundProd.aliId || pTitle)
                .toLowerCase()
                .replace(/[^a-z0-9\u0590-\u05FF]+/g, "-")
                .replace(/^-+|-+$/g, "");
              initialCategory = foundProd.category || "אלקטרוניקה וגאדג'טים";
              initialTags = foundProd.tags || [];
              initialImage = foundProd.mainImage || "";
              initialMetaTitle = `סקירת ${pTitle} - מפרט, מחיר והמלצות | AliDeals`;
              initialMetaDesc = `סקירה מקיפה על ${pTitle}. בדקנו מפרט טכני, יתרונות וחסרונות, מחיר באלי אקספרס וקישור רכישה מאומת.`;
              initialGeo = `האם כדאי לקנות ${pTitle}? המוצר מציע יחס עלות-תועלת מעולה, דירוג גבוה ומחיר נגיש באלי אקספרס.`;
              initialProdIds = [foundProd.id];
            }
          }

          setPage({
            id: `page_${Date.now()}`,
            slug: initialSlug,
            type: "review",
            title: initialTitle,
            metaTitle: initialMetaTitle,
            metaDescription: initialMetaDesc,
            directAnswerGeo: initialGeo,
            contentMarkdown: initialTitle
              ? `## סקירת ${initialTitle}\n\nסקירה מפורטת אודות המוצר, ביצועים וחוות דעת...\n\n### מפרט טכני ונתונים\n\n- מחיר: נגיש ומשתלם באלי אקספרס\n- דירוג: מומלץ\n\n### יתרונות וחסרונות\n\n**יתרונות:**\n- תמורה מצוינת למחיר\n- איכות בנייה טובה\n\n**חסרונות:**\n- זמן משלוח סטנדרטי בדואר`
              : "## סקירת מוצר\n\nכתוב כאן את תוכן הסקירה, יתרונות, חסרונות והמלצות לרכישה באלי אקספרס...",
            productIds: JSON.stringify(initialProdIds),
            targetCategory: initialCategory,
            tags: initialTags,
            featuredImage: initialImage,
            status: "published",
            boughtTogetherIds: [],
            crossSellReason: "",
          });
          setSelectedProductIds(initialProdIds);
          setBoughtTogetherIds([]);
          setCrossSellReason("");
        } else if (found) {
          setPage(found);
          try {
            const parsedIds = JSON.parse(found.productIds || "[]");
            setSelectedProductIds(parsedIds);
          } catch {
            setSelectedProductIds([]);
          }
          setBoughtTogetherIds(found.boughtTogetherIds || []);
          setCrossSellReason(found.crossSellReason || "");
        }

        // 3. Load categories and tags
        const catRes = await fetch("/api/categories", { headers: getAdminHeaders() });
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
  }, [pageId, queryProductId]);

  const handleToggleProduct = (prodId: string) => {
    if (selectedProductIds.includes(prodId)) {
      setSelectedProductIds(selectedProductIds.filter((id) => id !== prodId));
    } else {
      setSelectedProductIds([...selectedProductIds, prodId]);
    }
  };

  const handleToggleBoughtTogether = (prodId: string) => {
    if (boughtTogetherIds.includes(prodId)) {
      setBoughtTogetherIds(boughtTogetherIds.filter((id) => id !== prodId));
    } else {
      setBoughtTogetherIds([...boughtTogetherIds, prodId]);
    }
  };

  const handleQuickAttach = async () => {
    const raw = quickAttachInput.trim();
    if (!raw) return;

    setIsAttaching(true);
    try {
      const match = allProducts.find(
        (p) => p.id === raw || p.aliId === raw || raw.includes(p.aliId)
      );
      if (match) {
        if (!boughtTogetherIds.includes(match.id)) {
          setBoughtTogetherIds([...boughtTogetherIds, match.id]);
        }
        setQuickAttachInput("");
        return;
      }

      const res = await fetch(`/api/search?q=${encodeURIComponent(raw)}`, {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success && data.results && data.results.length > 0) {
        const prod = data.results[0];
        const saveRes = await fetch("/api/products", {
          method: "POST",
          headers: getAdminHeaders(),
          body: JSON.stringify(prod),
        });
        const saved = await saveRes.json();
        const newId = saved.product?.id || prod.aliId;
        if (!boughtTogetherIds.includes(newId)) {
          setBoughtTogetherIds([...boughtTogetherIds, newId]);
        }
        setAllProducts((prev) => [...prev, { ...prod, id: newId }]);
        setQuickAttachInput("");
      } else {
        alert("לא נמצא מוצר מתאים לפי הקישור/מזהה שהוזן");
      }
    } catch (err) {
      console.error("Quick attach error:", err);
      alert("שגיאה בהוספת מוצר מהיר");
    } finally {
      setIsAttaching(false);
    }
  };

  const handleGenerateRonCrossSell = async () => {
    if (!page) return;
    const compTitles = allProducts
      .filter((p) => boughtTogetherIds.includes(p.id) || boughtTogetherIds.includes(p.aliId))
      .map((p) => p.titleHe || p.originalTitle);

    if (compTitles.length === 0) {
      alert("נא לבחור לפחות מוצר משלים אחד לפני ג'נרוט סיבת שילוב");
      return;
    }

    setIsGeneratingCrossSell(true);
    try {
      const res = await fetch("/api/agent/cross-sell-reason", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          mainTitle: page.title,
          complementaryTitles: compTitles,
        }),
      });
      const data = await res.json();
      if (data.success && data.reason) {
        setCrossSellReason(data.reason);
      } else {
        alert(data.error || "שגיאה ביצירת סיבת שילוב");
      }
    } catch (err) {
      console.error("Generate cross-sell error:", err);
      alert("שגיאה בפנייה לסוכן רון");
    } finally {
      setIsGeneratingCrossSell(false);
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
        boughtTogetherIds,
        crossSellReason,
      };

      const res = await fetch("/api/pages/update", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setSaveSuccess(true);
        showToast("העמוד נשמר בהצלחה ומסונכרן לענן Supabase!", "success");
        if (pageId === "new" && result.slug) {
          router.push(`/admin/pages/edit/${result.slug}`);
        }
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        await alertModal({
          title: "שגיאה בשמירת העמוד",
          message: result.error || "שגיאה בלתי צפויה בשמירת העמוד בענן Supabase",
          type: "critical",
        });
      }
    } catch (e: any) {
      await alertModal({
        title: "שגיאת תקשורת",
        message: e?.message || "שגיאת תקשורת מול שרת ה-API של האתר",
        type: "critical",
      });
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

  const publicUrl =
    page.type === "top5"
      ? `/top5/${page.slug}`
      : page.type === "deal"
      ? `/deals/${page.slug}`
      : page.type === "category"
      ? `/categories/${page.slug}`
      : `/reviews/${page.slug}`;

  const typeLabel =
    page.type === "top5"
      ? "מדריך השוואת TOP 5"
      : page.type === "deal"
      ? "דיל בזק"
      : page.type === "category"
      ? "עמוד קטגוריה"
      : page.type === "guide"
      ? "מדריך קנייה"
      : "סקירת מוצר";

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
              עריכה רטרואקטיבית | {typeLabel}
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
        <button
          onClick={() => setActiveTab("cross_sell")}
          className={`pb-3 px-4 font-bold text-xs transition-all border-b-2 flex items-center gap-1.5 ${
            activeTab === "cross_sell"
              ? "border-ali-600 text-ali-600"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5 text-ali-500" />
          <span>מוצרים משלימים (Cross-Sell) ({boughtTogetherIds.length})</span>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-800 text-xs mb-1">
                  סוג עמוד
                </label>
                <select
                  value={page.type || "review"}
                  onChange={(e) => setPage({ ...page, type: e.target.value })}
                  className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500 bg-slate-50"
                >
                  <option value="top5">מדריך השוואת TOP 5</option>
                  <option value="review">סקירת מוצר בודד</option>
                  <option value="deal">דיל בזק ומבצע</option>
                  <option value="guide">מדריך קנייה</option>
                  <option value="category">עמוד קטגוריה</option>
                </select>
              </div>

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
                  placeholder="https://... או העלה למטה"
                />
              </div>
            </div>

            {/* Cloud Media Uploader (Supabase Storage: review-assets) */}
            <div className="pt-2 border-t border-slate-100">
              <CloudMediaUploader
                label="העלאת מדיה ונכסי סקירה לענן (Supabase Storage: review-assets)"
                currentUrl={page.featuredImage}
                onUploadComplete={(url, alt) => {
                  setPage((prev) => (prev ? { ...prev, featuredImage: url } : null));
                  showToast("התמונה הועלתה בהצלחה ל-Supabase Storage והוגדרה כתמונה ראשית!", "success");
                }}
                productContext={{
                  title: page.title,
                  category: page.targetCategory,
                  specs: page.directAnswerGeo,
                }}
              />
              <div className="flex items-center gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (page.featuredImage) {
                      const imageMd = `\n\n![${page.title}](${page.featuredImage})\n\n`;
                      setPage((prev) =>
                        prev ? { ...prev, contentMarkdown: prev.contentMarkdown + imageMd } : null
                      );
                      showToast("התמונה שובצה בהצלחה בסוף גוף המאמר!", "success");
                    } else {
                      showToast("טרם הועלתה או הוגדרה תמונה ראשית", "warning");
                    }
                  }}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all"
                >
                  + שבץ תמונה נוכחית בגוף המאמר (Markdown)
                </button>
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

        {/* TAB 4: Frequently Bought Together (Cross-Sell Engine) */}
        {activeTab === "cross_sell" && (
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="pb-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-ali-600 text-xs font-bold uppercase tracking-wider">
                  <ShoppingCart className="w-4 h-4" />
                  הגדלת סל קניות וערך עסקה ממוצע (AOV)
                </div>
                <h3 className="font-black text-base text-slate-900 mt-1">
                  צימוד מוצרים משלימים (Frequently Bought Together)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  מוצרים אלו יוצגו בתחתית הסקירה עם אפשרות לרכישה בודדת (sub_id=cross_sell_item) או רכישת החבילה כולה (sub_id=cross_sell_bundle).
                </p>
              </div>

              {/* Quick Attach via URL or ID */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={quickAttachInput}
                  onChange={(e) => setQuickAttachInput(e.target.value)}
                  placeholder="הדבק URL או מזהה מוצר מאלי אקספרס..."
                  className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 w-64 outline-none focus:border-ali-500"
                />
                <button
                  type="button"
                  onClick={handleQuickAttach}
                  disabled={isAttaching || !quickAttachInput.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isAttaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>הוסף מהיר</span>
                </button>
              </div>
            </div>

            {/* Currently Attached Complementary Products */}
            <div>
              <h4 className="font-bold text-xs text-slate-800 mb-2">
                מוצרים משלימים שנבחרו לחבילה ({boughtTogetherIds.length}):
              </h4>
              {boughtTogetherIds.length === 0 ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs text-center">
                  לא נבחרו עדיין מוצרים משלימים. סמנו מוצרים מהקטלוג למטה או הדביקו קישור/ID להוספה מהירה.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {boughtTogetherIds.map((id) => {
                    const prod = allProducts.find((p) => p.id === id || p.aliId === id);
                    return (
                      <div
                        key={id}
                        className="p-3 rounded-2xl border border-ali-200 bg-ali-50/30 flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 p-1">
                            {prod?.mainImage ? (
                              <img src={prod.mainImage} alt="" className="w-full h-full object-contain" />
                            ) : (
                              <Package className="w-4 h-4 text-slate-400" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {prod?.titleHe || prod?.originalTitle || `מוצר #${id}`}
                            </div>
                            <div className="text-[11px] font-semibold text-slate-600">
                              {prod?.priceUsd ? `$${prod.priceUsd}` : ""}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleBoughtTogether(id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="הסר מהחבילה"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ron Cross-Sell Reason Section */}
            <div className="p-5 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-bold text-indigo-950">
                    הנמקת שילוב משכנעת ע&quot;י סוכן התוכן וה-SEO &quot;רון&quot;
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleGenerateRonCrossSell}
                  disabled={isGeneratingCrossSell || boughtTogetherIds.length === 0}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
                >
                  {isGeneratingCrossSell ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>ג&apos;נרט סיבת שילוב עם רון (AI)</span>
                </button>
              </div>

              <textarea
                rows={2}
                value={crossSellReason}
                onChange={(e) => setCrossSellReason(e.target.value)}
                placeholder="למשל: השילוב של מקרן נייד עם מסך הקרנה מתקפל 100 אינץ' מעניק חוויית קולנוע מלאה בכל מקום..."
                className="w-full p-3 rounded-xl bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 text-xs text-slate-800 outline-none resize-none leading-relaxed"
              />
            </div>

            {/* Catalog Products Selector Grid */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-800">
                בחר מוצרים משלימים מתוך המאגר המרכזי:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[350px] overflow-y-auto p-1">
                {allProducts.map((prod) => {
                  const isChecked = boughtTogetherIds.includes(prod.id) || boughtTogetherIds.includes(prod.aliId);
                  return (
                    <div
                      key={prod.id}
                      onClick={() => handleToggleBoughtTogether(prod.id)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                        isChecked
                          ? "bg-ali-50/60 border-ali-500 shadow-sm"
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div className="w-10 h-10 bg-white rounded-xl overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center p-1">
                        {prod.mainImage ? (
                          <img src={prod.mainImage} alt="" className="w-full h-full object-contain" />
                        ) : (
                          <Package className="w-4 h-4 text-slate-400" />
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
                              isChecked ? "bg-ali-600 text-white" : "border border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

export default function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <Suspense
      fallback={
        <div className="py-24 text-center text-slate-400" dir="rtl">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-2 text-indigo-500" />
          <p className="text-sm font-bold">טוען עורך עמודים...</p>
        </div>
      }
    >
      <EditPageContent pageId={resolvedParams.id} />
    </Suspense>
  );
}
