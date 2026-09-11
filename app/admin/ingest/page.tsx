"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
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
  Copy,
  Package,
  Tag,
  ChevronDown,
  ChevronUp,
  Eye,
  X,
  SlidersHorizontal,
  ListPlus,
} from "lucide-react";
import { CustomsBadge } from "@/components/admin/CustomsBadge";
import MarkdownContent from "@/components/MarkdownContent";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";

interface ProductPreview {
  id: string;
  aliId: string;
  originalTitle: string;
  titleHe?: string;
  priceUsd: number;
  priceIls: number;
  originalPriceUsd?: number;
  discountPercent?: number;
  rating: number;
  ordersCount: number;
  storeName?: string;
  sellerPositiveRate?: string;
  mainImage: string;
  galleryImages?: string[];
  specifications?: Record<string, string>;
  reviewsSummary?: Array<{ buyerName?: string; buyerCountry?: string; rating: number; comment: string }>;
  aliUrl: string;
  affiliateUrl?: string;
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

function AdminIngestContent() {
  const searchParams = useSearchParams();

  const [ingestMode, setIngestMode] = useState<"search" | "url" | "bulk">("search");
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
  const [translatedQueryFeedback, setTranslatedQueryFeedback] = useState<string | null>(null);

  // Bulk Ingestion State
  const [bulkUrlsInput, setBulkUrlsInput] = useState("");
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number; currentItem?: string } | null>(null);
  const [bulkResults, setBulkResults] = useState<any[]>([]);
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [bulkSaveFeedback, setBulkSaveFeedback] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<"edit" | "preview">("preview");

  // Dynamic Categories from API
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Inspect Search Item Modal State
  const [inspectingProduct, setInspectingProduct] = useState<any | null>(null);
  const [singleSavedId, setSingleSavedId] = useState<string | null>(null);

  // Single Product Catalog Integration State
  const [isSavingSingleToCatalog, setIsSavingSingleToCatalog] = useState(false);
  const [savedSingleFeedback, setSavedSingleFeedback] = useState<string | null>(null);
  const [saveAlsoToCatalog, setSaveAlsoToCatalog] = useState(true);
  const [showSpecsExpanded, setShowSpecsExpanded] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Comparison Products State for Top N (3 to 10 products)
  const [selectedComparisonProducts, setSelectedComparisonProducts] = useState<ProductPreview[]>([]);
  const [isLoadingBatch, setIsLoadingBatch] = useState(false);

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

  // Auto-init and listen to URL query params (from bulk-ingest or catalog)
  useEffect(() => {
    fetch("/api/categories", { headers: getAdminHeaders() })
      .then((r) => r.json())
      .then((d) => {
        if (d.categories && d.categories.length > 0) {
          setDbCategories(d.categories);
        }
      })
      .catch(() => {});

    const directUrl = searchParams.get("directUrl");
    const typeParam = searchParams.get("type");
    const catParam = searchParams.get("category");
    const batchIdsParam = searchParams.get("batchIds");

    if (typeParam === "top5" || typeParam === "review" || typeParam === "deal") {
      setPageType(typeParam);
    }
    if (catParam) {
      setCategory(catParam);
    }
    if (directUrl) {
      setIngestMode("url");
      setUrlInput(directUrl);
      handleFetchDirectProduct(directUrl);
    }

    if (batchIdsParam) {
      setPageType("top5");
      const ids = batchIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length > 0) {
        setIsLoadingBatch(true);
        fetch("/api/products", { headers: getAdminHeaders() })
          .then((r) => r.json())
          .then((d) => {
            if (d.products && Array.isArray(d.products)) {
              const matched = d.products.filter(
                (p: any) => ids.includes(p.id) || ids.includes(p.aliId)
              );
              if (matched.length > 0) {
                const formatted: ProductPreview[] = matched.map((p: any) => ({
                  id: p.id,
                  aliId: p.aliId,
                  originalTitle: p.originalTitle,
                  titleHe: p.titleHe || p.originalTitle,
                  priceUsd: p.priceUsd,
                  priceIls: p.priceIls,
                  originalPriceUsd: p.originalPriceUsd,
                  discountPercent: p.discountPercent,
                  rating: p.rating,
                  ordersCount: p.ordersCount,
                  storeName: p.storeName,
                  sellerPositiveRate: p.sellerPositiveRate,
                  mainImage: p.mainImage,
                  galleryImages: Array.isArray(p.galleryImages)
                    ? p.galleryImages
                    : typeof p.galleryImages === "string"
                    ? JSON.parse(p.galleryImages || "[]")
                    : [p.mainImage],
                  specifications: typeof p.specifications === "string"
                    ? JSON.parse(p.specifications || "{}")
                    : p.specifications || {},
                  reviewsSummary: typeof p.reviewsSummary === "string"
                    ? JSON.parse(p.reviewsSummary || "[]")
                    : p.reviewsSummary || [],
                  aliUrl: p.aliUrl,
                  affiliateUrl: p.affiliateUrl,
                  commissionRate: p.commissionRate,
                }));
                setSelectedComparisonProducts(formatted);
                if (matched[0]?.category) {
                  setCategory(matched[0].category);
                }
              }
            }
          })
          .catch((err) => console.error("Failed to load batch products", err))
          .finally(() => setIsLoadingBatch(false));
      }
    }
  }, [searchParams]);

  const handleAddToComparison = (product: ProductPreview) => {
    if (selectedComparisonProducts.some((p) => p.aliId === product.aliId)) {
      return;
    }
    if (selectedComparisonProducts.length >= 10) {
      alert("ניתן לבחור עד 10 מוצרים להשוואת TOP N");
      return;
    }
    setSelectedComparisonProducts((prev) => [...prev, product]);
  };

  const handleRemoveFromComparison = (aliId: string) => {
    setSelectedComparisonProducts((prev) => prev.filter((p) => p.aliId !== aliId));
  };

  const handleMoveComparisonItem = (index: number, direction: "up" | "down") => {
    const newItems = [...selectedComparisonProducts];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setSelectedComparisonProducts(newItems);
  };

  // Health check test for AliExpress API
  const handleTestApi = async () => {
    setIsTestingApi(true);
    setApiTestResult(null);
    try {
      const res = await fetch("/api/aliexpress/test", { headers: getAdminHeaders() });
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

  // Helper to copy text to clipboard with field indicator
  const handleCopyText = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Direct fetch function that can be triggered from Search box or URL box
  const handleFetchDirectProduct = async (rawUrlOrId?: string) => {
    const targetInput = (rawUrlOrId || urlInput).trim().replace(/^[?&/ "'`]+/, "").replace(/["'`]+$/, "");
    if (!targetInput) {
      setErrorMsg("נא להזין קישור למוצר מעלי אקספרס או מזהה פריט");
      return;
    }

    setErrorMsg(null);
    setIsLoadingFetch(true);
    setSavedSingleFeedback(null);

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ urlOrId: targetInput }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בשליפת נתוני המוצר");
      }

      const p = data.product;
      const gallery = Array.isArray(p.galleryImages)
        ? p.galleryImages
        : typeof p.galleryImages === "string"
        ? JSON.parse(p.galleryImages || "[]")
        : [p.mainImage];

      const specs = typeof p.specifications === "string"
        ? JSON.parse(p.specifications || "{}")
        : p.specifications || {};

      const reviews = typeof p.reviewsSummary === "string"
        ? JSON.parse(p.reviewsSummary || "[]")
        : p.reviewsSummary || [];

      setProductData({
        ...p,
        titleHe: p.titleHe || p.originalTitle,
        galleryImages: gallery.length > 0 ? gallery : [p.mainImage],
        specifications: specs,
        reviewsSummary: reviews,
        storeName: p.storeName || "Official AliExpress Store",
        sellerPositiveRate: p.sellerPositiveRate || "98.5%",
        commissionRate: p.commissionRate || 7.0,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "שגיאה בלתי צפויה בשליפה";
      setErrorMsg(msg);
    } finally {
      setIsLoadingFetch(false);
    }
  };

  // Search products via official AliExpress API (Smart: auto-detects direct URLs/IDs)
  const handleSearchProducts = async () => {
    const cleanQ = searchQuery.trim().replace(/^[?&/ "'`]+/, "").replace(/["'`]+$/, "");
    if (!cleanQ) {
      setErrorMsg("נא להזין מילת חיפוש באנגלית או עברית (למשל: baby monitor, mini projector)");
      return;
    }

    // Smart detection: Did user paste a direct AliExpress URL or item ID into the search input?
    if (cleanQ.includes("aliexpress.com") || /item\/(\d+)/.test(cleanQ) || /^\d{10,20}$/.test(cleanQ)) {
      setUrlInput(cleanQ);
      setIngestMode("url");
      await handleFetchDirectProduct(cleanQ);
      return;
    }

    setErrorMsg(null);
    setIsSearching(true);
    setSearchResults([]);
    setSelectedAliIds([]);
    setSaveCatalogSuccess(null);
    setTranslatedQueryFeedback(null);

    try {
      const categoryParam = searchCategory !== "all" ? `&categoryId=${encodeURIComponent(searchCategory)}` : "";
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(cleanQ)}&maxPrice=${searchMaxPrice}&sortBy=${searchSortBy}${categoryParam}`,
        { headers: getAdminHeaders() }
      );
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בחיפוש מוצרים ב-API");
      }
      setSearchResults(data.results || []);
      if (data.translatedQuery) {
        setTranslatedQueryFeedback(`זוהה חיפוש בעברית: תורגם לאנגלית עבור מנוע עלי אקספרס ל-"${data.translatedQuery}"`);
      }
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

  // Bulk Ingestion Handler (processes 1 to 20 URLs/IDs line by line)
  const handleBulkIngest = async () => {
    const rawLines = bulkUrlsInput
      .split(/[\n,]+/)
      .map((l) => l.trim().replace(/^[?&/ "'`]+/, "").replace(/["'`]+$/, ""))
      .filter(Boolean);

    if (rawLines.length === 0) {
      setErrorMsg("נא להזין לפחות קישור אחד או מזהה מוצר בתיבת הייבוא המרובה");
      return;
    }

    if (rawLines.length > 20) {
      setErrorMsg("ניתן לייבא עד 20 מוצרים בכל פעם (לשמירה על קצב הבקשות)");
      return;
    }

    setErrorMsg(null);
    setIsBulkLoading(true);
    setBulkResults([]);
    setBulkSaveFeedback(null);
    setBulkProgress({ current: 0, total: rawLines.length });

    const collected: any[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i];
      setBulkProgress({ current: i + 1, total: rawLines.length, currentItem: line });

      try {
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: getAdminHeaders(),
          body: JSON.stringify({ urlOrId: line, category }),
        });
        const data = await res.json();
        if (data.success && data.product) {
          collected.push({ ...data.product, success: true, input: line });
        } else {
          collected.push({ success: false, error: data.error || "שגיאה במשיכת פריט", input: line });
        }
      } catch (e: any) {
        collected.push({ success: false, error: e?.message || "שגיאת רשת", input: line });
      }
    }

    setBulkResults(collected);
    const successIds = collected.filter((c) => c.success).map((c) => c.aliId);
    setSelectedBulkIds(successIds);
    setIsBulkLoading(false);
    setBulkProgress(null);
  };

  // Save all selected bulk items to central catalog
  const handleSaveBulkToCatalog = async () => {
    const validItems = bulkResults.filter((r) => r.success && selectedBulkIds.includes(r.aliId));
    if (validItems.length === 0) return;

    setIsSavingCatalog(true);
    setBulkSaveFeedback(null);
    let count = 0;

    for (const item of validItems) {
      try {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: getAdminHeaders(),
          body: JSON.stringify({
            aliId: item.aliId,
            originalTitle: item.originalTitle,
            titleHe: item.titleHe || item.originalTitle,
            priceUsd: item.priceUsd,
            priceIls: item.priceIls,
            originalPriceUsd: item.originalPriceUsd,
            discountPercent: item.discountPercent,
            rating: item.rating,
            ordersCount: item.ordersCount,
            mainImage: item.mainImage,
            galleryImages: item.galleryImages || [item.mainImage],
            aliUrl: item.aliUrl,
            affiliateUrl: item.affiliateUrl || item.aliUrl,
            category: category,
            storeName: item.storeName || "Official AliExpress Store",
            sellerPositiveRate: item.sellerPositiveRate || "98.5%",
            commissionRate: item.commissionRate || 7.0,
          }),
        });
        if (res.ok) {
          count++;
        }
      } catch {}
    }

    setBulkSaveFeedback(`${count} מוצרים נשמרו בהצלחה למאגר המוצרים המרכזי (/admin/products)!`);
    setIsSavingCatalog(false);
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
        const res = await fetch("/api/products", {
          method: "POST",
          headers: getAdminHeaders(),
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
        if (res.ok) {
          count++;
        }
      }
      setSaveCatalogSuccess(`${count} מוצרים נשמרו בהצלחה למאגר המוצרים המרכזי!`);
      setSelectedAliIds([]);
    } catch (err: any) {
      setErrorMsg(err.message || "שגיאה בשמירת מוצרים למאגר");
    } finally {
      setIsSavingCatalog(false);
    }
  };

  // 1-Click Save direct search item to catalog
  const handleSaveSearchItemToCatalog = async (item: any) => {
    setSingleSavedId(item.aliId);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          aliId: item.aliId,
          originalTitle: item.originalTitle,
          titleHe: item.titleHe || item.originalTitle,
          priceUsd: item.priceUsd,
          priceIls: item.priceIls,
          originalPriceUsd: item.originalPriceUsd,
          discountPercent: item.discountPercent,
          rating: item.rating,
          ordersCount: item.ordersCount,
          mainImage: item.mainImage,
          galleryImages: item.galleryImages || [item.mainImage],
          aliUrl: item.aliUrl,
          affiliateUrl: item.affiliateUrl || item.aliUrl,
          category: category,
          storeName: item.storeName || "Official AliExpress Store",
          sellerPositiveRate: item.sellerPositiveRate || "98.5%",
          commissionRate: item.commissionRate || 7.0,
        }),
      });
      if (!res.ok) {
        throw new Error("שגיאה בשמירת המוצר לקטלוג");
      }
      setTimeout(() => {
        setSingleSavedId((prev) => (prev === item.aliId ? null : prev));
      }, 3000);
    } catch {
      alert("שגיאה בשמירת המוצר לקטלוג");
      setSingleSavedId(null);
    }
  };

  // Save single active product to central catalog (/admin/products)
  const handleSaveSingleProductToCatalog = async () => {
    if (!productData) return;
    setIsSavingSingleToCatalog(true);
    setSavedSingleFeedback(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          aliId: productData.aliId,
          originalTitle: productData.originalTitle,
          titleHe: productData.titleHe || productData.originalTitle,
          priceUsd: productData.priceUsd,
          priceIls: productData.priceIls,
          originalPriceUsd: productData.originalPriceUsd,
          discountPercent: productData.discountPercent,
          rating: productData.rating,
          ordersCount: productData.ordersCount,
          mainImage: productData.mainImage,
          galleryImages: productData.galleryImages || [productData.mainImage],
          aliUrl: productData.aliUrl,
          affiliateUrl: productData.affiliateUrl || productData.aliUrl,
          category: category,
          storeName: productData.storeName || "Official AliExpress Store",
          sellerPositiveRate: productData.sellerPositiveRate || "98.5%",
          commissionRate: productData.commissionRate || 7.0,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSavedSingleFeedback("המוצר נשמר בהצלחה כרשומה ראשית במאגר המוצרים המרכזי!");
      } else {
        throw new Error(data.error || "שגיאה בשמירה למאגר");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "שגיאה בשמירת המוצר לקטלוג");
    } finally {
      setIsSavingSingleToCatalog(false);
    }
  };

  const handleSelectSearchResult = (item: any) => {
    setUrlInput(item.aliUrl || `https://www.aliexpress.com/item/${item.aliId}.html`);
    const gallery = Array.isArray(item.galleryImages)
      ? item.galleryImages
      : typeof item.galleryImages === "string"
      ? JSON.parse(item.galleryImages || "[]")
      : [item.mainImage];

    setProductData({
      id: `prod_${item.aliId}`,
      aliId: item.aliId,
      originalTitle: item.originalTitle,
      titleHe: item.titleHe || item.originalTitle,
      priceUsd: item.priceUsd,
      priceIls: item.priceIls,
      originalPriceUsd: item.originalPriceUsd,
      discountPercent: item.discountPercent,
      rating: item.rating,
      ordersCount: item.ordersCount,
      mainImage: item.mainImage,
      galleryImages: gallery.length > 0 ? gallery : [item.mainImage],
      storeName: item.storeName || "Official AliExpress Store",
      sellerPositiveRate: item.sellerPositiveRate || "98.5%",
      commissionRate: item.commissionRate || 7.0,
      specifications: item.specifications || {},
      reviewsSummary: item.reviewsSummary || [],
      aliUrl: item.aliUrl,
      affiliateUrl: item.affiliateUrl || item.aliUrl,
    });
    setSavedSingleFeedback(null);
  };

  // Step 1: Ingest product from AliExpress via URL button
  const handleFetchProduct = () => handleFetchDirectProduct();

  // Step 2: Trigger Gemini Content & Infographic Generator
  const handleGenerateContent = async () => {
    setErrorMsg(null);

    if (pageType === "top5") {
      if (selectedComparisonProducts.length < 3) {
        setErrorMsg("יש לבחור לפחות 3 מוצרים (ועד 10) ליצירת עמוד השוואת TOP N");
        return;
      }
      setIsLoadingGenerate(true);
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: getAdminHeaders(),
          body: JSON.stringify({
            pageType: "top5",
            products: selectedComparisonProducts,
            productIds: selectedComparisonProducts.map((p) => p.aliId || p.id),
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
      return;
    }

    if (!productData) {
      setErrorMsg("נא להזין מוצר תחילה");
      return;
    }

    setIsLoadingGenerate(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          pageType,
          productId: productData.id || productData.aliId,
          productData,
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
      // If user selected to also save to central catalog:
      if (saveAlsoToCatalog && productData) {
        try {
          await fetch("/api/products", {
            method: "POST",
            headers: getAdminHeaders(),
            body: JSON.stringify({
              aliId: productData.aliId,
              originalTitle: productData.originalTitle,
              titleHe: productData.titleHe || productData.originalTitle,
              priceUsd: productData.priceUsd,
              priceIls: productData.priceIls,
              originalPriceUsd: productData.originalPriceUsd,
              discountPercent: productData.discountPercent,
              rating: productData.rating,
              ordersCount: productData.ordersCount,
              mainImage: productData.mainImage,
              galleryImages: productData.galleryImages || [productData.mainImage],
              aliUrl: productData.aliUrl,
              affiliateUrl: productData.affiliateUrl || productData.aliUrl,
              category: category,
              storeName: productData.storeName || "Official AliExpress Store",
              sellerPositiveRate: productData.sellerPositiveRate || "98.5%",
              commissionRate: productData.commissionRate || 7.0,
            }),
          });
        } catch (catErr) {
          console.warn("Could not auto-save to catalog:", catErr);
        }
      }

      let prodIds: string[] = [];
      let featImage = productData?.mainImage;

      if (pageDraft.type === "top5") {
        prodIds = selectedComparisonProducts.map((p) => p.aliId || p.id);
        featImage = selectedComparisonProducts[0]?.mainImage || featImage;
      } else if (productData) {
        prodIds = [productData.aliId];
      }

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({
          ...pageDraft,
          featuredImage: featImage,
          productIds: prodIds,
          autoPush: autoGitPush,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בשמירת העמוד");
      }

      let routePrefix = "reviews";
      if (pageDraft.type === "top5") routePrefix = "top5";
      else if (pageDraft.type === "deal") routePrefix = "deals";

      setPublishedUrl(`/${routePrefix}/${pageDraft.slug}`);
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
                <h4 className="font-bold text-sm text-slate-900">השוואת TOP N (3 עד 10 מוצרים)</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">טבלת השוואה מדורגת, תמורה לכסף ובחירת העורכים מ-3 עד 10 מוצרים</p>
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
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700">קטגוריה באתר:</label>
            <Link
              href="/admin/categories"
              className="text-[11px] font-bold text-ali-600 hover:text-ali-700 hover:underline flex items-center gap-1"
            >
              <span>+ עריכת קטגוריות ותגיות</span>
            </Link>
          </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500"
          >
            {dbCategories.length > 0 ? (
              dbCategories.map((c) => (
                <option key={c.id} value={c.nameHe}>
                  {c.icon || "🏷️"} {c.nameHe}
                </option>
              ))
            ) : (
              <>
                <option value="אלקטרוניקה וגאדג'טים">🔌 אלקטרוניקה וגאדג&apos;טים</option>
                <option value="לבית, למטבח ולגינה">🏠 לבית, למטבח ולגינה</option>
                <option value="מחשבים, גיימינג וציוד משרדי">💻 מחשבים, גיימינג וציוד משרדי</option>
                <option value="סמארטפונים, שעונים ואביזרים">📱 סמארטפונים, שעונים ואביזרים</option>
                <option value="ציוד ואביזרים לרכב">🚗 ציוד ואביזרים לרכב</option>
                <option value="כלי עבודה ושיפוץ הבית">🛠️ כלי עבודה ושיפוץ הבית</option>
                <option value="ספורט, כושר ומחנאות">⚽ ספורט, כושר ומחנאות</option>
                <option value="תינוקות, ילדים ומשחקים">👶 תינוקות, ילדים ומשחקים</option>
              </>
            )}
          </select>
        </div>

        {/* Ingest Mode Toggle & Inputs */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 flex-wrap">
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
            <button
              type="button"
              onClick={() => setIngestMode("bulk")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                ingestMode === "bulk"
                  ? "bg-ali-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <ListPlus className="w-3.5 h-3.5" />
              <span>ייבוא מרובה (Bulk URLs / IDs)</span>
            </button>
          </div>

          {ingestMode === "search" ? (
            <div className="space-y-4">
              {/* Search Inputs & Filters Grid */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="הזן מילת חיפוש בעברית או באנגלית (למשל: מקרן נייד, baby monitor, שעון חכם)..."
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

                {/* Popular Israeli Quick Search Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px]">
                  <span className="text-slate-400 font-bold">חיפושים פופולריים:</span>
                  {[
                    "מקרן נייד",
                    "שעון חכם",
                    "אוזניות אלחוטיות",
                    "רחפן צילום",
                    "מצלמת דרך לרכב",
                    "מברגת אימפקט",
                    "שואב שוטף",
                    "baby monitor",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => {
                        setSearchQuery(chip);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-ali-50 text-slate-700 hover:text-ali-700 border border-slate-200 hover:border-ali-300 font-medium transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {translatedQueryFeedback && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
                    <span>{translatedQueryFeedback}</span>
                  </div>
                )}

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
                      {dbCategories.length > 0 ? (
                        dbCategories.map((cat) => (
                          <option key={cat.id} value={cat.aliCategoryId || cat.slug}>
                            {cat.icon || "🏷️"} {cat.nameHe} {cat.aliCategoryId ? `(ID: ${cat.aliCategoryId})` : ""}
                          </option>
                        ))
                      ) : (
                        <>
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
                        </>
                      )}
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
                        const chosen = searchResults.filter((i) => selectedAliIds.includes(i.aliId));
                        if (chosen.length > 0) {
                          const formatted: ProductPreview[] = chosen.map((item) => ({
                            id: `prod_${item.aliId}`,
                            aliId: item.aliId,
                            originalTitle: item.originalTitle,
                            titleHe: item.titleHe || item.originalTitle,
                            priceUsd: item.priceUsd,
                            priceIls: item.priceIls,
                            originalPriceUsd: item.originalPriceUsd,
                            discountPercent: item.discountPercent,
                            rating: item.rating,
                            ordersCount: item.ordersCount,
                            storeName: item.storeName || "Official AliExpress Store",
                            sellerPositiveRate: item.sellerPositiveRate || "98.5%",
                            commissionRate: item.commissionRate || 7.0,
                            mainImage: item.mainImage,
                            galleryImages: item.galleryImages || [item.mainImage],
                            specifications: item.specifications || {},
                            reviewsSummary: item.reviewsSummary || [],
                            aliUrl: item.aliUrl,
                            affiliateUrl: item.affiliateUrl || item.aliUrl,
                          }));
                          setSelectedComparisonProducts((prev) => {
                            const existingAliIds = new Set(prev.map((p) => p.aliId));
                            const toAdd = formatted.filter((p) => !existingAliIds.has(p.aliId));
                            return [...prev, ...toAdd].slice(0, 10);
                          });
                        }
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>הוסף {selectedAliIds.length} מוצרים למגש TOP N ←</span>
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
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="font-black text-slate-900 text-sm">₪{item.priceIls}</span>
                                <span className="text-xs text-slate-500 font-semibold">(${item.priceUsd})</span>
                                {item.originalPriceUsd && item.originalPriceUsd > item.priceUsd && (
                                  <span className="text-[10px] text-slate-400 line-through">${item.originalPriceUsd}</span>
                                )}
                                {item.discountPercent ? (
                                  <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1 py-0.2 rounded">
                                    -{item.discountPercent}%
                                  </span>
                                ) : null}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                  <Star className="w-3 h-3 fill-amber-400" />
                                  <span>{item.rating}</span>
                                </span>
                                <span>•</span>
                                <span className="text-slate-600 font-medium">{item.ordersCount}+ מכירות</span>
                                {item.commissionRate ? (
                                  <>
                                    <span>•</span>
                                    <span className="text-emerald-700 font-bold">{item.commissionRate}% עמלה</span>
                                  </>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {/* Customs Badge & 2$ Safety Alert */}
                          <div>
                            <CustomsBadge priceUsd={item.priceUsd} showDetails={false} />
                          </div>

                          {/* Action Buttons: Inspect Data, Save to Catalog, Select for Review */}
                          <div className="grid grid-cols-5 gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => setInspectingProduct(item)}
                              className="col-span-1 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors"
                              title="צפה בכל המידע שנאסף על מוצר זה"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleSaveSearchItemToCatalog(item)}
                              className={`col-span-1 p-2 rounded-xl border flex items-center justify-center transition-all ${
                                singleSavedId === item.aliId
                                  ? "bg-emerald-600 border-emerald-600 text-white"
                                  : "bg-white border-slate-200 hover:border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                              }`}
                              title={singleSavedId === item.aliId ? "נשמר בהצלחה!" : "שמור מוצר לקטלוג המרכזי"}
                            >
                              {singleSavedId === item.aliId ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <PackagePlus className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (pageType === "top5") {
                                  const isAlreadyIn = selectedComparisonProducts.some((p) => p.aliId === item.aliId);
                                  if (isAlreadyIn) {
                                    handleRemoveFromComparison(item.aliId);
                                  } else {
                                    handleAddToComparison({
                                      id: `prod_${item.aliId}`,
                                      aliId: item.aliId,
                                      originalTitle: item.originalTitle,
                                      titleHe: item.titleHe || item.originalTitle,
                                      priceUsd: item.priceUsd,
                                      priceIls: item.priceIls,
                                      originalPriceUsd: item.originalPriceUsd,
                                      discountPercent: item.discountPercent,
                                      rating: item.rating,
                                      ordersCount: item.ordersCount,
                                      storeName: item.storeName || "Official AliExpress Store",
                                      sellerPositiveRate: item.sellerPositiveRate || "98.5%",
                                      commissionRate: item.commissionRate || 7.0,
                                      mainImage: item.mainImage,
                                      galleryImages: item.galleryImages || [item.mainImage],
                                      specifications: item.specifications || {},
                                      reviewsSummary: item.reviewsSummary || [],
                                      aliUrl: item.aliUrl,
                                      affiliateUrl: item.affiliateUrl || item.aliUrl,
                                    });
                                  }
                                } else {
                                  handleSelectSearchResult(item);
                                }
                              }}
                              className={`col-span-3 py-2 px-2 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1 shadow-sm truncate ${
                                pageType === "top5"
                                  ? selectedComparisonProducts.some((p) => p.aliId === item.aliId)
                                    ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                  : "bg-slate-900 hover:bg-ali-600 text-white"
                              }`}
                            >
                              {pageType === "top5" ? (
                                selectedComparisonProducts.some((p) => p.aliId === item.aliId) ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 shrink-0" />
                                    <span>במגש (הסר)</span>
                                  </>
                                ) : (
                                  <>
                                    <ListPlus className="w-3.5 h-3.5 shrink-0" />
                                    <span>+ הוסף להשוואה</span>
                                  </>
                                )
                              ) : pageType === "deal" ? (
                                <>
                                  <span>בחר לדיל בזק</span>
                                  <span>←</span>
                                </>
                              ) : (
                                <>
                                  <span>בחר לסקירה</span>
                                  <span>←</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : ingestMode === "url" ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="https://www.aliexpress.com/item/1005006392019482.html או s.click.aliexpress.com או מזהה מוצר..."
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFetchProduct()}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-ali-500 font-medium"
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
              <p className="text-[11px] text-slate-500">
                💡 תומך בכל פורמט: קישור ישיר למוצר, קישור מקוצר (s.click), קישור שותפים קיים, או מספר מזהה בלבד (Item ID).
              </p>
            </div>
          ) : (
            /* Bulk Ingestion Mode */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>הדבק רשימת קישורים או מזהי פריטים (1 עד 20 מוצרים):</span>
                    <span className="text-[11px] text-slate-500 font-normal">שורה חדשה או פסיק עבור כל מוצר</span>
                  </label>
                  <textarea
                    rows={5}
                    placeholder={`https://www.aliexpress.com/item/1005006392019482.html\nhttps://s.click.aliexpress.com/e/_Dk12345\n1005005820492810`}
                    value={bulkUrlsInput}
                    onChange={(e) => setBulkUrlsInput(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500 leading-relaxed"
                  />
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-500">
                    ⚡ המערכת תמשוך את כל הנתונים, תייצר קישורי שותפים מאומתים ותציג כרטיסי מוצר לשמירה מרוכזת בקטלוג או סקירות.
                  </div>

                  <button
                    type="button"
                    onClick={handleBulkIngest}
                    disabled={isBulkLoading}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs transition-all disabled:opacity-50 shadow-sm shrink-0"
                  >
                    {isBulkLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>מושך נתונים במקביל ({bulkProgress?.current || 0}/{bulkProgress?.total || 0})...</span>
                      </>
                    ) : (
                      <>
                        <ListPlus className="w-4 h-4" />
                        <span>התחל ייבוא מרובה (Bulk Ingest)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Progress bar */}
              {isBulkLoading && bulkProgress && (
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-950">
                    <span>מעבד פריט {bulkProgress.current} מתוך {bulkProgress.total}...</span>
                    <span>{Math.round((bulkProgress.current / bulkProgress.total) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-indigo-200 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300"
                      style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                  {bulkProgress.currentItem && (
                    <span className="text-[10px] text-indigo-700 font-mono truncate block">
                      מקור פעיל: {bulkProgress.currentItem}
                    </span>
                  )}
                </div>
              )}

              {/* Bulk Results & Actions */}
              {bulkResults.length > 0 && (
                <div className="space-y-4 pt-2">
                  {/* Bulk Actions Header */}
                  <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
                    <div>
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>נשלפו בהצלחה {bulkResults.filter((r) => r.success).length} מתוך {bulkResults.length} פריטים</span>
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        לכל פריט הופק קישור אפיליאציה מאומת. סמן מוצרים לשמירה מרוכזת בקטלוג:
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveBulkToCatalog}
                        disabled={isSavingCatalog || selectedBulkIds.length === 0}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
                      >
                        {isSavingCatalog ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <PackagePlus className="w-3.5 h-3.5" />
                        )}
                        <span>שמור {selectedBulkIds.length} מוצרים לקטלוג המרכזי</span>
                      </button>
                    </div>
                  </div>

                  {bulkSaveFeedback && (
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{bulkSaveFeedback}</span>
                      <Link href="/admin/products" className="mr-auto underline text-emerald-900">
                        צפה בקטלוג המוצרים ←
                      </Link>
                    </div>
                  )}

                  {/* Bulk Products Cards Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {bulkResults.map((item, idx) => {
                      if (!item.success) {
                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-2xl border border-rose-200 bg-rose-50/50 space-y-2 text-xs"
                          >
                            <div className="flex items-center gap-1.5 text-rose-700 font-bold">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <span>שגיאה במשיכת פריט #{idx + 1}</span>
                            </div>
                            <p className="text-[11px] font-mono text-slate-600 truncate" title={item.input}>
                              מקור: {item.input}
                            </p>
                            <p className="text-[11px] text-rose-600">{item.error}</p>
                          </div>
                        );
                      }

                      const isChecked = selectedBulkIds.includes(item.aliId);

                      return (
                        <div
                          key={item.aliId || idx}
                          className={`relative p-3.5 rounded-2xl border transition-all flex flex-col justify-between space-y-3 bg-white ${
                            isChecked
                              ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20"
                              : "border-slate-200 hover:border-ali-400 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  setSelectedBulkIds((prev) =>
                                    prev.includes(item.aliId)
                                      ? prev.filter((id) => id !== item.aliId)
                                      : [...prev, item.aliId]
                                  )
                                }
                                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                              />
                              <span className="text-[10px] font-bold text-slate-600">סמן לקטלוג</span>
                            </label>

                            <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                              ID: {item.aliId}
                            </span>
                          </div>

                          <div className="flex gap-3">
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                              <Image src={item.mainImage} alt="" fill className="object-cover" sizes="64px" />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1">
                              <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug" title={item.titleHe || item.originalTitle}>
                                {item.titleHe || item.originalTitle}
                              </h4>
                              <div className="flex items-baseline gap-1.5">
                                <span className="text-sm font-black text-slate-900">₪{item.priceIls}</span>
                                <span className="text-[11px] font-semibold text-slate-500">(${item.priceUsd})</span>
                              </div>
                            </div>
                          </div>

                          {/* Affiliate Link Badge */}
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-[10px]">
                            <span className="font-bold text-slate-500">קישור שותפים:</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopyText(item.affiliateUrl || item.aliUrl, `bulk_aff_${item.aliId}`)}
                                className="text-slate-600 hover:text-slate-900 font-bold"
                              >
                                {copiedField === `bulk_aff_${item.aliId}` ? "הועתק!" : "העתק"}
                              </button>
                              <a
                                href={item.affiliateUrl || item.aliUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-ali-600 hover:underline flex items-center gap-0.5"
                              >
                                <span>בדוק</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            type="button"
                            onClick={() => {
                              if (pageType === "top5") {
                                const isAlreadyIn = selectedComparisonProducts.some((p) => p.aliId === item.aliId);
                                if (isAlreadyIn) {
                                  handleRemoveFromComparison(item.aliId);
                                } else {
                                  handleAddToComparison({
                                    id: `prod_${item.aliId}`,
                                    aliId: item.aliId,
                                    originalTitle: item.originalTitle,
                                    titleHe: item.titleHe || item.originalTitle,
                                    priceUsd: item.priceUsd,
                                    priceIls: item.priceIls,
                                    originalPriceUsd: item.originalPriceUsd,
                                    discountPercent: item.discountPercent,
                                    rating: item.rating,
                                    ordersCount: item.ordersCount,
                                    storeName: item.storeName || "Official AliExpress Store",
                                    sellerPositiveRate: item.sellerPositiveRate || "98.5%",
                                    commissionRate: item.commissionRate || 7.0,
                                    mainImage: item.mainImage,
                                    galleryImages: item.galleryImages || [item.mainImage],
                                    specifications: item.specifications || {},
                                    reviewsSummary: item.reviewsSummary || [],
                                    aliUrl: item.aliUrl,
                                    affiliateUrl: item.affiliateUrl || item.aliUrl,
                                  });
                                }
                              } else {
                                handleSelectSearchResult(item);
                              }
                            }}
                            className={`w-full py-2 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm ${
                              pageType === "top5"
                                ? selectedComparisonProducts.some((p) => p.aliId === item.aliId)
                                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                                  : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                                : "bg-slate-900 hover:bg-ali-600 text-white"
                            }`}
                          >
                            {pageType === "top5" ? (
                              selectedComparisonProducts.some((p) => p.aliId === item.aliId) ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>במגש השוואת TOP N (הסר)</span>
                                </>
                              ) : (
                                <>
                                  <ListPlus className="w-3.5 h-3.5" />
                                  <span>+ הוסף למגש השוואת TOP N</span>
                                </>
                              )
                            ) : pageType === "deal" ? (
                              <>
                                <Flame className="w-3.5 h-3.5 text-amber-400" />
                                <span>בחר מוצר זה לדיל בזק ←</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span>בחר מוצר זה לג&apos;נרוט סקירה ←</span>
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Step 2 for Top N Comparison: When pageType === "top5" */}
      {pageType === "top5" && (
        <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span>מגש השוואת מוצרים - TOP {selectedComparisonProducts.length}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold ${
                    selectedComparisonProducts.length >= 3 && selectedComparisonProducts.length <= 10
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-800"
                  }`}>
                    {selectedComparisonProducts.length} מתוך 10 מוצרים נבחרו
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  סדר הדירוג נקבע לפי המיקום ברשימה (#1 בחירת העורכים, #2 תמורה לכסף, #3 בחירה תקציבית וכו&apos;). ניתן להזיז או להסיר פריטים.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/products"
                className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1"
              >
                <span>בחר עוד מהקטלוג</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
              {selectedComparisonProducts.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedComparisonProducts([])}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200"
                >
                  נקה מגש
                </button>
              )}
            </div>
          </div>

          {isLoadingBatch && (
            <div className="p-4 rounded-xl bg-indigo-50 text-indigo-700 flex items-center gap-2 text-xs font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>טוען מוצרים שנבחרו מקטלוג המוצרים...</span>
            </div>
          )}

          {selectedComparisonProducts.length < 3 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <div className="space-y-0.5">
                <p className="font-bold">
                  נדרשים לפחות 3 מוצרים (ועד 10) ליצירת טבלת השוואת TOP N איכותית (כרגע נבחרו {selectedComparisonProducts.length}).
                </p>
                <p className="text-amber-700">
                  הוסף מוצרים נוספים בעזרת החיפוש למעלה (חפש והקלק &quot;+ הוסף להשוואה&quot;) או סמן מוצרים ב-
                  <Link href="/admin/products" className="underline font-bold mr-1">קטלוג המוצרים</Link>.
                </p>
              </div>
            </div>
          )}

          {selectedComparisonProducts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedComparisonProducts.map((p, idx) => {
                const rankLabels = [
                  "🥇 #1 בחירת העורכים",
                  "🥈 #2 התמורה הטובה למחיר",
                  "🥉 #3 הבחירה התקציבית",
                  "⭐ #4 הבחירה הפרימיום",
                  "🔥 #5 הבחירה הפופולרית",
                  "💎 #6 עיצוב וחדשנות",
                  "⚡ #7 ביצועים מובילים",
                  "🛡️ #8 אמינות ועמידות",
                  "🎯 #9 בחירת הקהל",
                  "🌟 #10 ציון לשבח",
                ];
                const rankLabel = rankLabels[idx] || `#${idx + 1} מדורג`;

                return (
                  <div
                    key={p.aliId || idx}
                    className="p-4 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/20 to-white shadow-sm flex flex-col justify-between space-y-3 relative group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                        {rankLabel}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveComparisonItem(idx, "up")}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                          title="הזז למעלה בדירוג"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === selectedComparisonProducts.length - 1}
                          onClick={() => handleMoveComparisonItem(idx, "down")}
                          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-20"
                          title="הזז למטה בדירוג"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromComparison(p.aliId)}
                          className="p-1 rounded-md text-rose-400 hover:text-rose-700 hover:bg-rose-50"
                          title="הסר מההשוואה"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 shrink-0">
                        <Image src={p.mainImage} alt="" fill className="object-cover" sizes="64px" />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-snug" title={p.titleHe || p.originalTitle}>
                          {p.titleHe || p.originalTitle}
                        </h4>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-black text-slate-900">₪{p.priceIls}</span>
                          <span className="text-[11px] font-semibold text-slate-500">(${p.priceUsd})</span>
                          {p.rating && (
                            <span className="text-[10px] text-amber-500 font-bold flex items-center gap-0.5 mr-auto">
                              <Star className="w-2.5 h-2.5 fill-amber-400" />
                              {p.rating}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <CustomsBadge priceUsd={p.priceUsd} showDetails={false} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trigger Button */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleGenerateContent}
              disabled={isLoadingGenerate || selectedComparisonProducts.length < 3 || selectedComparisonProducts.length > 10}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all disabled:opacity-50"
            >
              {isLoadingGenerate ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Gemini מחבר השוואת TOP {selectedComparisonProducts.length} מעמיקה...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>ג&apos;נרט עמוד השוואת TOP {selectedComparisonProducts.length} ב-Gemini AI ←</span>
                </>
              )}
            </button>

            <span className="text-xs text-slate-500">
              כולל טבלת השוואה מקיפה, יתרונות/חסרונות, סכמת ItemList וקישורי אפיליאציה לכל פריט.
            </span>
          </div>
        </section>
      )}

      {/* Step 2: Comprehensive Product Intelligence & Catalog Decision */}
      {pageType !== "top5" && productData && (
        <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-300">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                2
              </div>
              <div>
                <h2 className="font-bold text-base text-slate-900">כל נתוני המוצר שנאספו מאלי אקספרס</h2>
                <p className="text-xs text-slate-500">בדוק את כל המאפיינים, בחר תמונת נושא, והחלט אם לשמור לקטלוג המרכזי</p>
              </div>
            </div>

            {/* Product ID & Original Link */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              <button
                type="button"
                onClick={() => handleCopyText(productData.aliId, "id")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] transition-colors"
                title="לחץ להעתקת מזהה הפריט"
              >
                {copiedField === "id" ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>ID: {productData.aliId}</span>
              </button>

              <a
                href={productData.aliUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
              >
                <span>פתח בעלי אקספרס</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Main Showcase Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Gallery Column (4 cols) */}
            <div className="lg:col-span-4 space-y-3">
              {/* Selected Main Image Preview */}
              <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 shadow-inner">
                <Image
                  src={productData.mainImage}
                  alt={productData.originalTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 300px"
                  priority
                />
              </div>

              {/* Gallery Thumbnails Strip */}
              {productData.galleryImages && productData.galleryImages.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-600 block">
                    גלריית תמונות שנשלפה ({productData.galleryImages.length} תמונות - לחץ לבחירת תמונה ראשית):
                  </span>
                  <div className="flex gap-2 overflow-x-auto p-1 max-h-24">
                    {productData.galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProductData({ ...productData, mainImage: img })}
                        className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                          productData.mainImage === img
                            ? "border-ali-600 ring-2 ring-ali-500/30 scale-105"
                            : "border-slate-200 opacity-70 hover:opacity-100"
                        }`}
                      >
                        <Image src={img} alt={`תמונה ${idx + 1}`} fill className="object-cover" sizes="56px" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Details & Decision Column (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Original Title & Editable Title */}
              <div className="space-y-2">
                <div className="text-[11px] text-slate-500 font-mono line-clamp-1" title={productData.originalTitle}>
                  שם מקורי באלי אקספרס: {productData.originalTitle}
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                    <span>כותרת המוצר בעברית (ניתן לערוך לפני פרסום):</span>
                    <span className="text-[10px] text-slate-400 font-normal">יופיע בסקירה ובמאגר</span>
                  </label>
                  <input
                    type="text"
                    value={productData.titleHe || productData.originalTitle}
                    onChange={(e) => setProductData({ ...productData, titleHe: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-ali-500 transition-all"
                  />
                </div>
              </div>

              {/* Price, Customs and Quality Indicators */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-black text-slate-900">₪{productData.priceIls}</span>
                    <span className="text-sm font-bold text-slate-500">(${productData.priceUsd})</span>
                    {productData.originalPriceUsd && productData.originalPriceUsd > productData.priceUsd && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <span className="line-through">${productData.originalPriceUsd}</span>
                        {productData.discountPercent ? (
                          <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px]">
                            -{productData.discountPercent}% הנחה
                          </span>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* Social proof & Seller */}
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <div className="flex items-center gap-1 text-amber-500 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{productData.rating}</span>
                      <span className="text-slate-400 font-normal">({productData.ordersCount}+ הזמנות)</span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm font-medium">
                      <Store className="w-3.5 h-3.5 text-slate-400" />
                      <span>{productData.storeName || "Official Store"}</span>
                      {productData.sellerPositiveRate && (
                        <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-1 py-0.2 rounded">
                          {productData.sellerPositiveRate}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Customs Safety Badge with Full Details */}
                <div className="pt-2 border-t border-slate-200">
                  <CustomsBadge priceUsd={productData.priceUsd} showDetails={true} />
                </div>
              </div>

              {/* Affiliate Link Preview & Test Bar */}
              {productData.affiliateUrl && (
                <div className="p-3 rounded-xl bg-slate-100/70 border border-slate-200 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-slate-500 block">קישור שותפים רשמי:</span>
                    <span className="font-mono text-[11px] text-slate-700 truncate block">
                      {productData.affiliateUrl}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyText(productData.affiliateUrl || "", "afflink")}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-bold transition-colors"
                    >
                      {copiedField === "afflink" ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>{copiedField === "afflink" ? "הועתק!" : "העתק"}</span>
                    </button>
                    <a
                      href={productData.affiliateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                      title="בדוק תקינות קישור בחלון חדש"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {/* Specifications Dropdown Preview */}
              {productData.specifications && Object.keys(productData.specifications).length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setShowSpecsExpanded(!showSpecsExpanded)}
                    className="w-full p-2.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between font-bold text-slate-800 transition-colors"
                  >
                    <span>מפרט טכני ומאפיינים שנאספו ({Object.keys(productData.specifications).length} פריטים)</span>
                    {showSpecsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showSpecsExpanded && (
                    <div className="p-3 bg-white divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {Object.entries(productData.specifications).map(([key, val]) => (
                        <div key={key} className="py-1.5 flex justify-between gap-4 text-[11px]">
                          <span className="font-semibold text-slate-600">{key}:</span>
                          <span className="text-slate-900 text-left font-mono">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CRITICAL USER REQUIREMENT: Central Product Catalog Decision Hub */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-emerald-50/50 to-teal-50 border border-emerald-300 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20 shrink-0">
                      <Package className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                        שמירה כרשומה ראשית במאגר המוצרים המרכזי (/admin/products)
                      </h4>
                      <p className="text-[11px] text-emerald-800 leading-snug">
                        הכנסת המוצר לקטלוג המרכזי מאפשרת לך למשוך אותו לכל השוואת TOP 5, לעדכן את קישור השותפים שלו במקום אחד לכל האתר, וליצור סביבו סקירות.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveSingleProductToCatalog}
                    disabled={isSavingSingleToCatalog}
                    className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all shrink-0 disabled:opacity-50"
                  >
                    {isSavingSingleToCatalog ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <PackagePlus className="w-3.5 h-3.5" />
                    )}
                    <span>שמור מוצר זה כעת לקטלוג המרכזי</span>
                  </button>
                </div>

                {savedSingleFeedback && (
                  <div className="p-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{savedSingleFeedback}</span>
                    </span>
                    <Link href="/admin/products" className="text-emerald-900 underline text-[11px]">
                      עבור לצפייה בקטלוג המוצרים ←
                    </Link>
                  </div>
                )}
              </div>

              {/* Gemini Generation Trigger Card */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleGenerateContent}
                  disabled={isLoadingGenerate}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-sm shadow-md shadow-ali-500/20 transition-all disabled:opacity-50"
                >
                  {isLoadingGenerate ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>
                        {pageType === "deal"
                          ? "Gemini מעצב דף דיל בזק עם טיימר והנעה לפעולה..."
                          : "Gemini מחבר סקירה מעמיקה ואינפוגרפיקה..."}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {pageType === "deal"
                          ? "ג'נרט עמוד דיל בזק (Flash Deal) ב-Gemini AI ←"
                          : "ג'נרט עמוד סקירה מלא ב-Gemini AI ←"}
                      </span>
                    </>
                  )}
                </button>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAlsoToCatalog}
                    onChange={(e) => setSaveAlsoToCatalog(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>שמור אוטומטית לקטלוג המרכזי בעת פרסום העמוד</span>
                </label>
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

          {/* Article Hero Showcase */}
          {pageDraft.type === "top5" && selectedComparisonProducts.length > 0 ? (
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-900">
                  השוואת TOP {selectedComparisonProducts.length} מוצרים בקטגוריית {category}:
                </span>
                <span className="text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-md border border-indigo-100">
                  {selectedComparisonProducts.length} מוצרים נכללים
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto p-1">
                {selectedComparisonProducts.map((p, idx) => (
                  <div key={p.aliId || idx} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-indigo-100 shrink-0">
                    <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-100 bg-slate-50 shrink-0">
                      <Image src={p.mainImage} alt="" fill className="object-cover" sizes="40px" />
                    </div>
                    <div className="text-[11px] max-w-[140px]">
                      <span className="font-bold text-indigo-700 block">#{idx + 1}</span>
                      <p className="font-medium text-slate-800 truncate" title={p.titleHe || p.originalTitle}>
                        {p.titleHe || p.originalTitle}
                      </p>
                      <span className="font-bold text-slate-900">₪{p.priceIls}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : productData ? (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-white shrink-0 shadow-sm">
                <Image src={productData.mainImage} alt="" fill className="object-cover" sizes="80px" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-ali-100 text-ali-700 font-bold text-[11px]">
                    {category}
                  </span>
                  <span className="font-bold text-slate-900">
                    ₪{productData.priceIls} (${productData.priceUsd})
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    ID: {productData.aliId}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 line-clamp-1">
                  {productData.titleHe || productData.originalTitle}
                </h3>
                {productData.affiliateUrl && (
                  <div className="flex items-center gap-2 pt-1 text-[11px]">
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>קישור שותפים מאומת:</span>
                    </span>
                    <a
                      href={productData.affiliateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-ali-600 font-mono hover:underline truncate max-w-[240px] block"
                      title={productData.affiliateUrl}
                    >
                      {productData.affiliateUrl}
                    </a>
                    <a
                      href={productData.affiliateUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-[10px] shrink-0"
                    >
                      בדוק קישור ↗
                    </a>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          <div className="space-y-4">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">כותרת ראשית (H1 ממוקד SEO ו-CRO בעברית):</label>
              <input
                type="text"
                value={pageDraft.title}
                onChange={(e) => setPageDraft({ ...pageDraft, title: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-ali-500 focus:outline-none"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">נתיב URL (Slug):</label>
              <input
                type="text"
                value={pageDraft.slug}
                onChange={(e) => setPageDraft({ ...pageDraft, slug: e.target.value })}
                className="w-full px-4 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 bg-slate-50 focus:ring-2 focus:ring-ali-500 focus:outline-none"
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
                className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/40 text-xs font-medium text-slate-800 leading-relaxed focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Content Markdown with Live Preview Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700">תוכן המאמר המלא:</label>
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
                    עריכת טקסט (Markdown)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewMode("preview")}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      previewMode === "preview"
                        ? "bg-white text-ali-600 shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    תצוגה מקדימה מעוצבת (Live Preview)
                  </button>
                </div>
              </div>

              {previewMode === "edit" ? (
                <textarea
                  rows={12}
                  value={pageDraft.contentMarkdown}
                  onChange={(e) => setPageDraft({ ...pageDraft, contentMarkdown: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 leading-relaxed focus:ring-2 focus:ring-ali-500 focus:outline-none bg-white"
                />
              ) : (
                <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 max-h-[500px] overflow-y-auto">
                  <MarkdownContent content={pageDraft.contentMarkdown} />
                </div>
              )}
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

          {/* Catalog & Git Auto-Push Toggles */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            {/* Save to Catalog Toggle */}
            {productData && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/60 border border-emerald-200">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-700" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-emerald-950">שמירה אוטומטית למאגר המוצרים המרכזי (/admin/products)</span>
                    <span className="text-[11px] text-emerald-700">יוסיף/יעדכן את המוצר בקטלוג המרכזי לשימוש חוזר בכל עמודי האתר</span>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAlsoToCatalog}
                    onChange={(e) => setSaveAlsoToCatalog(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
            )}

            {/* Git Auto-Push Toggle */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
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

      {/* Search Product Full Data Inspection Modal */}
      {inspectingProduct && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 gap-3">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                    ID: {inspectingProduct.aliId}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyText(inspectingProduct.aliId, "modal_id")}
                    className="text-[10px] text-slate-500 hover:text-slate-800 flex items-center gap-0.5 underline font-bold"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copiedField === "modal_id" ? "הועתק!" : "העתק מזהה"}</span>
                  </button>
                  <a
                    href={inspectingProduct.aliUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-ali-600 hover:underline flex items-center gap-0.5 font-bold"
                  >
                    <span>פתח באלי אקספרס</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mt-1.5 leading-snug">
                  {inspectingProduct.originalTitle}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setInspectingProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Gallery Strip */}
            {inspectingProduct.galleryImages && inspectingProduct.galleryImages.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 block">
                  גלריית תמונות שנשלפה ({inspectingProduct.galleryImages.length}):
                </span>
                <div className="flex gap-2 overflow-x-auto p-1">
                  {inspectingProduct.galleryImages.map((img: string, i: number) => (
                    <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-slate-50">
                      <Image src={img} alt="" fill className="object-cover" sizes="64px" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Financials & Customs */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">₪{inspectingProduct.priceIls}</span>
                  <span className="text-sm font-bold text-slate-500">(${inspectingProduct.priceUsd})</span>
                  {inspectingProduct.originalPriceUsd && inspectingProduct.originalPriceUsd > inspectingProduct.priceUsd && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <span className="line-through">${inspectingProduct.originalPriceUsd}</span>
                      {inspectingProduct.discountPercent ? (
                        <span className="px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold text-[10px]">
                          -{inspectingProduct.discountPercent}% הנחה
                        </span>
                      ) : null}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-amber-500 font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm">
                    <Star className="w-3.5 h-3.5 fill-amber-400" />
                    <span>{inspectingProduct.rating}</span>
                    <span className="text-slate-400 font-normal">({inspectingProduct.ordersCount}+ הזמנות)</span>
                  </div>
                  {inspectingProduct.commissionRate ? (
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                      {inspectingProduct.commissionRate}% עמלה מוערכת
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Customs Breakdown with $2 safety alert */}
              <div className="pt-2 border-t border-slate-200">
                <CustomsBadge priceUsd={inspectingProduct.priceUsd} showDetails={true} />
              </div>
            </div>

            {/* Seller & Affiliate Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500 text-[10px] block">חנות ומוכר:</span>
                <div className="font-bold text-slate-900 flex items-center justify-between">
                  <span>{inspectingProduct.storeName || "AliExpress Store"}</span>
                  {inspectingProduct.sellerPositiveRate && (
                    <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">
                      {inspectingProduct.sellerPositiveRate}
                    </span>
                  )}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="font-bold text-slate-500 text-[10px] block">קישור שותפים מקוצר:</span>
                <div className="flex items-center justify-between gap-1.5">
                  <span className="font-mono text-[10px] text-slate-700 truncate block max-w-[200px]">
                    {inspectingProduct.affiliateUrl || inspectingProduct.aliUrl}
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyText(inspectingProduct.affiliateUrl || inspectingProduct.aliUrl, "modal_aff")}
                      className="p-1 text-slate-500 hover:text-slate-800"
                      title="העתק קישור"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={inspectingProduct.affiliateUrl || inspectingProduct.aliUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-1 text-slate-500 hover:text-ali-600"
                      title="בדוק קישור"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleSaveSearchItemToCatalog(inspectingProduct)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
              >
                {singleSavedId === inspectingProduct.aliId ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <PackagePlus className="w-4 h-4" />
                )}
                <span>
                  {singleSavedId === inspectingProduct.aliId ? "נשמר בהצלחה לקטלוג!" : "שמור מוצר זה לקטלוג המרכזי"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSelectSearchResult(inspectingProduct);
                  setInspectingProduct(null);
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-ali-600 text-white font-bold flex items-center justify-center gap-1.5 shadow-md transition-all"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>בחר מוצר זה ליצירת סקירה ב-Gemini ←</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminIngestPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-ali-600" />
          <span className="text-xs font-bold">טוען סטודיו הזנה ואינטגרציית API...</span>
        </div>
      }
    >
      <AdminIngestContent />
    </Suspense>
  );
}
