"use client";

import React, { useState, useRef, useMemo } from "react";
import {
  Package,
  Link2,
  Image as ImageIcon,
  Video,
  Lightbulb,
  AlertTriangle,
  Table as TableIcon,
  Heading2,
  Heading3,
  Bold,
  List,
  ExternalLink,
  Search,
  UploadCloud,
  Check,
  X,
  Loader2,
  Clock,
  FileText,
} from "lucide-react";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";

export interface ToolbarProductItem {
  id: string;
  aliId: string;
  titleHe?: string;
  originalTitle: string;
  priceUsd: number;
  priceIls?: number;
  mainImage: string;
  category?: string;
  slug?: string;
  usedInPages?: Array<{ id: string; title: string; slug: string; type: string }>;
}

interface ArticleEditorToolbarProps {
  markdown: string;
  onChangeMarkdown: (newMd: string) => void;
  allProducts: ToolbarProductItem[];
  currentSlug: string;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  showToast?: (msg: string, type?: "success" | "error" | "warning") => void;
}

export default function ArticleEditorToolbar({
  markdown,
  onChangeMarkdown,
  allProducts,
  currentSlug,
  textareaRef,
  showToast,
}: ArticleEditorToolbarProps) {
  // Modal states
  const [isProductEmbedOpen, setIsProductEmbedOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);

  // Search & filter states
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [linkSearchQuery, setLinkSearchQuery] = useState("");

  // Link Modal specific state
  const [linkText, setLinkText] = useState("");
  const [linkSelectionRange, setLinkSelectionRange] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const [customLinkUrl, setCustomLinkUrl] = useState("");
  const [isCustomLinkTab, setIsCustomLinkTab] = useState(false);

  // Image Modal specific state
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Video Modal specific state
  const [videoUrl, setVideoUrl] = useState("");

  // Helper: Insert text at current cursor position or wrap selection
  const insertAtCursor = (prefix: string, suffix: string = "") => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChangeMarkdown(markdown + prefix + suffix);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = markdown.substring(start, end);
    const replacement = prefix + (selected || "") + suffix;
    const newMd = markdown.substring(0, start) + replacement + markdown.substring(end);

    onChangeMarkdown(newMd);

    // Restore focus and cursor position after React re-render
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + (selected?.length || 0));
    }, 10);
  };

  // Helper: Open Smart Link Modal with selected text captured
  const handleOpenLinkModal = () => {
    const textarea = textareaRef.current;
    let selected = "";
    let range = { start: markdown.length, end: markdown.length };

    if (textarea) {
      range = { start: textarea.selectionStart, end: textarea.selectionEnd };
      selected = markdown.substring(range.start, range.end).trim();
    }

    setLinkSelectionRange(range);
    setLinkText(selected);
    setLinkSearchQuery("");
    setCustomLinkUrl("");
    setIsCustomLinkTab(false);
    setIsLinkModalOpen(true);
  };

  // Helper: Apply smart product link (Internal vs Outbound Affiliate)
  const applyProductLink = (prod: ToolbarProductItem, mode: "internal" | "affiliate") => {
    const textToDisplay = linkText.trim() || prod.titleHe || prod.originalTitle || "מוצר מומלץ";

    let targetUrl = "";
    if (mode === "internal") {
      // Find matching review page or fallback to review slug
      const reviewPage = prod.usedInPages?.find((p) => p.type === "review" || p.type === "deal");
      const targetSlug = reviewPage?.slug || prod.slug || prod.id;
      targetUrl = `/reviews/${targetSlug}`;
    } else {
      // Outbound Affiliate link
      const aliId = prod.aliId || prod.id;
      targetUrl = `/go/${aliId}?sub_id=article_link&page=${currentSlug || "article"}`;
    }

    const markdownLink = `[${textToDisplay}](${targetUrl})`;

    const textarea = textareaRef.current;
    if (textarea && linkSelectionRange.start !== linkSelectionRange.end) {
      const before = markdown.substring(0, linkSelectionRange.start);
      const after = markdown.substring(linkSelectionRange.end);
      onChangeMarkdown(before + markdownLink + after);
    } else {
      insertAtCursor(markdownLink);
    }

    setIsLinkModalOpen(false);
    if (showToast) {
      showToast(
        mode === "internal"
          ? "קישור פנימי לעמוד המוצר שובץ בהצלחה!"
          : "קישור אפיליאייט ישיר לאלי אקספרס שובץ בהצלחה!",
        "success"
      );
    }
  };

  // Helper: Apply Custom URL Link
  const applyCustomLink = () => {
    if (!customLinkUrl.trim()) return;
    const textToDisplay = linkText.trim() || customLinkUrl.trim();
    const markdownLink = `[${textToDisplay}](${customLinkUrl.trim()})`;

    const textarea = textareaRef.current;
    if (textarea && linkSelectionRange.start !== linkSelectionRange.end) {
      const before = markdown.substring(0, linkSelectionRange.start);
      const after = markdown.substring(linkSelectionRange.end);
      onChangeMarkdown(before + markdownLink + after);
    } else {
      insertAtCursor(markdownLink);
    }

    setIsLinkModalOpen(false);
    if (showToast) showToast("הקישור שובץ בהצלחה בטקסט!", "success");
  };

  // Helper: Insert Product Card Embed Tag: [product:ID]
  const handleEmbedProduct = (prod: ToolbarProductItem) => {
    const rawId = prod.aliId || prod.id;
    const embedTag = `\n\n[product:${rawId}]\n\n`;
    insertAtCursor(embedTag);
    setIsProductEmbedOpen(false);
    if (showToast) {
      showToast(`כרטיסיית המוצר (${prod.titleHe || prod.originalTitle}) הוטמעה בכתבה!`, "success");
    }
  };

  // Helper: Handle direct image upload to Supabase Storage
  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("altText", imageAlt || file.name);
      formData.append("folder", "articles");

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: getAdminHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setImageUrl(data.url);
        if (showToast) showToast("התמונה הועלתה בהצלחה ל-Supabase Storage!", "success");
      } else {
        if (showToast) showToast(data.error || "שגיאה בהעלאת התמונה", "error");
      }
    } catch {
      if (showToast) showToast("שגיאת תקשורת בהעלאת תמונה", "error");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Helper: Insert Image into Markdown
  const handleInsertImage = () => {
    if (!imageUrl.trim()) return;
    const alt = imageAlt.trim() || "תמונת מאמר";
    const imageMd = `\n\n![${alt}](${imageUrl.trim()})\n\n`;
    insertAtCursor(imageMd);
    setIsImageModalOpen(false);
    setImageUrl("");
    setImageAlt("");
    if (showToast) showToast("התמונה שובצה בהצלחה בגוף המאמר!", "success");
  };

  // Helper: Insert Video into Markdown
  const handleInsertVideo = () => {
    if (!videoUrl.trim()) return;
    const videoMd = `\n\n[video](${videoUrl.trim()})\n\n`;
    insertAtCursor(videoMd);
    setIsVideoModalOpen(false);
    setVideoUrl("");
    if (showToast) showToast("נגן הווידאו שובץ בהצלחה בגוף המאמר!", "success");
  };

  // Filter products for modals
  const filteredEmbedProducts = useMemo(() => {
    if (!productSearchQuery.trim()) return allProducts.slice(0, 30);
    const q = productSearchQuery.toLowerCase().trim();
    return allProducts.filter(
      (p) =>
        (p.titleHe || "").toLowerCase().includes(q) ||
        (p.originalTitle || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        p.aliId.includes(q)
    );
  }, [allProducts, productSearchQuery]);

  const filteredLinkProducts = useMemo(() => {
    if (!linkSearchQuery.trim()) return allProducts.slice(0, 30);
    const q = linkSearchQuery.toLowerCase().trim();
    return allProducts.filter(
      (p) =>
        (p.titleHe || "").toLowerCase().includes(q) ||
        (p.originalTitle || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q) ||
        p.aliId.includes(q)
    );
  }, [allProducts, linkSearchQuery]);

  // Statistics
  const wordsCount = markdown.split(/\s+/).filter(Boolean).length;
  const readTimeMin = Math.max(1, Math.ceil(wordsCount / 180));

  return (
    <div className="space-y-2 select-none" dir="rtl">
      {/* Main Toolbar Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-2xl bg-slate-100/90 border border-slate-200">
        {/* Actions Group 1: Products & Links */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Embed Product Card Button */}
          <button
            type="button"
            onClick={() => {
              setProductSearchQuery("");
              setIsProductEmbedOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer"
            title="הטמע כרטיסיית מוצר מעוצבת מתוך מאגר המוצרים ישירות בכתבה"
          >
            <Package className="w-3.5 h-3.5" />
            <span>🛍️ הטמע מוצר מהמאגר</span>
          </button>

          {/* Smart Link Text to Product */}
          <button
            type="button"
            onClick={handleOpenLinkModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-all cursor-pointer"
            title="סמן טקסט ולחץ כאן כדי להפוך אותו לקישור פנימי למוצר או לקישור אפיליאייט ישיר"
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>🔗 קשר טקסט למוצר</span>
          </button>

          <span className="h-5 w-px bg-slate-300 mx-1 hidden sm:inline-block" />

          {/* Media Buttons */}
          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
            title="העלאת תמונה לענן או הוספת קישור תמונה"
          >
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>תמונה</span>
          </button>

          <button
            type="button"
            onClick={() => setIsVideoModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
            title="הטמעת סרטון YouTube או וידאו ישיר"
          >
            <Video className="w-3.5 h-3.5 text-red-600" />
            <span>וידאו</span>
          </button>

          <span className="h-5 w-px bg-slate-300 mx-1 hidden sm:inline-block" />

          {/* Callouts & Formats */}
          <button
            type="button"
            onClick={() =>
              insertAtCursor(
                "\n\n> [!TIP]\n> **טיפ של רון:** ",
                "הקלד כאן את הטיפ הצרכני המנצח שלך...\n\n"
              )
            }
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-emerald-50 text-emerald-800 font-bold text-xs transition-all"
            title="הוספת תיבת טיפ של רון"
          >
            <Lightbulb className="w-3.5 h-3.5 text-emerald-600" />
            <span>טיפ רון</span>
          </button>

          <button
            type="button"
            onClick={() =>
              insertAtCursor(
                "\n\n> [!WARNING]\n> **שים לב:** ",
                "הקלד כאן אזהרה חשובה או פרט קריטי...\n\n"
              )
            }
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-amber-50 text-amber-800 font-bold text-xs transition-all"
            title="הוספת תיבת אזהרה"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>אזהרה</span>
          </button>

          <button
            type="button"
            onClick={() =>
              insertAtCursor(
                "\n\n| מאפיין | דגם א' | דגם ב' |\n|---|---|---|\n| מחיר | ₪89 | ₪129 |\n| תאימות חשמל | 220V EU | 220V EU |\n| דירוג | ⭐ 4.8 | ⭐ 4.6 |\n\n"
              )
            }
            className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all"
            title="הוספת טבלת השוואה"
          >
            <TableIcon className="w-3.5 h-3.5 text-indigo-500" />
            <span>טבלה</span>
          </button>

          <button
            type="button"
            onClick={() => insertAtCursor("\n\n## ", "\n\n")}
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all font-mono text-xs font-bold"
            title="כותרת H2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertAtCursor("\n\n### ", "\n\n")}
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all font-mono text-xs font-bold"
            title="כותרת H3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertAtCursor("**", "**")}
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all"
            title="טקסט מודגש"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertAtCursor("\n* ", "")}
            className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all"
            title="רשימת תבליטים"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Stats: Word Count & Read Time */}
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 pr-1">
          <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
            <FileText className="w-3 h-3 text-slate-400" />
            <span>{wordsCount} מילים</span>
          </span>
          <span className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>~{readTimeMin} דק' קריאה</span>
          </span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: Embed Product Card ([product:ID]) */}
      {/* ======================================================== */}
      {isProductEmbedOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">הטמעת כרטיסיית מוצר בכתבה</h3>
                  <p className="text-[11px] text-slate-500">
                    בחר מוצר ממאגר האתר. הכרטיסייה תשתלב באופן אלגנטי ורספונסיבי ללא שבירת הטקסט.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsProductEmbedOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearchQuery}
                  onChange={(e) => setProductSearchQuery(e.target.value)}
                  placeholder="חיפוש לפי שם מוצר בעברית, מזהה אלי אקספרס או קטגוריה..."
                  className="w-full pr-9 pl-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
            </div>

            {/* Product List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
              {filteredEmbedProducts.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">לא נמצאו מוצרים תואמים</div>
              ) : (
                filteredEmbedProducts.map((prod) => {
                  const price = prod.priceIls || Math.round((prod.priceUsd || 0) * 3.65);
                  return (
                    <div
                      key={prod.id}
                      className="pt-2 first:pt-0 flex items-center justify-between gap-3 hover:bg-slate-50 p-2 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={prod.mainImage || "/placeholder-product.png"}
                          alt={prod.titleHe || prod.originalTitle}
                          className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {prod.titleHe || prod.originalTitle}
                          </h4>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-extrabold text-slate-900">₪{price}</span>
                            <span>•</span>
                            <span>קוד: {prod.aliId}</span>
                            {prod.category && (
                              <>
                                <span>•</span>
                                <span>{prod.category}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleEmbedProduct(prod)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition-colors shadow-xs"
                      >
                        הטמע בכתבה
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: Smart Link Text to Product (Internal vs Affiliate) */}
      {/* ======================================================== */}
      {isLinkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">קישור טקסט מסומן למוצר</h3>
                  <p className="text-[11px] text-slate-500">
                    בחר האם לקשר פנימית לעמוד המוצר באתר (לחיזוק SEO) או לשלוח ישירות לאלי אקספרס (אפיליאייט)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Link Text Input & Tab Toggle */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-700 mb-1">
                  טקסט הקישור בכתבה:
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="למשל: כבל טעינה 100W Baseus..."
                  className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Tabs: Choose From Catalog vs Custom URL */}
              <div className="flex items-center gap-2 border-t border-slate-200/60 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomLinkTab(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    !isCustomLinkTab
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  מוצר מתוך הקטלוג
                </button>
                <button
                  type="button"
                  onClick={() => setIsCustomLinkTab(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    isCustomLinkTab
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-600 border border-slate-200"
                  }`}
                >
                  קישור חופשי (URL ידני)
                </button>
              </div>

              {!isCustomLinkTab ? (
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={linkSearchQuery}
                    onChange={(e) => setLinkSearchQuery(e.target.value)}
                    placeholder="סנן לפי שם מוצר או מזהה אלי אקספרס..."
                    className="w-full pr-9 pl-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500"
                  />
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <input
                    type="url"
                    value={customLinkUrl}
                    onChange={(e) => setCustomLinkUrl(e.target.value)}
                    placeholder="https://... או /articles/guide-name"
                    className="w-full p-2.5 rounded-xl bg-white border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={applyCustomLink}
                    disabled={!customLinkUrl.trim()}
                    className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
                  >
                    החל קישור חופשי בטקסט
                  </button>
                </div>
              )}
            </div>

            {/* Catalog Products List with Dual Action Buttons */}
            {!isCustomLinkTab && (
              <div className="flex-1 overflow-y-auto p-4 space-y-2 divide-y divide-slate-100">
                {filteredLinkProducts.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400">לא נמצאו מוצרים תואמים</div>
                ) : (
                  filteredLinkProducts.map((prod) => {
                    const price = prod.priceIls || Math.round((prod.priceUsd || 0) * 3.65);
                    return (
                      <div
                        key={prod.id}
                        className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50 p-2.5 rounded-xl transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={prod.mainImage || "/placeholder-product.png"}
                            alt={prod.titleHe || prod.originalTitle}
                            className="w-11 h-11 rounded-lg object-contain bg-white border border-slate-200 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-bold text-slate-900 truncate">
                              {prod.titleHe || prod.originalTitle}
                            </h4>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                              <span className="font-extrabold text-slate-800">₪{price}</span>
                              <span>•</span>
                              <span>קוד: {prod.aliId}</span>
                            </div>
                          </div>
                        </div>

                        {/* Dual Link Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Option 1: Internal Review Link */}
                          <button
                            type="button"
                            onClick={() => applyProductLink(prod, "internal")}
                            className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-[11px] border border-indigo-200 transition-colors flex items-center gap-1"
                            title="יוצר קישור פנימי לעמוד הסקירה באתר (מעלה PageRank וסמכות SEO)"
                          >
                            <span>🔵 עמוד באתר</span>
                          </button>

                          {/* Option 2: Direct Affiliate Link */}
                          <button
                            type="button"
                            onClick={() => applyProductLink(prod, "affiliate")}
                            className="px-2.5 py-1.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-extrabold text-[11px] transition-colors flex items-center gap-1 shadow-xs"
                            title="יוצר קישור אפיליאייט ישיר לאלי אקספרס עם מעקב עמלות מלא"
                          >
                            <span>🟠 ישר לאלי אקספרס</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: Insert Image */}
      {/* ======================================================== */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                <span>הוספת תמונה לגוף המאמר</span>
              </div>
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Direct Upload to Cloud Button */}
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageFileUpload}
                accept="image/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingImage}
                className="w-full p-4 rounded-2xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 hover:bg-indigo-50 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isUploadingImage ? (
                  <>
                    <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
                    <span className="text-xs font-bold text-indigo-700">מעלה תמונה לענן...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 text-indigo-600" />
                    <span className="text-xs font-bold text-indigo-900">העלה תמונה מהמחשב לענן (Supabase)</span>
                    <span className="text-[10px] text-slate-500">WebP, PNG, JPG עד 10MB</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-2 text-[10px] text-slate-400 font-bold">או הזן קישור ידני</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">כתובת התמונה (URL):</label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://... תמונה מהרשת או העלה למעלה"
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                כיתוב ותיאור Alt (חיוני לגוגל ולנגישות):
              </label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                placeholder="למשל: תרשים חיבור תקע אירופאי EU בישראל..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImageModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleInsertImage}
                disabled={!imageUrl.trim()}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                שבץ תמונה במאמר
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: Insert Video */}
      {/* ======================================================== */}
      {isVideoModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Video className="w-4 h-4 text-red-600" />
                <span>הטמעת סרטון וידאו במאמר</span>
              </div>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                קישור לסרטון (YouTube / Shorts / Vimeo / MP4 ישיר):
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... או https://youtu.be/..."
                className="w-full p-2.5 rounded-xl border border-slate-200 text-xs font-mono focus:outline-none focus:border-red-500"
                autoFocus
              />
              <p className="text-[10px] text-slate-500 mt-1">
                ⚡ המערכת משתמשת בנגן Lite YouTube מהיר במיוחד שאינו מאיט את טעינת הדף במובייל!
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleInsertVideo}
                disabled={!videoUrl.trim()}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                שבץ סרטון במאמר
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
