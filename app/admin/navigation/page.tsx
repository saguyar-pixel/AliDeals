"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Menu,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles,
  Layers,
  ChevronDown,
  FolderTree,
  ExternalLink,
  ShieldCheck,
  Save,
  Star,
  Tag,
  Link2,
  X,
  BookOpen,
  Flame,
  Search,
  Check,
  Home,
  Compass,
  FileText,
  CheckCheck,
} from "lucide-react";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";

// ==========================================
// Types & Site Architecture Definitions
// ==========================================

export interface ChildMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  subtitle?: string;
  sortOrder: number;
}

export interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  subtitle?: string;
  isDropdown?: boolean;
  placement: "header_nav" | "hero_pills" | "footer_links";
  sortOrder: number;
  isActive: boolean;
  children?: ChildMenuItem[];
}

export type SourceType =
  | "article"
  | "top5"
  | "review"
  | "deal"
  | "category"
  | "tag"
  | "hub"
  | "custom";

export const ARCHITECTURAL_HUBS = [
  {
    key: "home",
    label: "דף הבית הראשי",
    href: "/",
    icon: "🏠",
    subtitle: "עמוד הבית ואינדקס האתר",
    typeBadge: "ראשי",
  },
  {
    key: "articles_hub",
    label: "מרכז המאמרים והמדריכים",
    href: "/articles",
    icon: "BookOpen",
    subtitle: "מדריכי קנייה, מיסוי וצרכנות נבונה",
    typeBadge: "מרכז מאמרים",
  },
  {
    key: "top5_hub",
    label: "מתחם טבלאות TOP 5",
    href: "/#top5",
    icon: "Layers",
    subtitle: "טבלאות השוואה והמלצות מובילות",
    typeBadge: "עוגן TOP 5",
  },
  {
    key: "reviews_hub",
    label: "מתחם סקירות מוצרים",
    href: "/#reviews",
    icon: "Star",
    subtitle: "סקירות עומק ובדיקות מעבדה",
    typeBadge: "עוגן סקירות",
  },
  {
    key: "deals_hub",
    label: "מתחם דילים חמים",
    href: "/#deals",
    icon: "Flame",
    subtitle: "מבצעים בלעדיים וקופונים שווים",
    typeBadge: "עוגן דילים",
  },
  {
    key: "customs_calc",
    label: "מחשבון מכס ופטור $75",
    href: "/#customs-guide",
    icon: "ShieldCheck",
    subtitle: "חישוב מיסוי ותקרת פטור ממע\"מ",
    typeBadge: "כלי עזר",
  },
];

export function getRouteBadge(href: string) {
  if (href.startsWith("/articles")) {
    return { label: "מאמר / מדריך", color: "bg-sky-50 text-sky-700 border-sky-200" };
  }
  if (href.startsWith("/top5")) {
    return { label: "מדריך TOP 5", color: "bg-indigo-50 text-indigo-700 border-indigo-200" };
  }
  if (href.startsWith("/reviews")) {
    return { label: "סקירת מוצר", color: "bg-amber-50 text-amber-700 border-amber-200" };
  }
  if (href.startsWith("/deals")) {
    return { label: "דיל בזק", color: "bg-rose-50 text-rose-700 border-rose-200" };
  }
  if (href.startsWith("/categories")) {
    return { label: "קטגוריה", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  }
  if (href.startsWith("/tags")) {
    return { label: "תגית תוכן", color: "bg-teal-50 text-teal-700 border-teal-200" };
  }
  if (href.startsWith("/#") || href === "/") {
    return { label: "עוגן / דף בית", color: "bg-slate-100 text-slate-700 border-slate-200" };
  }
  return { label: "מותאם / חיצוני", color: "bg-purple-50 text-purple-700 border-purple-200" };
}

export default function AdminNavigationPage() {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [activePlacement, setActivePlacement] = useState<"header_nav" | "hero_pills" | "footer_links">("header_nav");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Dynamic Sources Data
  const [dbPages, setDbPages] = useState<any[]>([]);
  const [dbCategories, setDbCategories] = useState<any[]>([]);

  // Source Selector Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [targetParentId, setTargetParentId] = useState<string | null>(null); // null = top level item
  const [selectedSourceType, setSelectedSourceType] = useState<SourceType>("article");
  const [modalSearchFilter, setModalSearchFilter] = useState("");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [selectedHubKey, setSelectedHubKey] = useState("articles_hub");

  // Editable fields inside the modal before adding
  const [itemForm, setItemForm] = useState({
    label: "",
    href: "",
    icon: "📚",
    subtitle: "",
  });

  const fetchNavigation = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/navigation", {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      const rawList = Array.isArray(data.menu) ? data.menu : Array.isArray(data.items) ? data.items : [];
      if (rawList) {
        setMenu(rawList);
      }
    } catch {
      setFeedback({ type: "error", message: "שגיאה בטעינת התפריט מהשרת" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSources = async () => {
    try {
      const [pagesRes, catRes] = await Promise.all([
        fetch("/api/pages", { headers: getAdminHeaders() }),
        fetch("/api/categories", { headers: getAdminHeaders() }),
      ]);
      const pagesData = await pagesRes.json();
      const catData = await catRes.json();
      if (pagesData.pages) setDbPages(pagesData.pages);
      if (catData.categories) setDbCategories(catData.categories);
    } catch {}
  };

  useEffect(() => {
    fetchNavigation();
    fetchSources();
  }, []);

  // Filtered Lists by Architecture Type
  const articlePages = useMemo(
    () => dbPages.filter((p) => (p.type === "article" || p.type === "guide") && p.status !== "draft"),
    [dbPages]
  );
  const top5Pages = useMemo(
    () => dbPages.filter((p) => p.type === "top5" && p.status !== "draft"),
    [dbPages]
  );
  const reviewPages = useMemo(
    () => dbPages.filter((p) => p.type === "review" && p.status !== "draft"),
    [dbPages]
  );
  const dealPages = useMemo(
    () => dbPages.filter((p) => p.type === "deal" && p.status !== "draft"),
    [dbPages]
  );

  const allTags = useMemo(() => {
    const set = new Set<string>();
    dbPages.forEach((p) => {
      if (Array.isArray(p.tags)) {
        p.tags.forEach((t: string) => t && set.add(String(t).trim()));
      }
    });
    dbCategories.forEach((c) => {
      if (Array.isArray(c.tags)) {
        c.tags.forEach((t: string) => t && set.add(String(t).trim()));
      }
    });
    return Array.from(set);
  }, [dbPages, dbCategories]);

  // Current Placement Items
  const currentItems = menu
    .filter((m) => m.placement === activePlacement)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Handle Save Menu to Supabase / DB
  const handleSaveMenu = async () => {
    setIsSaving(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/navigation", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ menu }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        try {
          sessionStorage.removeItem("alideals_nav_items");
          window.dispatchEvent(new Event("alideals_nav_updated"));
        } catch {}

        setFeedback({
          type: "success",
          message: "התפריט נשמר בהצלחה ב-Supabase ועודכן מיידית בכל רחבי האתר!",
        });
        setTimeout(() => setFeedback(null), 4000);
      } else {
        throw new Error(data.error || "שגיאה בעדכון התפריט");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "שגיאת תקשורת עם השרת" });
    } finally {
      setIsSaving(false);
    }
  };

  // Switch modal source type and pre-fill form
  const handleSwitchSourceType = (type: SourceType) => {
    setSelectedSourceType(type);
    setModalSearchFilter("");

    if (type === "article") {
      const first = articlePages[0];
      if (first) {
        setSelectedPageId(first.id);
        setItemForm({
          label: first.title.split("-")[0].trim().slice(0, 40),
          href: `/articles/${first.slug}`,
          icon: "BookOpen",
          subtitle: first.metaTitle?.slice(0, 45) || "מדריך קנייה ומאמר צרכנות",
        });
      }
    } else if (type === "top5") {
      const first = top5Pages[0];
      if (first) {
        setSelectedPageId(first.id);
        setItemForm({
          label: first.title.replace(/^5\s+/, "").split("-")[0].trim().slice(0, 35),
          href: `/top5/${first.slug}`,
          icon: "Layers",
          subtitle: first.metaTitle?.slice(0, 45) || "טבלת השוואה והמלצות",
        });
      }
    } else if (type === "review") {
      const first = reviewPages[0];
      if (first) {
        setSelectedPageId(first.id);
        setItemForm({
          label: first.title.split("-")[0].trim().slice(0, 40),
          href: `/reviews/${first.slug}`,
          icon: "Star",
          subtitle: first.metaTitle?.slice(0, 45) || "סקירת עומק ומפרט טכני",
        });
      }
    } else if (type === "deal") {
      const first = dealPages[0];
      if (first) {
        setSelectedPageId(first.id);
        setItemForm({
          label: first.title.split("-")[0].trim().slice(0, 40),
          href: `/deals/${first.slug}`,
          icon: "Flame",
          subtitle: "דיל בזק ומחיר מבצע בלעדי",
        });
      }
    } else if (type === "category") {
      const first = dbCategories[0];
      if (first) {
        setSelectedCatId(first.id);
        setItemForm({
          label: first.nameHe,
          href: `/categories/${first.slug}`,
          icon: first.icon || "🏷️",
          subtitle: `כל המבצעים בקטגוריית ${first.nameHe}`,
        });
      }
    } else if (type === "tag") {
      const first = allTags[0] || "שקע-ישראלי";
      setSelectedTag(first);
      setItemForm({
        label: first.startsWith("#") ? first : `#${first}`,
        href: `/tags/${encodeURIComponent(first.replace(/^#/, ""))}`,
        icon: "Tag",
        subtitle: `ריכוז מוצרים ומאמרים בתגית #${first.replace(/^#/, "")}`,
      });
    } else if (type === "hub") {
      const hub = ARCHITECTURAL_HUBS[1] || ARCHITECTURAL_HUBS[0];
      setSelectedHubKey(hub.key);
      setItemForm({
        label: hub.label,
        href: hub.href,
        icon: hub.icon,
        subtitle: hub.subtitle,
      });
    } else {
      // custom
      setItemForm({
        label: "",
        href: "/",
        icon: targetParentId ? "🔹" : "🔗",
        subtitle: "",
      });
    }
  };

  // Open modal
  const handleOpenAddModal = (parentId: string | null = null) => {
    setTargetParentId(parentId);
    handleSwitchSourceType("article");
    setIsAddModalOpen(true);
  };

  // Submit adding from modal
  const handleConfirmAddSource = () => {
    if (!itemForm.label.trim()) {
      alert("אנא הזן שם לפריט התפריט");
      return;
    }
    if (!itemForm.href.trim()) {
      alert("אנא הזן קישור יעד");
      return;
    }

    if (targetParentId) {
      // Adding a child to an existing item
      setMenu(
        menu.map((m) => {
          if (m.id !== targetParentId) return m;
          const children = m.children || [];
          const newChild: ChildMenuItem = {
            id: `child_${Date.now()}`,
            label: itemForm.label.trim(),
            href: itemForm.href.trim(),
            icon: itemForm.icon.trim(),
            subtitle: itemForm.subtitle.trim(),
            sortOrder: children.length + 1,
          };
          return { ...m, isDropdown: true, children: [...children, newChild] };
        })
      );
    } else {
      // Adding top-level item
      const newItem: MenuItem = {
        id: `item_${Date.now()}`,
        label: itemForm.label.trim(),
        href: itemForm.href.trim(),
        icon: itemForm.icon.trim(),
        subtitle: itemForm.subtitle.trim(),
        placement: activePlacement,
        sortOrder: currentItems.length + 1,
        isActive: true,
        isDropdown: false,
        children: [],
      };
      setMenu([...menu, newItem]);
    }

    setIsAddModalOpen(false);
  };

  // Smart Architecture Auto-Sync
  const handleAutoSyncFromPages = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/pages", { headers: getAdminHeaders() });
      const data = await res.json();
      const pages = data.pages || [];

      const top5List = pages.filter((p: any) => p.type === "top5" && p.status !== "draft");
      const articlesList = pages.filter(
        (p: any) => (p.type === "article" || p.type === "guide") && p.status !== "draft"
      );
      const reviewsList = pages.filter((p: any) => p.type === "review" && p.status !== "draft");
      const dealsList = pages.filter((p: any) => p.type === "deal" && p.status !== "draft");

      const otherPlacements = menu.filter((m) => m.placement !== activePlacement);

      if (activePlacement === "header_nav") {
        const syncedNav: MenuItem[] = [
          {
            id: "nav_home",
            label: "ראשי",
            href: "/",
            placement: "header_nav",
            sortOrder: 1,
            isActive: true,
          },
          {
            id: "nav_top5",
            label: "מדריכי TOP 5",
            href: "/#top5",
            icon: "Layers",
            placement: "header_nav",
            sortOrder: 2,
            isActive: true,
            isDropdown: true,
            children: top5List.slice(0, 6).map((p: any, idx: number) => ({
              id: `sync_top5_${p.id || idx}`,
              label: p.title.replace(/^5\s+/, "").split("-")[0].trim().slice(0, 35),
              href: `/top5/${p.slug}`,
              icon: "🏆",
              subtitle: p.metaTitle?.slice(0, 45) || "טבלת השוואה והמלצות",
              sortOrder: idx + 1,
            })),
          },
          {
            id: "nav_articles",
            label: "מדריכים ומאמרים",
            href: "/articles",
            icon: "BookOpen",
            placement: "header_nav",
            sortOrder: 3,
            isActive: true,
            isDropdown: true,
            children: [
              {
                id: "sync_articles_hub",
                label: "כל המדריכים והמאמרים",
                href: "/articles",
                icon: "📚",
                subtitle: "מרכז הידע, טיפים ומדריכי קנייה",
                sortOrder: 1,
              },
              ...articlesList.slice(0, 5).map((p: any, idx: number) => ({
                id: `sync_art_${p.id || idx}`,
                label: p.title.split("-")[0].trim().slice(0, 35),
                href: `/articles/${p.slug}`,
                icon: "✨",
                subtitle: p.metaTitle?.slice(0, 45) || "מדריך קנייה ומאמר SEO",
                sortOrder: idx + 2,
              })),
            ],
          },
          {
            id: "nav_reviews",
            label: "סקירות עומק",
            href: "/#reviews",
            icon: "Star",
            placement: "header_nav",
            sortOrder: 4,
            isActive: true,
            isDropdown: reviewsList.length > 0,
            children: reviewsList.slice(0, 6).map((p: any, idx: number) => ({
              id: `sync_rev_${p.id || idx}`,
              label: p.title.split("-")[0].trim().slice(0, 35),
              href: `/reviews/${p.slug}`,
              icon: "⭐",
              subtitle: p.metaTitle?.slice(0, 45) || "סקירת עומק ומפרט",
              sortOrder: idx + 1,
            })),
          },
          {
            id: "nav_deals",
            label: "דילים חמים",
            href: "/#deals",
            icon: "Flame",
            placement: "header_nav",
            sortOrder: 5,
            isActive: true,
            isDropdown: dealsList.length > 0,
            children: dealsList.slice(0, 5).map((p: any, idx: number) => ({
              id: `sync_deal_${p.id || idx}`,
              label: p.title.split("-")[0].trim().slice(0, 35),
              href: `/deals/${p.slug}`,
              icon: "🔥",
              subtitle: "דיל בזק ומחיר מבצע",
              sortOrder: idx + 1,
            })),
          },
        ];

        // Add categories if available
        if (dbCategories.length > 0) {
          syncedNav.push({
            id: "nav_categories",
            label: "קטגוריות",
            href: `/categories/${dbCategories[0].slug}`,
            icon: "FolderTree",
            placement: "header_nav",
            sortOrder: 6,
            isActive: true,
            isDropdown: true,
            children: dbCategories.slice(0, 6).map((c: any, idx: number) => ({
              id: `sync_cat_${c.id || idx}`,
              label: c.nameHe,
              href: `/categories/${c.slug}`,
              icon: c.icon || "🏷️",
              subtitle: `כל המבצעים בקטגוריית ${c.nameHe}`,
              sortOrder: idx + 1,
            })),
          });
        }

        setMenu([...otherPlacements, ...syncedNav]);
        setFeedback({
          type: "success",
          message: `סונכרנו בהצלחה כל עמודי האתר לתפריט הראשי (מדריכי TOP 5, מאמרי רון, סקירות, דילים וקטגוריות)! לחץ 'שמור שינויים בענן'.`,
        });
      } else if (activePlacement === "hero_pills") {
        const syncedPills: MenuItem[] = [
          {
            id: "hero_calc",
            label: "מחשבון מכס $75",
            href: "/#customs-guide",
            icon: "ShieldCheck",
            placement: "hero_pills",
            sortOrder: 1,
            isActive: true,
          },
          {
            id: "hero_articles",
            label: "מדריכים ומאמרי קנייה",
            href: "/articles",
            icon: "BookOpen",
            placement: "hero_pills",
            sortOrder: 2,
            isActive: true,
          },
          ...top5List.slice(0, 3).map((p: any, idx: number) => ({
            id: `hero_top5_${p.id || idx}`,
            label: p.title.replace(/^5\s+/, "").split("-")[0].trim().slice(0, 28),
            href: `/top5/${p.slug}`,
            icon: "🏆",
            placement: "hero_pills" as const,
            sortOrder: idx + 3,
            isActive: true,
          })),
        ];

        setMenu([...otherPlacements, ...syncedPills]);
        setFeedback({
          type: "success",
          message: `סונכרנו בהצלחה כפתורי ההירו (Hero Pills) עם עמודי האתר המובילים ומחשבון המכס!`,
        });
      } else {
        // footer_links
        const syncedFooter: MenuItem[] = [
          {
            id: "footer_home",
            label: "עמוד הבית",
            href: "/",
            placement: "footer_links",
            sortOrder: 1,
            isActive: true,
          },
          {
            id: "footer_articles",
            label: "מדריכי קנייה ומאמרי צרכנות",
            href: "/articles",
            placement: "footer_links",
            sortOrder: 2,
            isActive: true,
          },
          {
            id: "footer_top5",
            label: "טבלאות השוואת TOP 5",
            href: "/#top5",
            placement: "footer_links",
            sortOrder: 3,
            isActive: true,
          },
          {
            id: "footer_reviews",
            label: "סקירות מוצרים מעמיקות",
            href: "/#reviews",
            placement: "footer_links",
            sortOrder: 4,
            isActive: true,
          },
          {
            id: "footer_deals",
            label: "דילים חמים וקופונים",
            href: "/#deals",
            placement: "footer_links",
            sortOrder: 5,
            isActive: true,
          },
          {
            id: "footer_calc",
            label: "מדריך ומחשבון מכס ($75)",
            href: "/#customs-guide",
            placement: "footer_links",
            sortOrder: 6,
            isActive: true,
          },
        ];

        setMenu([...otherPlacements, ...syncedFooter]);
        setFeedback({
          type: "success",
          message: `סונכרנו בהצלחה קישורי הפוטר עם עמודי הארכיטקטורה הראשיים!`,
        });
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: "שגיאה בסנכרון עמודים: " + (err?.message || "נסה שוב") });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdateItem = (id: string, updates: Partial<MenuItem>) => {
    setMenu(menu.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  };

  const handleDeleteItem = (id: string) => {
    setMenu(menu.filter((m) => m.id !== id));
  };

  const handleMoveItem = (id: string, direction: "up" | "down") => {
    const items = [...currentItems];
    const index = items.findIndex((m) => m.id === id);
    if (index < 0) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const temp = items[index];
    items[index] = items[targetIndex];
    items[targetIndex] = temp;

    items.forEach((item, idx) => {
      item.sortOrder = idx + 1;
    });

    const otherItems = menu.filter((m) => m.placement !== activePlacement);
    setMenu([...otherItems, ...items]);
  };

  const handleUpdateChild = (parentId: string, childId: string, updates: Partial<ChildMenuItem>) => {
    setMenu(
      menu.map((m) => {
        if (m.id !== parentId) return m;
        const children = (m.children || []).map((c) => (c.id === childId ? { ...c, ...updates } : c));
        return { ...m, children };
      })
    );
  };

  const handleDeleteChild = (parentId: string, childId: string) => {
    setMenu(
      menu.map((m) => {
        if (m.id !== parentId) return m;
        return { ...m, children: (m.children || []).filter((c) => c.id !== childId) };
      })
    );
  };

  const handleMoveChild = (parentId: string, childId: string, direction: "up" | "down") => {
    setMenu(
      menu.map((m) => {
        if (m.id !== parentId || !m.children) return m;
        const children = [...m.children];
        const index = children.findIndex((c) => c.id === childId);
        if (index < 0) return m;
        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= children.length) return m;

        const temp = children[index];
        children[index] = children[targetIndex];
        children[targetIndex] = temp;

        children.forEach((c, idx) => {
          c.sortOrder = idx + 1;
        });

        return { ...m, children };
      })
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-ali-600 uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>CMS Navigation & Architecture Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">ניהול תפריטים וניווט באתר</h1>
          <p className="text-sm text-slate-500 mt-1">
            שליטה מלאה בכל עמודי האתר: מאמרי SEO ומדריכים (/articles), השוואות TOP 5 (/top5), סקירות מוצרים (/reviews), דילים, קטגוריות ותגיות.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleAutoSyncFromPages}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
            title="בנייה וסנכרון מלא של עמודי האתר לתפריט הנוכחי"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>סנכרן מארכיטקטורת האתר אוטומטית</span>
          </button>

          <button
            type="button"
            onClick={handleSaveMenu}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-400" />}
            <span>שמור שינויים בענן</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-center gap-3 animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Placement Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActivePlacement("header_nav")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activePlacement === "header_nav"
              ? "bg-ali-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Menu className="w-3.5 h-3.5" />
          <span>תפריט עליון ראשי (Header Nav)</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePlacement("hero_pills")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activePlacement === "hero_pills"
              ? "bg-ali-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>כפתורי ניווט בדף הבית (Hero Pills)</span>
        </button>
        <button
          type="button"
          onClick={() => setActivePlacement("footer_links")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activePlacement === "footer_links"
              ? "bg-ali-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Link2 className="w-3.5 h-3.5" />
          <span>קישורי פוטר (Footer)</span>
        </button>
      </div>

      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-ali-600" />
          <span className="text-xs font-semibold">טוען נתוני תפריט מ-Supabase...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {currentItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <FolderTree className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-700">אין פריטים במיקום זה</h3>
              <p className="text-xs text-slate-500">
                לחץ &quot;+ הוסף פריט תפריט (בורר ארכיטקטורה דינמי)&quot; או &quot;סנכרן מארכיטקטורת האתר אוטומטית&quot;.
              </p>
            </div>
          ) : (
            currentItems.map((item, index) => {
              const badge = getRouteBadge(item.href);

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1 flex-wrap">
                      <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center shrink-0">
                        {index + 1}
                      </span>

                      <input
                        type="text"
                        value={item.icon || ""}
                        onChange={(e) => handleUpdateItem(item.id, { icon: e.target.value })}
                        placeholder="אייקון"
                        className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center w-14"
                        title="אייקון (שם Lucide או אימוג'י)"
                      />

                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                        placeholder="שם הפריט"
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 w-44"
                      />

                      <div className="relative flex-1 min-w-[170px] flex items-center">
                        <input
                          type="text"
                          value={item.href}
                          onChange={(e) => handleUpdateItem(item.id, { href: e.target.value })}
                          placeholder="קישור יעד (למשל: /articles או /top5/...)"
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono pl-8"
                        />
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="absolute left-2 text-slate-400 hover:text-ali-600 transition-colors"
                          title="בדוק קישור זה בלשונית חדשה"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${badge.color}`}
                      >
                        {badge.label}
                      </span>

                      <input
                        type="text"
                        value={item.subtitle || ""}
                        onChange={(e) => handleUpdateItem(item.id, { subtitle: e.target.value })}
                        placeholder="תת-כותרת (אופציונלי)"
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 w-36"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {/* Dropdown Toggle */}
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 px-2 py-1.5 rounded-lg cursor-pointer border border-slate-200">
                        <input
                          type="checkbox"
                          checked={item.isDropdown || false}
                          onChange={(e) => handleUpdateItem(item.id, { isDropdown: e.target.checked })}
                          className="rounded text-ali-600"
                        />
                        <span>תפריט נפתח (Dropdown)</span>
                      </label>

                      {/* Active Toggle */}
                      <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 px-2 py-1.5 rounded-lg cursor-pointer border border-slate-200">
                        <input
                          type="checkbox"
                          checked={item.isActive !== false}
                          onChange={(e) => handleUpdateItem(item.id, { isActive: e.target.checked })}
                          className="rounded text-emerald-600"
                        />
                        <span>פעיל</span>
                      </label>

                      <button
                        type="button"
                        onClick={() => handleMoveItem(item.id, "up")}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="הזז למעלה"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveItem(item.id, "down")}
                        disabled={index === currentItems.length - 1}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        title="הזז למטה"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        title="מחק פריט"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-items list if Dropdown is enabled */}
                  {item.isDropdown && (
                    <div className="mr-8 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <ChevronDown className="w-4 h-4 text-ali-600" />
                          <span>פריטי תפריט משנה ({item.children?.length || 0}):</span>
                        </span>

                        <button
                          type="button"
                          onClick={() => handleOpenAddModal(item.id)}
                          className="flex items-center gap-1 px-3 py-1 rounded-lg bg-white hover:bg-ali-50 border border-slate-200 hover:border-ali-300 text-xs font-bold text-ali-600 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ הוסף תת-פריט (בורר מקורות)</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {(item.children || []).map((child, cIdx) => {
                          const childBadge = getRouteBadge(child.href);
                          return (
                            <div
                              key={child.id}
                              className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex-wrap sm:flex-nowrap"
                            >
                              <span className="text-slate-400 font-mono text-[10px] w-4 text-center">
                                {cIdx + 1}
                              </span>
                              <input
                                type="text"
                                value={child.icon || ""}
                                onChange={(e) =>
                                  handleUpdateChild(item.id, child.id, { icon: e.target.value })
                                }
                                placeholder="אייקון"
                                className="w-10 px-1 py-1 rounded border border-slate-200 text-center text-xs"
                              />
                              <input
                                type="text"
                                value={child.label}
                                onChange={(e) =>
                                  handleUpdateChild(item.id, child.id, { label: e.target.value })
                                }
                                placeholder="כותרת"
                                className="w-40 px-2 py-1 rounded border border-slate-200 text-xs font-semibold"
                              />
                              <div className="relative flex-1 min-w-[140px] flex items-center">
                                <input
                                  type="text"
                                  value={child.href}
                                  onChange={(e) =>
                                    handleUpdateChild(item.id, child.id, { href: e.target.value })
                                  }
                                  placeholder="קישור"
                                  className="w-full px-2 py-1 rounded border border-slate-200 text-xs font-mono text-slate-600 pl-7"
                                />
                                <a
                                  href={child.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="absolute left-1.5 text-slate-400 hover:text-ali-600"
                                  title="בדוק קישור"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${childBadge.color}`}
                              >
                                {childBadge.label}
                              </span>
                              <input
                                type="text"
                                value={child.subtitle || ""}
                                onChange={(e) =>
                                  handleUpdateChild(item.id, child.id, { subtitle: e.target.value })
                                }
                                placeholder="תת-כותרת"
                                className="w-36 px-2 py-1 rounded border border-slate-200 text-xs text-slate-500"
                              />
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveChild(item.id, child.id, "up")}
                                  disabled={cIdx === 0}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                  title="למעלה"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveChild(item.id, child.id, "down")}
                                  disabled={cIdx === (item.children?.length || 0) - 1}
                                  className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                                  title="למטה"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteChild(item.id, child.id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                                  title="מחק תת-פריט"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          <div className="pt-4 flex items-center justify-between flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleOpenAddModal(null)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ הוסף פריט תפריט (בורר ארכיטקטורה דינמי)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveMenu}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span>שמור תפריט עכשיו בענן (Supabase)</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Architecture Source Selector Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-ali-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {targetParentId ? "הוספת פריט משנה (Dropdown Child)" : "הוספת פריט תפריט חדש"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Architecture Source Type Grid Tabs */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                בחר סוג עמוד מארכיטקטורת האתר:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-slate-100 p-1.5 rounded-2xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleSwitchSourceType("article")}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    selectedSourceType === "article"
                      ? "bg-white text-sky-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>מאמרי רוֹן</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchSourceType("top5")}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    selectedSourceType === "top5"
                      ? "bg-white text-indigo-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>השוואות TOP 5</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchSourceType("review")}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    selectedSourceType === "review"
                      ? "bg-white text-amber-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>סקירות עומק</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchSourceType("deal")}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    selectedSourceType === "deal"
                      ? "bg-white text-rose-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>דילים חמים</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchSourceType("category")}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    selectedSourceType === "category"
                      ? "bg-white text-emerald-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FolderTree className="w-3.5 h-3.5" />
                  <span>קטגוריות</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchSourceType("tag")}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    selectedSourceType === "tag"
                      ? "bg-white text-teal-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Tag className="w-3.5 h-3.5" />
                  <span>תגיות (#)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchSourceType("hub")}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    selectedSourceType === "hub"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>מרכזי אתר / עוגנים</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchSourceType("custom")}
                  className={`py-2 px-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                    selectedSourceType === "custom"
                      ? "bg-white text-purple-700 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  <span>קישור חופשי</span>
                </button>
              </div>
            </div>

            {/* Source Selection Form by Type */}
            <div className="space-y-4 pt-1">
              {/* Articles & SEO Guides */}
              {selectedSourceType === "article" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">בחר מאמר או מדריך קנייה מאת רוֹן:</label>
                    <span className="text-[10px] text-slate-500">נמצאו {articlePages.length} מאמרים פעילים</span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      value={modalSearchFilter}
                      onChange={(e) => setModalSearchFilter(e.target.value)}
                      placeholder="סנן מאמרים לפי כותרת או מילות מפתח..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {articlePages.length > 0 ? (
                    <select
                      value={selectedPageId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPageId(pid);
                        const p = articlePages.find((item) => item.id === pid);
                        if (p) {
                          setItemForm({
                            label: p.title.split("-")[0].trim().slice(0, 40),
                            href: `/articles/${p.slug}`,
                            icon: "BookOpen",
                            subtitle: p.metaTitle?.slice(0, 45) || "מדריך קנייה ומאמר צרכנות",
                          });
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      {articlePages
                        .filter((p) =>
                          !modalSearchFilter
                            ? true
                            : p.title.toLowerCase().includes(modalSearchFilter.toLowerCase()) ||
                              p.slug.toLowerCase().includes(modalSearchFilter.toLowerCase())
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} (/articles/{p.slug})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      לא נמצאו מאמרים מפורסמים כרגע. תוכל להפיק מאמרים חדשים בסטודיו SEO של רוֹן!
                    </div>
                  )}
                </div>
              )}

              {/* TOP 5 Comparison Guides */}
              {selectedSourceType === "top5" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">בחר מדריך השוואת TOP 5:</label>
                    <span className="text-[10px] text-slate-500">נמצאו {top5Pages.length} מדריכים</span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      value={modalSearchFilter}
                      onChange={(e) => setModalSearchFilter(e.target.value)}
                      placeholder="סנן מדריכי TOP 5..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {top5Pages.length > 0 ? (
                    <select
                      value={selectedPageId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPageId(pid);
                        const p = top5Pages.find((item) => item.id === pid);
                        if (p) {
                          setItemForm({
                            label: p.title.replace(/^5\s+/, "").split("-")[0].trim().slice(0, 35),
                            href: `/top5/${p.slug}`,
                            icon: "Layers",
                            subtitle: p.metaTitle?.slice(0, 45) || "טבלת השוואה והמלצות",
                          });
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      {top5Pages
                        .filter((p) =>
                          !modalSearchFilter
                            ? true
                            : p.title.toLowerCase().includes(modalSearchFilter.toLowerCase()) ||
                              p.slug.toLowerCase().includes(modalSearchFilter.toLowerCase())
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} (/top5/{p.slug})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      לא נמצאו עמודי TOP 5 מוכנים.
                    </div>
                  )}
                </div>
              )}

              {/* Product Reviews */}
              {selectedSourceType === "review" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">בחר סקירת מוצר מעמיקה:</label>
                    <span className="text-[10px] text-slate-500">נמצאו {reviewPages.length} סקירות</span>
                  </div>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3" />
                    <input
                      type="text"
                      value={modalSearchFilter}
                      onChange={(e) => setModalSearchFilter(e.target.value)}
                      placeholder="סנן סקירות מוצרים..."
                      className="w-full pr-9 pl-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-none"
                    />
                  </div>

                  {reviewPages.length > 0 ? (
                    <select
                      value={selectedPageId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPageId(pid);
                        const p = reviewPages.find((item) => item.id === pid);
                        if (p) {
                          setItemForm({
                            label: p.title.split("-")[0].trim().slice(0, 40),
                            href: `/reviews/${p.slug}`,
                            icon: "Star",
                            subtitle: p.metaTitle?.slice(0, 45) || "סקירת עומק ומפרט טכני",
                          });
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      {reviewPages
                        .filter((p) =>
                          !modalSearchFilter
                            ? true
                            : p.title.toLowerCase().includes(modalSearchFilter.toLowerCase()) ||
                              p.slug.toLowerCase().includes(modalSearchFilter.toLowerCase())
                        )
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} (/reviews/{p.slug})
                          </option>
                        ))}
                    </select>
                  ) : (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      לא נמצאו סקירות מוכנות.
                    </div>
                  )}
                </div>
              )}

              {/* Flash Deals */}
              {selectedSourceType === "deal" && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">בחר עמוד דיל בזק:</label>
                    <span className="text-[10px] text-slate-500">נמצאו {dealPages.length} דילים</span>
                  </div>

                  {dealPages.length > 0 ? (
                    <select
                      value={selectedPageId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        setSelectedPageId(pid);
                        const p = dealPages.find((item) => item.id === pid);
                        if (p) {
                          setItemForm({
                            label: p.title.split("-")[0].trim().slice(0, 40),
                            href: `/deals/${p.slug}`,
                            icon: "Flame",
                            subtitle: "דיל בזק ומחיר מבצע בלעדי",
                          });
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      {dealPages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} (/deals/{p.slug})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      לא נמצאו עמודי דיל בזק ייעודיים. תוכל להוסיף קישור לעוגן הדילים: /#deals.
                    </div>
                  )}
                </div>
              )}

              {/* Categories */}
              {selectedSourceType === "category" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">בחר קטגוריית תוכן ראשית:</label>
                  {dbCategories.length > 0 ? (
                    <select
                      value={selectedCatId}
                      onChange={(e) => {
                        const cid = e.target.value;
                        setSelectedCatId(cid);
                        const cat = dbCategories.find((c) => c.id === cid);
                        if (cat) {
                          setItemForm({
                            label: cat.nameHe,
                            href: `/categories/${cat.slug}`,
                            icon: cat.icon || "🏷️",
                            subtitle: `כל המבצעים בקטגוריית ${cat.nameHe}`,
                          });
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      {dbCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.icon || "🏷️"} {c.nameHe} (/categories/{c.slug})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      טוען קטגוריות מהמאגר...
                    </div>
                  )}
                </div>
              )}

              {/* Tags */}
              {selectedSourceType === "tag" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">בחר תגית תוכן מתוך המאגר:</label>
                  {allTags.length > 0 ? (
                    <select
                      value={selectedTag}
                      onChange={(e) => {
                        const tag = e.target.value;
                        setSelectedTag(tag);
                        setItemForm({
                          label: tag.startsWith("#") ? tag : `#${tag}`,
                          href: `/tags/${encodeURIComponent(tag.replace(/^#/, ""))}`,
                          icon: "Tag",
                          subtitle: `ריכוז מוצרים ומאמרים בתגית #${tag.replace(/^#/, "")}`,
                        });
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      {allTags.map((t) => (
                        <option key={t} value={t}>
                          #{t} (/tags/{encodeURIComponent(t.replace(/^#/, ""))})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      לא נמצאו תגיות פעילות במסד הנתונים.
                    </div>
                  )}
                </div>
              )}

              {/* Architectural Hubs & Anchors */}
              {selectedSourceType === "hub" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">בחר מרכז תוכן ראשי או עוגן דף בית:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ARCHITECTURAL_HUBS.map((hub) => {
                      const isSelected = selectedHubKey === hub.key;
                      return (
                        <button
                          key={hub.key}
                          type="button"
                          onClick={() => {
                            setSelectedHubKey(hub.key);
                            setItemForm({
                              label: hub.label,
                              href: hub.href,
                              icon: hub.icon,
                              subtitle: hub.subtitle,
                            });
                          }}
                          className={`p-3 rounded-xl border text-right transition-all flex flex-col justify-between ${
                            isSelected
                              ? "bg-ali-50 border-ali-500 text-slate-900 shadow-sm"
                              : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-bold text-xs flex items-center gap-1.5">
                              <span>{hub.icon}</span>
                              <span>{hub.label}</span>
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-white border border-slate-200 font-mono text-slate-500">
                              {hub.href}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1">{hub.subtitle}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Editable Fields Summary */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-700 block">עריכה והתאמה אישית של הפריט שייתווסף:</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">שם פריט התפריט (Label):</label>
                    <input
                      type="text"
                      value={itemForm.label}
                      onChange={(e) => setItemForm({ ...itemForm, label: e.target.value })}
                      placeholder="שם הפריט כפי שיופיע לגולשים..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">קישור יעד (Canonical URL):</label>
                    <input
                      type="text"
                      value={itemForm.href}
                      onChange={(e) => setItemForm({ ...itemForm, href: e.target.value })}
                      placeholder="/articles, /top5/..., /#reviews..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 bg-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">אייקון (אימוג'י או שם Lucide):</label>
                    <input
                      type="text"
                      value={itemForm.icon}
                      onChange={(e) => setItemForm({ ...itemForm, icon: e.target.value })}
                      placeholder="BookOpen, Layers, Star, 📚, 🏆..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600">תת-כותרת (הסבר ב-Dropdown):</label>
                    <input
                      type="text"
                      value={itemForm.subtitle}
                      onChange={(e) => setItemForm({ ...itemForm, subtitle: e.target.value })}
                      placeholder="תיאור קצרצר..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmAddSource}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-ali-600 hover:bg-ali-700 text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>הוסף לתפריט</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
