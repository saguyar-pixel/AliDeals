"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Search,
  CheckCircle2,
  FileText,
  ExternalLink,
  Loader2,
  Layers,
  Flame,
  Star,
  ShieldCheck,
  AlertCircle,
  GitBranch,
  Store,
  Check,
  PackagePlus,
  RefreshCw,
} from "lucide-react";
import { CustomsBadge } from "@/components/admin/CustomsBadge";

interface ProductPreview {
  id: string;
  aliId: string;
  originalTitle: string;
  priceUsd: number;
  priceIls: number;
  rating: number;
  ordersCount: number;
  storeName?: string;
  sellerPositiveRate?: string;
  mainImage: string;
  aliUrl: string;
  commissionRate?: number;
}

interface GeneratedPageDraft {
  slug: string;
  type: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  directAnswerGeo: string;
  contentMarkdown: string;
  infographicSvg?: string;
  structuredDataJson?: string;
  targetCategory: string;
}

export default function AdminIngestPage() {
  const [ingestMode, setIngestMode] = useState<"search" | "url">("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");
  const [searchSortBy, setSearchSortBy] = useState("LAST_VOLUME_DESC");
  const [searchMaxPrice, setSearchMaxPrice] = useState(74.99);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedAliIds, setSelectedAliIds] = useState<string[]>([]);
  const [isTestingApi, setIsTestingApi] = useState(false);
  const [apiTestResult, setApiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);
  const [saveCatalogSuccess, setSaveCatalogSuccess] = useState<string | null>(null);

  const [urlInput, setUrlInput] = useState("");
  const [pageType, setPageType] = useState<"review" | "top5" | "deal">("review");
  const [category, setCategory] = useState("אלקטרוניקה וגאדג'טים");

  const [isLoadingFetch, setIsLoadingFetch] = useState(false);
  const [productData, setProductData] = useState<ProductPreview | null>(null);

  const [isLoadingGenerate, setIsLoadingGenerate] = useState(false);
  const [pageDraft, setPageDraft] = useState<GeneratedPageDraft | null>(null);

  const [autoGitPush, setAutoGitPush] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [gitStatusMsg, setGitStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Health check test for AliExpress API
  const handleTestApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await fetch("/api/aliexpress/test");
      const data = await res.json();
      setApiTestResult({
        success: Boolean(data.success),
        message: data.message || (data.success ? "החיבור ל-AliExpress API תקין!" : "שגיאה בבדיקת חיבור"),
      });
    } catch {
      setApiTestResult({
        success: false,
        message: "שגיאת רשת בבדיקת חיבור מול השרת",
      });
    } finally {
      setIsTestingApi(false);
    }
  };

  // Search products via official AliExpress API
  const handleSearchProducts = async () => {
    if (!searchQuery.trim()) {
      setErrorMsg("נא להזין מילת חיפוש באנגלית או עברית (למשל: baby monitor, mini projector)");
      return;
    }
    setErrorMsg(null);
    setIsSearching(true);
    setSearchResults([]);
    setSelectedAliIds([]);
    setSaveCatalogSuccess(null);

    try {
      const categoryParam = searchCategory !== "all" ? `&categoryId=${encodeURIComponent(searchCategory)}` : "";
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}&maxPrice=${searchMaxPrice}&sortBy=${searchSortBy}${categoryParam}`
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בחיפוש מוצרים ב-API");
      }
      setSearchResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        setErrorMsg(data.errorDetails || "לא נמצאו מוצרים תואמים לרף זה. נסה להרחיב את מילות החיפוש או לבדוק קטגוריה.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה בחיפוש מוצרים";
      setErrorMsg(msg);
    } finally {
      setIsSearching(false);
    }
  };

  const handleToggleSelectProduct = (aliId: string) => {
    setSelectedAliIds((prev) =>
      prev.includes(aliId) ? prev.filter((id) => id !== aliId) : [...prev, aliId]
    );
  };

  const handleSelectAll = () => {
    if (selectedAliIds.length === searchResults.length) {
      setSelectedAliIds([]);
    } else {
      setSelectedAliIds(searchResults.map((item) => item.aliId));
    }
  };

  const handleSaveSelectedToCatalog = async () => {
    const selectedItems = searchResults.filter((item) => selectedAliIds.includes(item.aliId));
    if (selectedItems.length === 0) return;

    setIsSavingCatalog(true);
    setSaveCatalogSuccess(null);
    let count = 0;

    try {
      for (const item of selectedItems) {
        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aliId: item.aliId,
            originalTitle: item.originalTitle,
            titleHe: item.originalTitle,
            priceUsd: item.priceUsd,
            priceIls: item.priceIls,
            rating: item.rating,
            ordersCount: item.ordersCount,
            mainImage: item.mainImage,
            galleryImages: item.galleryImages || [item.mainImage],
            aliUrl: item.aliUrl,
            affiliateUrl: item.affiliateUrl || item.aliUrl,
            category: category,
            storeName: item.storeName || "AliExpress Official",
            sellerPositiveRate: item.sellerPositiveRate || "98%",
          }),
        });
        count++;
      }
      setSaveCatalogSuccess(`${count} מוצרים נשמרו בהצלחה למאגר המוצרים המרכזי!`);
      setSelectedAliIds([]);
    } catch (err: any) {
      setErrorMsg(err.message || "שגיאה בשמירת מוצרים למאגר");
    } finally {
      setIsSavingCatalog(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    setUrlInput(item.aliUrl || `https://www.aliexpress.com/item/${item.aliId}.html`);
    setProductData({
      id: `prod_${item.aliId}`,
      aliId: item.aliId,
      originalTitle: item.originalTitle,
      priceUsd: item.priceUsd,
      priceIls: item.priceIls,
      rating: item.rating,
      ordersCount: item.ordersCount,
      mainImage: item.mainImage,
      aliUrl: item.aliUrl,
      commissionRate: item.commissionRate,
    });
  };

  // Step 1: Ingest product from AliExpress
  const handleFetchProduct = async () => {
    if (!urlInput.trim()) {
      setErrorMsg("נא להזין קישור למוצר מעלי אקספרס או מזהה פריט");
      return;
    }

    setErrorMsg(null);
    setIsLoadingFetch(true);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urlOrId: urlInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בשליפת נתוני המוצר");
      }

      setProductData(data.product);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה בלתי צפויה בשליפה";
      setErrorMsg(msg);
    } finally {
      setIsLoadingFetch(false);
    }
  };

  // Step 2: Trigger Gemini Content & Infographic Generator
  const handleGenerateContent = async () => {
    if (!productData) return;

    setErrorMsg(null);
    setIsLoadingGenerate(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageType,
          productId: productData.id,
          categoryName: category,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בג'ינרוט תוכן ב-Gemini");
      }

      setPageDraft(data.pageDraft);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה בג'ינרוט ה-AI";
      setErrorMsg(msg);
    } finally {
      setIsLoadingGenerate(false);
    }
  };

  // Step 3: Save and Publish Page (with Auto Git Push)
  const handlePublishPage = async () => {
    if (!pageDraft) return;

    setErrorMsg(null);
    setIsPublishing(true);

    try {
      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...pageDraft,
          featuredImage: productData?.mainImage,
          productIds: productData ? [productData.aliId] : [],
          autoPush: autoGitPush,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בשמירת העמוד");
      }

      setPublishedUrl(`/${pageDraft.type === "top5" ? "top5" : "reviews"}/${pageDraft.slug}`);
      if (data.gitMessage) {
        setGitStatusMsg(data.gitMessage);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה בפרסום";
      setErrorMsg(msg);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20">
      {/* Header */}
      <div>
        <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">סטודיו ה-AI של AliDeals</span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
          הזנת מוצר וג&apos;נרוט תוכן אוטומטי
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          הזן קישור מאלי אקספרס, בחר את סוג העמוד, ותן ל-Gemini להפיק סקירה, אינפוגרפיקה וסכמות עם פרסום ודחיפה ישירה ל-GitHub.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Step 1: Input & Configuration Card */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-ali-500 text-white flex items-center justify-center font-bold text-sm">
            1
          </div>
          <h2 className="font-bold text-base text-slate-900">הגדרת מקור וסוג העמוד לג&apos;נרוט</h2>
        </div>

        {/* Page Type Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">בחר את סוג העמוד הרצוי:</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setPageType("review")}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-2 ${
                pageType === "review"
                  ? "border-ali-500 bg-ali-50/50 ring-2 ring-ali-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <FileText className={`w-5 h-5 ${pageType === "review" ? "text-ali-600" : "text-slate-400"}`} />
                {pageType === "review" && <CheckCircle2 className="w-4 h-4 text-ali-600" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">סקירת מוצר מעמיקה</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">סקירת יחיד, בדיקת מפרט, שקע EU ופטור ממכס</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPageType("top5")}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-2 ${
                pageType === "top5"
                  ? "border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <Layers className={`w-5 h-5 ${pageType === "top5" ? "text-indigo-600" : "text-slate-400"}`} />
                {pageType === "top5" && <CheckCircle2 className="w-4 h-4 text-indigo-600" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">השוואת TOP 5 מומלצים</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">טבלת השוואה מדורגת, תמורה לכסף ובחירת העורכים</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setPageType("deal")}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between space-y-2 ${
                pageType === "deal"
                  ? "border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <Flame className={`w-5 h-5 ${pageType === "deal" ? "text-amber-500" : "text-slate-400"}`} />
                {pageType === "deal" && <CheckCircle2 className="w-4 h-4 text-amber-500" />}
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">דיל בזק / דף ארביטראז&apos;</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">דף נחיתה מהיר עם דחיפות וקופונים לקמפיינים ממומנים</p>
              </div>
            </button>
          </div>
        </div>

        {/* Category Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700">קטגוריה באתר:</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500"
          >
            <option value="אלקטרוניקה וגאדג'טים">אלקטרוניקה וגאדג&apos;טים</option>
            <option value="לבית ולמטבח">לבית ולמטבח</option>
            <option value="ציוד ואביזרים לרכב">ציוד ואביזרים לרכב</option>
            <option value="אודיו ואוזניות">אודיו ואוזניות</option>
            <option value="כלי עבודה ועשה זאת בעצמך">כלי עבודה ועשה זאת בעצמך</option>
          </select>
        </div>

        {/* Ingest Mode Toggle & Inputs */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <button
              type="button"
              onClick={() => setIngestMode("search")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                ingestMode === "search"
                  ? "bg-ali-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>חיפוש אוטומטי ב-AliExpress API</span>
            </button>
            <button
              type="button"
              onClick={() => setIngestMode("url")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                ingestMode === "url"
                  ? "bg-ali-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>הזנת קישור ישיר או מזהה</span>
            </button>
          </div>

          {ingestMode === "search" ? (
            <div className="space-y-4">
              {/* Search Inputs & Filters Grid */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="הזן מילת חיפוש (למשל: baby monitor, mini projector, wireless earbuds)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearchProducts()}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ali-500 font-medium"
                  />

                  <button
                    type="button"
                    onClick={handleSearchProducts}
                    disabled={isSearching}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-sm shrink-0 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>מחפש ב-API...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>חפש מוצרים ב-API</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Categories & Sorting Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200 text-xs">
                  {/* Category Filter */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">קטגוריית מוצרים (AliExpress Category):</label>
                    <select
                      value={searchCategory}
                      onChange={(e) => setSearchCategory(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500"
                    >
                      <option value="all">🌐 כל הקטגוריות (חיפוש כללי)</option>
                      <option value="44">🔌 אלקטרוניקה וגאדג&apos;טים (Consumer Electronics)</option>
                      <option value="7">💻 מחשבים, ציוד משרדי וגיימינג (Computer & Office)</option>
                      <option value="509">📱 טלפונים, שעונים חכמים וטאבלטים (Phones & Telecom)</option>
                      <option value="15">🏠 לבית, למטבח ולגינה (Home & Garden)</option>
                      <option value="6">🍳 מוצרי חשמל לבית (Home Appliances)</option>
                      <option value="34">🚗 רכב, אלקטרוניקה וציוד (Automobiles)</option>
                      <option value="18">⚽ ספורט, כושר ומחנאות (Sports & Outdoors)</option>
                      <option value="1420">🛠️ כלי עבודה ושיפוץ הבית (Tools)</option>
                      <option value="1501">👶 מוצרי תינוקות, ילדים וצעצועים (Mother & Kids)</option>
                      <option value="26">🎮 צעצועים ותחביבים (Toys & Hobbies)</option>
                      <option value="1511">⌚ שעונים ותכשיטים (Watches & Jewelry)</option>
                      <option value="66">💄 בריאות, טיפוח וביוטי (Beauty & Health)</option>
                      <option value="30">🔒 אבטחה, מצלמות ובטיחות ביתית (Security)</option>
                      <option value="100003070">👔 אופנת גברים (Men&apos;s Clothing)</option>
                      <option value="100003109">👗 אופנת נשים (Women&apos;s Clothing)</option>
                    </select>
                  </div>

                  {/* Sort By Filter */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">סינון ודירוג תוצאות:</label>
                    <select
                      value={searchSortBy}
                      onChange={(e) => setSearchSortBy(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500"
                    >
                      <option value="LAST_VOLUME_DESC">🔥 כמות הזמנות ומכירות (Volume)</option>
                      <option value="EVALUATE_RATE_DESC">⭐ דירוג גולשים הגבוה ביותר (Rating)</option>
                      <option value="SALE_PRICE_ASC">💰 מחיר: מהנמוך לגבוה (Price Asc)</option>
                      <option value="SALE_PRICE_DESC">💎 מחיר: מהגבוה לנמוך (Price Desc)</option>
                    </select>
                  </div>

                  {/* Max Price & Customs Filter */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700 flex items-center justify-between">
                      <span>תקרת מחיר למוצר (USD):</span>
                      <span className="text-[10px] text-emerald-600 font-bold">רף פטור מכס: $75</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <div className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white flex-1">
                        <span className="text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.5"
                          value={searchMaxPrice}
                          onChange={(e) => setSearchMaxPrice(parseFloat(e.target.value) || 75)}
                          className="w-full bg-transparent font-bold text-slate-900 focus:outline-none text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSearchMaxPrice(73.0)}
                        className="px-2 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-[10px] font-bold border border-emerald-200"
                        title="מרווח ביטחון 2$ (עד 73$)"
                      >
                        סף בטוח $73
                      </button>
                    </div>
                  </div>
                </div>

                {/* API Health Check Quick Button */}
                <div className="pt-2 flex items-center justify-between text-xs border-t border-slate-200/80">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestApi}
                      disabled={isTestingApi}
                      className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-ali-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200 transition-colors"
                    >
                      <RefreshCw className={`w-3 h-3 ${isTestingApi ? "animate-spin" : ""}`} />
                      <span>בדוק תקינות חיבור ל-AliExpress API</span>
                    </button>
                    {apiTestResult && (
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          apiTestResult.success
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {apiTestResult.message}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">AliExpress Open Platform v2.0</span>
                </div>
              </div>

              {/* Bulk Actions Bar if items selected */}
              {selectedAliIds.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                    <span>נבחרו {selectedAliIds.length} מוצרים מהתוצאות</span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleSaveSelectedToCatalog}
                      disabled={isSavingCatalog}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-50"
                    >
                      {isSavingCatalog ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <PackagePlus className="w-3.5 h-3.5" />
                      )}
                      <span>שמור {selectedAliIds.length} מוצרים לקטלוג המרכזי</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setPageType("top5");
                        const first = searchResults.find((i) => i.aliId === selectedAliIds[0]);
                        if (first) handleSelectSearchResult(first);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm"
                    >
                      צור השוואת TOP 5 ממוצרים אלו ←
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedAliIds([])}
                      className="px-2.5 py-1.5 rounded-xl text-slate-600 hover:bg-indigo-100 text-xs font-medium transition-colors"
                    >
                      בטל בחירה
                    </button>
                  </div>
                </div>
              )}

              {saveCatalogSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{saveCatalogSuccess}</span>
                  <Link href="/admin/products" className="mr-auto underline text-emerald-900">
                    צפה בקטלוג המוצרים ←
                  </Link>
                </div>
              )}

              {/* Search Results Grid */}
              {searchResults.length > 0 && (
                <div className="pt-2 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">
                      נמצאו {searchResults.length} מוצרים ב-API:
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs font-bold text-ali-600 hover:text-ali-700 underline"
                    >
                      {selectedAliIds.length === searchResults.length ? "בטל בחירת הכל" : "בחר את כל התוצאות"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[550px] overflow-y-auto p-1">
                    {searchResults.map((item) => {
                      const isChecked = selectedAliIds.includes(item.aliId);

                      return (
                        <div
                          key={item.aliId}
                          className={`relative p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-white ${
                            isChecked
                              ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20"
                              : "border-slate-200 hover:border-ali-400 hover:shadow-md"
                          }`}
                        >
                          {/* Top Checkbox & Store Details */}
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleSelectProduct(item.aliId)}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                              <span className="text-[10px] font-bold text-slate-600">בחר</span>
                            </label>

                            {/* Store Name & Positive Rate */}
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 max-w-[170px] truncate" title={item.storeName}>
                              <Store className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">{item.storeName || "מוכר מורשה"}</span>
                              {item.sellerPositiveRate && (
                                <span className="text-emerald-700 font-bold bg-emerald-50 px-1 py-0.2 rounded shrink-0">
                                  {item.sellerPositiveRate}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Image & Title */}
                          <div className="flex items-center gap-3">
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                              <Image
                                src={item.mainImage}
                                alt={item.originalTitle}
                                fill
                                className="object-cover"
                                sizes="80px"
                              />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <h5 className="font-semibold text-xs text-slate-900 line-clamp-2 leading-snug" title={item.originalTitle}>
                                {item.originalTitle}
                              </h5>
                              <div className="flex items-baseline gap-1.5">
                                <span className="font-black text-slate-900 text-sm">₪{item.priceIls}</span>
                                <span className="text-xs text-slate-500 font-semibold">(${item.priceUsd})</span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  <span>{item.rating}</span>
                                </span>
                                <span>•</span>
                                <span className="text-slate-600 font-medium">{item.ordersCount}+ מכירות</span>
                              </div>
                            </div>
                          </div>

                          {/* Customs Badge & 2$ Safety Alert */}
                          <div>
                            <CustomsBadge priceUsd={item.priceUsd} showDetails={false} />
                          </div>

                          {/* Select for deep review button */}
                          <button
                            type="button"
                            onClick={() => handleSelectSearchResult(item)}
                            className="w-full py-2 rounded-xl bg-slate-900 hover:bg-ali-600 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <span>בחר מוצר זה ליצירת סקירה</span>
                            <span>←</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="https://www.aliexpress.com/item/1005006392019482.html או קישור מקוצר..."
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ali-500"
              />
              <button
                type="button"
                onClick={handleFetchProduct}
                disabled={isLoadingFetch}
                className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shrink-0 transition-all disabled:opacity-50"
              >
                {isLoadingFetch ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>שולף נתונים...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>שלוף נתוני מוצר</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Step 2: Product Preview Card */}
      {productData && (
        <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h2 className="font-bold text-base text-slate-900">נתוני המוצר שנאספו מאלי אקספרס</h2>
          </div>

          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative w-32 h-32 rounded-2xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
              <Image
                src={productData.mainImage}
                alt={productData.originalTitle}
                fill
                className="object-cover"
                sizes="128px"
              />
            </div>

            <div className="space-y-3 flex-1 min-w-0">
              <h3 className="font-bold text-base text-slate-900 leading-snug">{productData.originalTitle}</h3>

              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-baseline gap-1">
                  <span className="font-black text-slate-900 text-lg">₪{productData.priceIls}</span>
                  <span className="text-slate-500 font-semibold">(${productData.priceUsd})</span>
                </div>

                <div className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-3.5 h-3.5 fill-amber-400" />
                  <span>{productData.rating}</span>
                  <span className="text-slate-400 font-normal">({productData.ordersCount}+ הזמנות)</span>
                </div>

                <div className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-1 rounded font-semibold border border-emerald-100">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>{productData.priceUsd < 75 ? "פטור ממכס ומע\"מ" : "חייב במע\"מ"}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateContent}
                  disabled={isLoadingGenerate}
                  className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-sm shadow-md shadow-ali-500/20 transition-all disabled:opacity-50"
                >
                  {isLoadingGenerate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Gemini מחבר תוכן, סכמות ואינפוגרפיקה...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>ג&apos;נרט תוכן ואינפוגרפיקה ב-Gemini AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Step 3: Generated Draft & Live Editor */}
      {pageDraft && (
        <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="font-bold text-base text-slate-900">טיוטת העמוד שנוצרה ב-Gemini (עריכה ופרסום)</h2>
            </div>
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-200">
              מוכן לפרסום
            </span>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">כותרת ראשית (H1 ממוקד SEO):</label>
              <input
                type="text"
                value={pageDraft.title}
                onChange={(e) => setPageDraft({ ...pageDraft, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">נתיב URL (Slug):</label>
              <input
                type="text"
                value={pageDraft.slug}
                onChange={(e) => setPageDraft({ ...pageDraft, slug: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-slate-50"
              />
            </div>

            {/* GEO Direct Answer */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>פסקת השורה התחתונה (Direct Answer עבור מנועי GEO ו-AI Search):</span>
              </label>
              <textarea
                rows={3}
                value={pageDraft.directAnswerGeo}
                onChange={(e) => setPageDraft({ ...pageDraft, directAnswerGeo: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 text-xs font-medium text-slate-800 leading-relaxed"
              />
            </div>

            {/* Content Markdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">תוכן המאמר המלא (Markdown):</label>
              <textarea
                rows={10}
                value={pageDraft.contentMarkdown}
                onChange={(e) => setPageDraft({ ...pageDraft, contentMarkdown: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed"
              />
            </div>

            {/* Infographic Preview */}
            {pageDraft.infographicSvg && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700">תצוגה מקדימה של האינפוגרפיקה בעברית:</label>
                <div
                  className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-950 p-4 max-h-80"
                  dangerouslySetInnerHTML={{ __html: pageDraft.infographicSvg }}
                />
              </div>
            )}
          </div>

          {/* Git Auto-Push Toggle */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-emerald-600" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-900">דחיפה אוטומטית ל-GitHub (Auto Git Push)</span>
                <span className="text-[11px] text-slate-500">מבצע git commit ו-push באופן מיידי ומפעיל את ה-Deploy בענן</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={autoGitPush}
                onChange={(e) => setAutoGitPush(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Publish Action Button */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={handlePublishPage}
              disabled={isPublishing}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-base shadow-lg transition-all disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>שומר ודוחף ל-GitHub...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>שמור ופרסם עמוד לאתר עכשיו</span>
                </>
              )}
            </button>

            {publishedUrl && (
              <div className="flex flex-col sm:flex-row items-center gap-3">
                {gitStatusMsg && (
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                    {gitStatusMsg}
                  </span>
                )}
                <Link
                  href={publishedUrl}
                  target="_blank"
                  className="flex items-center gap-1.5 text-xs font-bold text-ali-600 hover:text-ali-700 bg-ali-50 px-4 py-2.5 rounded-xl border border-ali-200 transition-colors"
                >
                  <span>צפה בעמוד החי!</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
