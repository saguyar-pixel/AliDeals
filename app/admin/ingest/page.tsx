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
} from "lucide-react";

interface ProductPreview {
  id: string;
  aliId: string;
  originalTitle: string;
  priceUsd: number;
  priceIls: number;
  rating: number;
  ordersCount: number;
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
  const [searchMaxPrice, setSearchMaxPrice] = useState(74.99);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

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

  // Search products via official AliExpress API
  const handleSearchProducts = async () => {
    if (!searchQuery.trim()) {
      setErrorMsg("נא להזין מילת חיפוש באנגלית או עברית (למשל: baby monitor, mini projector)");
      return;
    }
    setErrorMsg(null);
    setIsSearching(true);
    setSearchResults([]);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery.trim())}&maxPrice=${searchMaxPrice}`
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בחיפוש מוצרים ב-API");
      }
      setSearchResults(data.results || []);
      if (!data.results || data.results.length === 0) {
        setErrorMsg("לא נמצאו מוצרים תואמים לרף זה. נסה להרחיב את מילות החיפוש.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה בחיפוש מוצרים";
      setErrorMsg(msg);
    } finally {
      setIsSearching(false);
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
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="הזן מוצר לחיפוש (למשל: baby monitor, smart projector, wireless earbuds)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearchProducts()}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ali-500"
                />
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-600">
                    <span>עד $</span>
                    <input
                      type="number"
                      value={searchMaxPrice}
                      onChange={(e) => setSearchMaxPrice(parseFloat(e.target.value) || 75)}
                      className="w-14 bg-transparent font-bold text-slate-900 focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSearchProducts}
                    disabled={isSearching}
                    className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-sm shrink-0 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {isSearching ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>מחפש ב-API...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>חפש מוצרים</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Search Results Grid */}
              {searchResults.length > 0 && (
                <div className="pt-3 space-y-2">
                  <span className="text-xs font-bold text-slate-600">
                    נמצאו {searchResults.length} מוצרים מובילים באלי אקספרס (פטורים ממכס):
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto p-1">
                    {searchResults.map((item) => (
                      <div
                        key={item.aliId}
                        onClick={() => handleSelectSearchResult(item)}
                        className="group p-3 rounded-2xl border border-slate-200 hover:border-ali-500 hover:bg-ali-50/30 transition-all cursor-pointer flex flex-col justify-between space-y-2 bg-white"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                            <Image
                              src={item.mainImage}
                              alt={item.originalTitle}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h5 className="font-semibold text-xs text-slate-900 truncate" title={item.originalTitle}>
                              {item.originalTitle}
                            </h5>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                              <span className="font-bold text-slate-900">₪{item.priceIls}</span>
                              <span>(${item.priceUsd})</span>
                              <span>•</span>
                              <span>⭐ {item.rating}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {item.ordersCount}+ הזמנות
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSearchResult(item);
                          }}
                          className="w-full py-1.5 rounded-lg bg-slate-900 group-hover:bg-ali-600 text-white text-[11px] font-bold transition-colors"
                        >
                          בחר מוצר זה ליצירת סקירה ←
                        </button>
                      </div>
                    ))}
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
