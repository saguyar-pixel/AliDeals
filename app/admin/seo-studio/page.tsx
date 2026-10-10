"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Feather,
  Sparkles,
  Search,
  BookOpen,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Tag,
  Clock,
  Layers,
  HelpCircle,
  Save,
  Send,
  RefreshCw,
  Eye,
  Edit3,
  Flame,
  Check,
  Share2,
  Copy,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  ShieldCheck,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import MarkdownContent from "@/components/MarkdownContent";
import ProsConsBox from "@/components/ProsConsBox";
import FaqAccordion from "@/components/FaqAccordion";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";
import {
  POPULAR_ISRAELI_ALIEXPRESS_TOPICS,
  type RonKeywordResearch,
  type RonSeoArticleOutput,
} from "@/lib/agent/ron-seo-types";

export default function RonSeoStudioPage() {
  // Input form state
  const [topic, setTopic] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [category, setCategory] = useState("מדריכי קנייה וצרכנות");
  const [targetAudience, setTargetAudience] = useState("קונים ישראלים באלי אקספרס ומחפשי דילים ברשת");
  const [customInstructions, setCustomInstructions] = useState("");

  // Workflow steps: 1 = Define, 2 = Research, 3 = Article
  const [activeStep, setActiveStep] = useState<1 | 2 | 3>(1);

  // Loading states
  const [isResearching, setIsResearching] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Data states
  const [researchData, setResearchData] = useState<RonKeywordResearch | null>(null);
  const [articleData, setArticleData] = useState<RonSeoArticleOutput | null>(null);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);

  // UI feedback
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [previewTab, setPreviewTab] = useState<"preview" | "markdown" | "lsi" | "faqs" | "proscons" | "specs">("preview");
  const [copiedSlug, setCopiedSlug] = useState(false);

  // Load recent articles and popular topics on mount
  useEffect(() => {
    fetchInitData();
  }, []);

  const fetchInitData = async () => {
    try {
      const res = await fetch("/api/agent/ron/seo-article");
      const data = await res.json();
      if (data.recentArticles) {
        setRecentArticles(data.recentArticles);
      }
    } catch (e) {
      console.warn("Failed fetching recent articles:", e);
    }
  };

  // Step 1: Run Keyword & LSI Research
  const handleRunResearch = async () => {
    if (!topic.trim()) {
      setErrorMsg("נא להזין נושא או מונח חיפוש למחקר");
      return;
    }

    setErrorMsg(null);
    setIsResearching(true);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/agent/ron/seo-article", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: "research",
          topic: topic.trim(),
          category,
          targetAudience,
          customInstructions,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה במחקר מילות מפתח");
      }

      setResearchData(data.research);
      setFocusKeyword(data.research.primaryKeyword || topic.trim());
      setActiveStep(2);
      setSuccessMsg(`מחקר המונחים הושלם! אותרו ${data.research.lsiKeywords?.length || 0} מונחי LSI ו-${data.research.peopleAlsoAsk?.length || 0} שאלות גולשים.`);
    } catch (err: any) {
      setErrorMsg(err.message || "שגיאה במחקר מילות מפתח");
    } finally {
      setIsResearching(false);
    }
  };

  // Step 2: Generate Full Article with LSI Weaving
  const handleGenerateArticle = async () => {
    if (!topic.trim()) {
      setErrorMsg("נא להזין נושא למאמר");
      return;
    }

    setErrorMsg(null);
    setIsGenerating(true);
    setSuccessMsg(null);

    try {
      const res = await fetch("/api/agent/ron/seo-article", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: "generate",
          topic: topic.trim(),
          focusKeyword: focusKeyword || topic.trim(),
          category,
          targetAudience,
          customInstructions,
          existingResearch: researchData || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בכתיבת המאמר");
      }

      setArticleData(data.article);
      setActiveStep(3);
      setSuccessMsg(`המאמר נכתב בהצלחה! נשזרו ${data.article.lsiKeywordsWeaved?.length || 0} מונחי LSI בהתאמה לקורא הישראלי.`);
    } catch (err: any) {
      setErrorMsg(err.message || "שגיאה ביצירת המאמר");
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 3: Publish Article to Site
  const handlePublish = async (status: "published" | "draft" = "published") => {
    if (!articleData) return;

    setErrorMsg(null);
    setIsPublishing(true);

    try {
      const res = await fetch("/api/agent/ron/seo-article", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          action: "publish",
          article: articleData,
          status,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בפרסום המאמר");
      }

      setPublishedUrl(data.publicUrl);
      if (data.slug) {
        setArticleData((prev) => (prev ? { ...prev, slug: data.slug, pageId: data.pageId } : prev));
      }
      setSuccessMsg(
        status === "published"
          ? `🎉 המאמר פורסם בהצלחה באתר וזמין כעת בכתובת ${data.publicUrl}!`
          : "המאמר נשמר כטיוטה ב-CMS בהצלחה."
      );
      fetchInitData();
    } catch (err: any) {
      setErrorMsg(err.message || "שגיאה בפרסום המאמר");
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSelectPopularTopic = (item: (typeof POPULAR_ISRAELI_ALIEXPRESS_TOPICS)[0]) => {
    setTopic(item.topic);
    setFocusKeyword(item.focusKeyword);
    setCategory(item.category);
    setActiveStep(1);
    setResearchData(null);
    setArticleData(null);
    setErrorMsg(null);
    setSuccessMsg(null);
    setPublishedUrl(null);
  };

  const handleCopySlug = () => {
    if (!articleData?.slug) return;
    const full = `${window.location.origin}/articles/${articleData.slug}`;
    navigator.clipboard.writeText(full);
    setCopiedSlug(true);
    setTimeout(() => setCopiedSlug(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Top Breadcrumb & Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/admin" className="hover:text-indigo-600 transition-colors">
              ניהול
            </Link>
            <span>/</span>
            <Link href="/admin/pages" className="hover:text-indigo-600 transition-colors">
              עמודים ומאמרים
            </Link>
            <span>/</span>
            <span className="text-slate-800 font-bold">סטודיו SEO עם רוֹן</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 shadow-sm">
              <Feather className="w-5 h-5" />
            </div>
            <span>סטודיו מאמרי SEO ואסטרטגיית תוכן</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            הסוכן רוֹן חוקר מונחי חיפוש, מחלץ מילות מפתח סמנטיות (LSI), בונה היררכיית תוכן ושודד מונחים במאמרי עומק מותאמים ל-Google AI Overviews ולצרכן הישראלי.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages"
            className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors shadow-sm"
          >
            חזרה לניהול עמודים
          </Link>
          <Link
            href="/admin/agent-team"
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shadow-sm shadow-indigo-600/20 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>חמ&quot;ל הסוכנים המלא</span>
          </Link>
        </div>
      </div>

      {/* Workflow Step Indicator */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          onClick={() => setActiveStep(1)}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center gap-3 ${
            activeStep === 1
              ? "bg-amber-50 border-amber-300 shadow-sm"
              : "bg-white border-slate-200 hover:border-slate-300"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
              activeStep === 1 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            1
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900">הגדרת נושא & בריף</div>
            <div className="text-[11px] text-slate-500">בחירת מונח ראשי וכוונת חיפוש</div>
          </div>
        </button>

        <button
          onClick={() => researchData && setActiveStep(2)}
          disabled={!researchData}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center gap-3 ${
            activeStep === 2
              ? "bg-amber-50 border-amber-300 shadow-sm"
              : researchData
              ? "bg-white border-slate-200 hover:border-slate-300"
              : "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
              activeStep === 2 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            2
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900">מחקר מונחים & LSI</div>
            <div className="text-[11px] text-slate-500">
              {researchData ? `${researchData.lsiKeywords.length} מונחי LSI אותרו` : "ממתין למחקר"}
            </div>
          </div>
        </button>

        <button
          onClick={() => articleData && setActiveStep(3)}
          disabled={!articleData}
          className={`p-4 rounded-2xl border text-right transition-all flex items-center gap-3 ${
            activeStep === 3
              ? "bg-amber-50 border-amber-300 shadow-sm"
              : articleData
              ? "bg-white border-slate-200 hover:border-slate-300"
              : "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
          }`}
        >
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
              activeStep === 3 ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600"
            }`}
          >
            3
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900">מאמר מלא & פרסום</div>
            <div className="text-[11px] text-slate-500">
              {articleData ? "מאמר מוכן לפרסום" : "ממתין לג'נרוט"}
            </div>
          </div>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="font-bold text-rose-600 hover:underline">
            סגור
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          {publishedUrl && (
            <Link
              href={publishedUrl}
              target="_blank"
              className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-white px-3 py-1 rounded-lg border border-emerald-300 hover:bg-emerald-100 transition-colors"
            >
              <span>צפה בעמוד החי</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 1: Topic Definition & Curated Hot Ideas */}
      {/* ======================================================== */}
      {activeStep === 1 && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-500" />
                  <span>הגדרת הנושא עבור רוֹן</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  הזן נושא חופשי או בחר מאחד המדריכים המבוקשים ביותר על ידי קונים ישראלים
                </p>
              </div>
            </div>

            {/* Popular Curated Topics */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-rose-500" />
                <span>נושאים חמים באלי אקספרס לקונים ישראלים (הזדמנויות SEO מומלצות):</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {POPULAR_ISRAELI_ALIEXPRESS_TOPICS.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPopularTopic(item)}
                    className="p-3 rounded-2xl border border-slate-200 hover:border-amber-400 bg-slate-50/60 hover:bg-amber-50/40 text-right transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-amber-800">
                        {item.topic}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  נושא המאמר או שאלת הצרכנות המרכזית *
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="לדוגמה: מדריך מכס ומע״מ באלי אקספרס, סרגל מידות לנעליים, או מדריך מציאת דילים סודיים"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  מונח חיפוש ראשי ממוקד (Focus Keyword - אופציונלי)
                </label>
                <input
                  type="text"
                  value={focusKeyword}
                  onChange={(e) => setFocusKeyword(e.target.value)}
                  placeholder="לדוגמה: מכס אלי אקספרס 75 דולר"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  קטגוריה
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 transition-all"
                >
                  <option value="מדריכי קנייה וצרכנות">מדריכי קנייה וצרכנות</option>
                  <option value="אלקטרוניקה וגאדג'טים">אלקטרוניקה וגאדג&apos;טים</option>
                  <option value="אופנה והנעלה">אופנה והנעלה</option>
                  <option value="לבית ולמטבח">לבית ולמטבח</option>
                  <option value="מבצעים וקופונים">מבצעים וקופונים</option>
                  <option value="ילדים וצעצועים">ילדים וצעצועים</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  הנחיות ודגשים מיוחדים לרוֹן (אופציונלי)
                </label>
                <textarea
                  rows={2}
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="לדוגמה: תדגיש את ההבדל בין מוצרי Choice לחנויות רגילות, ותזכיר לפצל חבילות בהפרש 48 שעות למניעת תשלום מע&quot;מ כפול..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-500">
                שלב 1: רון ינתח כוונת חיפוש, יחלץ 15-20 מונחי LSI ושאלות נפוצות של ישראלים בגוגל.
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRunResearch}
                  disabled={isResearching || !topic.trim()}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2"
                >
                  {isResearching ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>רוֹן חוקר מונחי LSI...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      <span>התחל מחקר מונחים & LSI (שלב 1)</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: LSI Keywords & Content Strategy Outline */}
      {/* ======================================================== */}
      {activeStep === 2 && researchData && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[11px] font-bold">
                    מחקר הושלם בהצלחה
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[11px] font-bold uppercase">
                    כוונת חיפוש: {researchData.searchIntent}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 mt-2">
                  תוצאות מחקר מילות מפתח, LSI ומבנה המאמר
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  מונח ראשי: <strong className="text-slate-800 font-bold">{researchData.primaryKeyword}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  ערוך בריף
                </button>
                <button
                  type="button"
                  onClick={handleGenerateArticle}
                  disabled={isGenerating}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-white font-bold text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>רוֹן כותב ושודד LSI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>ג&apos;נרט מאמר מלא עם שזירת LSI (שלב 2)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* LSI Keywords Cloud */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-amber-500" />
                <span>מילות מפתח סמנטיות שנמצאו עבור שזירה במאמר ({researchData.lsiKeywords.length} ביטויים):</span>
              </label>
              <div className="flex flex-wrap gap-2 p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60">
                {researchData.lsiKeywords.map((lsi, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-amber-200 text-amber-900 text-xs font-semibold shadow-xs"
                  >
                    <span>✓</span>
                    <span>{lsi}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Semantic Entities & PAA Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Semantic Entities */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  <span>ישויות סמנטיות ומושגי מפתח בעלי אקספרס:</span>
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {researchData.semanticEntities.map((entity, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-bold"
                    >
                      {entity}
                    </span>
                  ))}
                </div>
              </div>

              {/* People Also Ask */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span>שאלות נפוצות של ישראלים בגוגל (PAA):</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {researchData.peopleAlsoAsk.map((q, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Suggested Headings Outline */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                מבנה היררכיית הכותרות (Outline) שרון יבנה:
              </label>
              <div className="space-y-2">
                {researchData.suggestedHeadings.map((h, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-600">
                        {h.level}
                      </span>
                      <span className="font-bold text-xs text-slate-900">{h.title}</span>
                    </div>
                    {h.targetLsi && h.targetLsi.length > 0 && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 flex-wrap">
                        <span>LSI יעד:</span>
                        {h.targetLsi.map((k, ki) => (
                          <span key={ki} className="text-amber-700 font-medium">
                            &quot;{k}&quot;{ki < h.targetLsi.length - 1 ? "," : ""}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Strategy Notes */}
            {researchData.strategyNotes && (
              <div className="p-4 rounded-2xl bg-amber-50/40 border border-amber-200 text-xs text-amber-900">
                <span className="font-bold">אסטרטגיית ה-SEO של רוֹן: </span>
                <span>{researchData.strategyNotes}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: Complete Article & Live Publishing */}
      {/* ======================================================== */}
      {activeStep === 3 && articleData && (
        <div className="space-y-6">
          {/* Action Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span className="text-xs font-bold text-slate-800">
                מאמר מוכן לפרסום: כ-{articleData.estimatedReadTimeMinutes} דקות קריאה
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-xs text-amber-600 font-bold">
                נשזרו {articleData.lsiKeywordsWeaved.length} מונחי LSI
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handlePublish("draft")}
                disabled={isPublishing}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                שמור כטיוטה
              </button>

              <button
                type="button"
                onClick={() => handlePublish("published")}
                disabled={isPublishing}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>מפרסם באתר...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>פרסם באתר חי עכשיו</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Title & Slug Header */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">
                    כותרת ראשית (H1)
                  </label>
                  <input
                    type="text"
                    value={articleData.title}
                    onChange={(e) => setArticleData({ ...articleData, title: e.target.value })}
                    className="w-full text-lg sm:text-xl font-black text-slate-900 p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Slug & Public URL */}
                <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <span className="font-bold text-slate-500 shrink-0">כתובת URL באתר:</span>
                  <span className="font-mono text-indigo-600 dir-ltr text-left flex-1 truncate">
                    /articles/{articleData.slug}
                  </span>
                  <button
                    onClick={handleCopySlug}
                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-1 px-2 py-1 rounded bg-white border border-slate-200 transition-colors"
                  >
                    {copiedSlug ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSlug ? "הועתק!" : "העתק"}</span>
                  </button>
                </div>

                {/* Direct Answer GEO Box */}
                <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      <span>פסקה ישירה ל-Google AI Overviews & SearchGPT (Direct Answer GEO):</span>
                    </span>
                    <span className="text-[10px] text-amber-700">ציטוט בינה מלאכותית</span>
                  </div>
                  <textarea
                    rows={3}
                    value={articleData.directAnswerGeo}
                    onChange={(e) => setArticleData({ ...articleData, directAnswerGeo: e.target.value })}
                    className="w-full text-xs font-medium text-amber-950 p-2.5 rounded-xl border border-amber-200 bg-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Tabs Bar */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setPreviewTab("preview")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    previewTab === "preview"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  תצוגה מקדימה מלאה
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("markdown")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                    previewTab === "markdown"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  עורך Markdown
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("proscons")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    previewTab === "proscons"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <ThumbsUp className="w-3 h-3 text-emerald-300" />
                  <span>
                    יתרונות & חסרונות ({(articleData.pros || []).length + (articleData.cons || []).length})
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("specs")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    previewTab === "specs"
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                  <span>תאימות לישראל & דגשים</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("lsi")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    previewTab === "lsi"
                      ? "bg-amber-600 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  <span>שזירת LSI ({articleData.lsiKeywordsWeaved?.length || 0})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTab("faqs")}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                    previewTab === "faqs"
                      ? "bg-slate-900 text-white shadow-sm"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  <HelpCircle className="w-3 h-3" />
                  <span>שאלות FAQ ({articleData.faqs?.length || 0})</span>
                </button>
              </div>

              {/* Tab 1: Rendered Full Preview */}
              {previewTab === "preview" && (
                <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  {/* Israeli Compliance Bar Preview */}
                  {(articleData.isEuPlug !== null ||
                    articleData.voltage220vCompatible !== null ||
                    Boolean(articleData.sizeWarning) ||
                    Boolean(articleData.fabricComposition)) && (
                    <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-xs sm:text-sm text-slate-800 shadow-xs">
                      <div className="flex items-center gap-2 font-bold text-amber-900 mb-2">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        <span>דגשים חשובים לקונים בישראל:</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700">
                        {articleData.isEuPlug !== null && articleData.isEuPlug !== undefined && (
                          <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100">
                            <span className="text-base">🔌</span>
                            <span>
                              <strong>תקע חשמלי: </strong>
                              {articleData.isEuPlug ? "תקע אירופאי (EU Plug) תואם לישראל" : "נדרש מתאם"}
                            </span>
                          </div>
                        )}
                        {articleData.voltage220vCompatible !== null && articleData.voltage220vCompatible !== undefined && (
                          <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100">
                            <span className="text-base">⚡</span>
                            <span>
                              <strong>מתח עבודה: </strong>
                              {articleData.voltage220vCompatible
                                ? "תואם לרשת החשמל בישראל (220V/50Hz)"
                                : "יש לוודא תאימות מתח"}
                            </span>
                          </div>
                        )}
                        {articleData.sizeWarning && (
                          <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100 sm:col-span-2">
                            <span className="text-base">📏</span>
                            <span>
                              <strong>סרגל מידות: </strong>
                              {articleData.sizeWarning}
                            </span>
                          </div>
                        )}
                        {articleData.fabricComposition && (
                          <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100 sm:col-span-2">
                            <span className="text-base">🧶</span>
                            <span>
                              <strong>הרכב בד וחומרים: </strong>
                              {articleData.fabricComposition}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Pros & Cons Box */}
                  {((articleData.pros && articleData.pros.length > 0) ||
                    (articleData.cons && articleData.cons.length > 0)) && (
                    <ProsConsBox pros={articleData.pros || []} cons={articleData.cons || []} />
                  )}

                  {/* Markdown Body */}
                  <div className="prose max-w-none text-slate-800 leading-relaxed text-sm">
                    <MarkdownContent content={articleData.contentMarkdown} />
                  </div>

                  {/* FAQs Accordion */}
                  {articleData.faqs && articleData.faqs.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-slate-100">
                      <FaqAccordion items={articleData.faqs} title="שאלות נפוצות ותשובות (FAQ)" />
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Markdown Editor */}
              {previewTab === "markdown" && (
                <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
                  <textarea
                    rows={22}
                    value={articleData.contentMarkdown}
                    onChange={(e) => setArticleData({ ...articleData, contentMarkdown: e.target.value })}
                    className="w-full font-mono text-xs text-slate-900 p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-amber-500 leading-relaxed"
                  />
                </div>
              )}

              {/* Tab 3: LSI Tracking Table */}
              {previewTab === "lsi" && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-amber-500" />
                      <span>דוח שזירת מונחי LSI וסמנטיקה במאמר</span>
                    </h3>
                    <span className="text-xs text-slate-500">
                      מוודא כיסוי סמנטי מלא ללא דחיסה מאולצת
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-right text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <th className="py-2.5 px-3">מונח LSI שנשזר</th>
                          <th className="py-2.5 px-3 text-center">הופעות</th>
                          <th className="py-2.5 px-3">מיקום ושזירה</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {articleData.lsiKeywordsWeaved.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-bold text-slate-900">{item.keyword}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                                {item.count}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-slate-500">{item.section}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Tab 4: FAQs Editor */}
              {previewTab === "faqs" && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-emerald-500" />
                      <span>שאלות ותשובות FAQ המוטמעות במאמר וב-Schema.org</span>
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const newFaqs = [
                          ...(articleData.faqs || []),
                          { question: "שאלה חדשה לקונים בישראל?", answer: "תשובה מפורטת עם טיפ מעשי של רון." },
                        ];
                        setArticleData({ ...articleData, faqs: newFaqs });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>הוסף שאלה ותשובה</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(articleData.faqs || []).map((faq, i) => (
                      <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-500">שאלה {i + 1}:</label>
                          <button
                            type="button"
                            onClick={() => {
                              const newFaqs = articleData.faqs.filter((_, idx) => idx !== i);
                              setArticleData({ ...articleData, faqs: newFaqs });
                            }}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors"
                            title="מחק שאלה"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const newFaqs = [...articleData.faqs];
                            newFaqs[i].question = e.target.value;
                            setArticleData({ ...articleData, faqs: newFaqs });
                          }}
                          className="w-full font-bold text-xs text-slate-900 p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                        />
                        <textarea
                          rows={2}
                          value={faq.answer}
                          onChange={(e) => {
                            const newFaqs = [...articleData.faqs];
                            newFaqs[i].answer = e.target.value;
                            setArticleData({ ...articleData, faqs: newFaqs });
                          }}
                          className="w-full text-xs text-slate-700 p-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Pros & Cons Editor */}
              {previewTab === "proscons" && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <ThumbsUp className="w-4 h-4 text-emerald-500" />
                        <span>עריכת יתרונות וחסרונות (Pros & Cons)</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        הסעיפים מוצגים בתיבת ProsConsBox בראש המאמר ומסייעים להמרות
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Pros */}
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>יתרונות מרכזיים ({(articleData.pros || []).length})</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const newPros = [...(articleData.pros || []), "יתרון מעשי חדש..."];
                            setArticleData({ ...articleData, pros: newPros });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>הוסף יתרון</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(articleData.pros || []).map((pro, pi) => (
                          <div key={pi} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-emerald-100 shadow-xs">
                            <span className="text-emerald-600 font-bold text-xs shrink-0">✓</span>
                            <input
                              type="text"
                              value={pro}
                              onChange={(e) => {
                                const newPros = [...articleData.pros];
                                newPros[pi] = e.target.value;
                                setArticleData({ ...articleData, pros: newPros });
                              }}
                              className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newPros = articleData.pros.filter((_, idx) => idx !== pi);
                                setArticleData({ ...articleData, pros: newPros });
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cons */}
                    <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-rose-950 flex items-center gap-1.5">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>חסרונות ואזהרות צרכנות ({(articleData.cons || []).length})</span>
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            const newCons = [...(articleData.cons || []), "אזהרה או חיסרון לבדיקה..."];
                            setArticleData({ ...articleData, cons: newCons });
                          }}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>הוסף חיסרון</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(articleData.cons || []).map((con, ci) => (
                          <div key={ci} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-rose-100 shadow-xs">
                            <span className="text-rose-600 font-bold text-xs shrink-0">✕</span>
                            <input
                              type="text"
                              value={con}
                              onChange={(e) => {
                                const newCons = [...articleData.cons];
                                newCons[ci] = e.target.value;
                                setArticleData({ ...articleData, cons: newCons });
                              }}
                              className="flex-1 text-xs text-slate-800 bg-transparent focus:outline-none font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newCons = articleData.cons.filter((_, idx) => idx !== ci);
                                setArticleData({ ...articleData, cons: newCons });
                              }}
                              className="text-slate-400 hover:text-rose-500 p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Israeli Specs & Compliance Editor */}
              {previewTab === "specs" && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-amber-500" />
                        <span>התאמה לשוק הישראלי, תקינה ומוצרים מומלצים</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        הגדרות אלו מסייעות לדירוג גבוה ב-GEO, מונעות טעויות של קונים ומציגות מוצרים רלוונטיים
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Archetype */}
                    <div>
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        ארכיטיפ קטגוריה (Archetype)
                      </label>
                      <select
                        value={articleData.archetype || "GENERAL"}
                        onChange={(e) => setArticleData({ ...articleData, archetype: e.target.value })}
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold"
                      >
                        <option value="GENERAL">כללי / מדריך צרכנות (GENERAL)</option>
                        <option value="ELECTRONICS">אלקטרוניקה וחשמל (ELECTRONICS)</option>
                        <option value="FASHION">אופנה והנעלה (FASHION)</option>
                        <option value="HOME_LIVING">לבית ולמטבח (HOME_LIVING)</option>
                        <option value="BEAUTY">טיפוח וקוסמטיקה (BEAUTY)</option>
                        <option value="BABY_KIDS">ילדים ותינוקות (BABY_KIDS)</option>
                        <option value="SPORTS">ספורט ומחנאות (SPORTS)</option>
                        <option value="AUTOMOTIVE">רכב ואופנועים (AUTOMOTIVE)</option>
                      </select>
                    </div>

                    {/* EU Plug Toggle */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">שקע אירופאי (EU Plug)</div>
                        <div className="text-[11px] text-slate-500">האם נדרש או סופק תקע תואם לישראל?</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(articleData.isEuPlug)}
                        onChange={(e) => setArticleData({ ...articleData, isEuPlug: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>

                    {/* 220V Voltage Compatibility Toggle */}
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-xs text-slate-900">תאימות מתח 220V/50Hz</div>
                        <div className="text-[11px] text-slate-500">האם תואם לרשת החשמל הישראלית?</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={Boolean(articleData.voltage220vCompatible)}
                        onChange={(e) => setArticleData({ ...articleData, voltage220vCompatible: e.target.checked })}
                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                      />
                    </div>

                    {/* Size Warning */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        אזהרת מידות (עבור אופנה / הנעלה)
                      </label>
                      <input
                        type="text"
                        value={articleData.sizeWarning || ""}
                        onChange={(e) => setArticleData({ ...articleData, sizeWarning: e.target.value || null })}
                        placeholder="לדוגמה: מידות אסייתיות - מומלץ לקחת 1-2 מידות מעל המידה הרגילה"
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                    </div>

                    {/* Fabric Composition */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold text-slate-800 mb-1">
                        הרכב חומרים / בד (אופציונלי)
                      </label>
                      <input
                        type="text"
                        value={articleData.fabricComposition || ""}
                        onChange={(e) => setArticleData({ ...articleData, fabricComposition: e.target.value || null })}
                        placeholder="לדוגמה: 100% כותנה סרוקה, ציפוי מונע החלקה"
                        className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs"
                      />
                    </div>

                    {/* Product IDs Recommendation */}
                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-xs font-bold text-slate-800">
                        מזהי מוצרים מומלצים המשויכים למאמר (Product IDs):
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(articleData.productIds || []).map((pid, pidx) => (
                          <span
                            key={pidx}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-mono font-bold flex items-center gap-1.5 border border-indigo-200"
                          >
                            <span>{pid}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newPids = articleData.productIds.filter((_, i) => i !== pidx);
                                setArticleData({ ...articleData, productIds: newPids });
                              }}
                              className="text-indigo-400 hover:text-rose-500"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          id="new-product-id-input"
                          type="text"
                          placeholder="הזן מזהה מוצר להוספה (למשל prod_123 או מספר עליאקספרס)..."
                          className="flex-1 p-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const inputEl = e.currentTarget;
                              const val = inputEl.value.trim();
                              if (val && !articleData.productIds?.includes(val)) {
                                setArticleData({ ...articleData, productIds: [...(articleData.productIds || []), val] });
                                inputEl.value = "";
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const inputEl = document.getElementById("new-product-id-input") as HTMLInputElement;
                            const val = inputEl?.value.trim();
                            if (val && !articleData.productIds?.includes(val)) {
                              setArticleData({ ...articleData, productIds: [...(articleData.productIds || []), val] });
                              inputEl.value = "";
                            }
                          }}
                          className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-colors shrink-0"
                        >
                          הוסף מוצר
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar Settings Panel */}
            <div className="space-y-6">
              {/* Meta Tags & SEO Card */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-indigo-500" />
                  <span>הגדרות Meta & SEO</span>
                </h3>

                {/* Meta Title */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <label className="font-bold text-slate-700">Meta Title</label>
                    <span
                      className={`font-mono text-[10px] ${
                        articleData.metaTitle.length > 60 ? "text-rose-500 font-bold" : "text-slate-400"
                      }`}
                    >
                      {articleData.metaTitle.length}/60
                    </span>
                  </div>
                  <input
                    type="text"
                    value={articleData.metaTitle}
                    onChange={(e) => setArticleData({ ...articleData, metaTitle: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Meta Description */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <label className="font-bold text-slate-700">Meta Description</label>
                    <span
                      className={`font-mono text-[10px] ${
                        articleData.metaDescription.length > 155 ? "text-rose-500 font-bold" : "text-slate-400"
                      }`}
                    >
                      {articleData.metaDescription.length}/155
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={articleData.metaDescription}
                    onChange={(e) => setArticleData({ ...articleData, metaDescription: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Target Category */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">קטגוריה</label>
                  <select
                    value={articleData.targetCategory}
                    onChange={(e) => setArticleData({ ...articleData, targetCategory: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-semibold"
                  >
                    <option value="מדריכי קנייה וצרכנות">מדריכי קנייה וצרכנות</option>
                    <option value="אלקטרוניקה וגאדג'טים">אלקטרוניקה וגאדג&apos;טים</option>
                    <option value="אופנה והנעלה">אופנה והנעלה</option>
                    <option value="לבית ולמטבח">לבית ולמטבח</option>
                    <option value="מבצעים וקופונים">מבצעים וקופונים</option>
                    <option value="ילדים וצעצועים">ילדים וצעצועים</option>
                  </select>
                </div>

                {/* Archetype */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">ארכיטיפ דף (Archetype)</label>
                  <select
                    value={articleData.archetype || "GENERAL"}
                    onChange={(e) => setArticleData({ ...articleData, archetype: e.target.value })}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-900 font-semibold"
                  >
                    <option value="GENERAL">כללי / מדריך צרכנות (GENERAL)</option>
                    <option value="ELECTRONICS">אלקטרוניקה וגאדג&apos;טים (ELECTRONICS)</option>
                    <option value="FASHION">אופנה והנעלה (FASHION)</option>
                    <option value="HOME_LIVING">לבית ולמטבח (HOME_LIVING)</option>
                    <option value="BEAUTY">יופי וטיפוח (BEAUTY)</option>
                    <option value="BABY_KIDS">ילדים ותינוקות (BABY_KIDS)</option>
                    <option value="SPORTS">ספורט ומחנאות (SPORTS)</option>
                    <option value="AUTOMOTIVE">רכב ואופנועים (AUTOMOTIVE)</option>
                  </select>
                </div>

                {/* Tags */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">תגיות</label>
                  <div className="flex flex-wrap gap-1.5">
                    {articleData.tags.map((t, ti) => (
                      <span
                        key={ti}
                        className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Alon Rationale Card */}
              {articleData.alonRationale && (
                <div className="p-4 rounded-3xl bg-indigo-50/70 border border-indigo-200 space-y-1.5 text-xs">
                  <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>הערכת אלון (ראש הצוות):</span>
                  </div>
                  <p className="text-indigo-900 leading-relaxed">{articleData.alonRationale}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Published Articles List */}
      {recentArticles.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>מאמרי תוכן ו-SEO שפורסמו לאחרונה באתר ({recentArticles.length}):</span>
            </h3>
            <Link
              href="/admin/pages?type=article"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              ניהול כל המאמרים ב-CMS ←
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {recentArticles.slice(0, 6).map((art) => (
              <div
                key={art.id}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex flex-col justify-between space-y-2"
              >
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600">
                    {art.targetCategory || "מאמר תוכן"}
                  </span>
                  <h4 className="font-bold text-xs text-slate-900 mt-1.5 line-clamp-1">{art.title}</h4>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[11px]">
                  <Link
                    href={`/articles/${art.slug}`}
                    target="_blank"
                    className="font-bold text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <span>צפה באתר</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                  <Link
                    href={`/admin/pages/edit/${art.id}`}
                    className="text-slate-500 hover:text-slate-800"
                  >
                    ערוך ב-CMS
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
