"use client";

import { useState, useEffect } from "react";
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
  CornerDownLeft,
} from "lucide-react";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";

interface ChildMenuItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  subtitle?: string;
  sortOrder: number;
}

interface MenuItem {
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
  const [selectedSourceType, setSelectedSourceType] = useState<"review" | "top5" | "category" | "custom">("review");
  const [selectedPageId, setSelectedPageId] = useState("");
  const [selectedCatId, setSelectedCatId] = useState("");
  const [customForm, setCustomForm] = useState({
    label: "",
    href: "",
    icon: "🔗",
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
        setFeedback({ type: "success", message: "התפריט נשמר בהצלחה ב-Supabase ועודכן מיידית בכל רחבי האתר!" });
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

  const handleAutoSyncFromPages = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/pages", { headers: getAdminHeaders() });
      const data = await res.json();
      const pages = data.pages || [];

      const top5Pages = pages.filter((p: any) => p.type === "top5" && p.status !== "draft");

      const newMenu = [...menu];

      const top5Index = newMenu.findIndex((m) => m.id === "nav_top5" || m.label.includes("TOP 5"));
      if (top5Index >= 0) {
        newMenu[top5Index].isDropdown = true;
        newMenu[top5Index].children = top5Pages.slice(0, 6).map((p: any, idx: number) => ({
          id: `sync_top5_${p.id || idx}`,
          label: p.title.replace(/^5\s+/, "").split("-")[0].trim().slice(0, 35),
          href: `/top5/${p.slug}`,
          icon: idx === 0 ? "📽️" : idx === 1 ? "👶" : idx === 2 ? "🏃" : "✨",
          subtitle: p.metaTitle?.slice(0, 45) || "השוואת מוצרים מומלצים",
          sortOrder: idx + 1,
        }));
      }

      setMenu(newMenu);
      setFeedback({
        type: "success",
        message: `סונכרנו בהצלחה ${top5Pages.length} עמודי TOP 5 לתפריט הנפתח! לחץ "שמור שינויים" לשמירה קבועה.`,
      });
    } catch (err: any) {
      setFeedback({ type: "error", message: "שגיאה בסנכרון עמודים: " + (err?.message || "נסה שוב") });
    } finally {
      setIsSyncing(false);
    }
  };

  const currentItems = menu
    .filter((m) => m.placement === activePlacement)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Open modal to add item or sub-item
  const handleOpenAddModal = (parentId: string | null = null) => {
    setTargetParentId(parentId);
    setSelectedSourceType("review");
    setSelectedPageId(dbPages.find((p) => p.type === "review")?.id || "");
    setSelectedCatId(dbCategories[0]?.id || "");
    setCustomForm({
      label: "",
      href: "/",
      icon: parentId ? "🔹" : "🔗",
      subtitle: "",
    });
    setIsAddModalOpen(true);
  };

  // Submit adding from dynamic source selector
  const handleConfirmAddSource = () => {
    let finalLabel = "";
    let finalHref = "";
    let finalIcon = "🔗";
    let finalSubtitle = "";

    if (selectedSourceType === "review") {
      const page = dbPages.find((p) => p.id === selectedPageId);
      if (!page) return;
      finalLabel = page.title.split("-")[0].slice(0, 40).trim();
      finalHref = `/reviews/${page.slug}`;
      finalIcon = "⭐";
      finalSubtitle = page.metaTitle?.slice(0, 40) || "סקירת עומק ומפרט";
    } else if (selectedSourceType === "top5") {
      const page = dbPages.find((p) => p.id === selectedPageId);
      if (!page) return;
      finalLabel = page.title.replace(/^5\s+/, "").split("-")[0].slice(0, 35).trim();
      finalHref = `/top5/${page.slug}`;
      finalIcon = "🏆";
      finalSubtitle = "מדריך השוואה והמלצות";
    } else if (selectedSourceType === "category") {
      const cat = dbCategories.find((c) => c.id === selectedCatId);
      if (!cat) return;
      finalLabel = cat.nameHe;
      finalHref = `/categories/${cat.slug}`;
      finalIcon = cat.icon || "🏷️";
      finalSubtitle = `כל המבצעים בקטגוריית ${cat.nameHe}`;
    } else {
      if (!customForm.label.trim()) return;
      finalLabel = customForm.label.trim();
      finalHref = customForm.href.trim() || "/";
      finalIcon = customForm.icon || "🔗";
      finalSubtitle = customForm.subtitle || "";
    }

    if (targetParentId) {
      // Adding a child to an existing item
      setMenu(
        menu.map((m) => {
          if (m.id !== targetParentId) return m;
          const children = m.children || [];
          const newChild: ChildMenuItem = {
            id: `child_${Date.now()}`,
            label: finalLabel,
            href: finalHref,
            icon: finalIcon,
            subtitle: finalSubtitle,
            sortOrder: children.length + 1,
          };
          return { ...m, isDropdown: true, children: [...children, newChild] };
        })
      );
    } else {
      // Adding top-level item
      const newItem: MenuItem = {
        id: `item_${Date.now()}`,
        label: finalLabel,
        href: finalHref,
        icon: finalIcon,
        subtitle: finalSubtitle,
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

  const reviewPages = dbPages.filter((p) => p.type === "review" && p.status !== "draft");
  const top5Pages = dbPages.filter((p) => p.type === "top5" && p.status !== "draft");

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">CMS Navigation Manager</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">ניהול תפריטים ודף הבית</h1>
          <p className="text-sm text-slate-500 mt-1">
            הוסף בקליק עמודי סקירה, קטגוריות, השוואות TOP 5 ותפריטים נפתחים (Dropdowns). 100% בענן עם רענון מיידי.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleAutoSyncFromPages}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>סנכרן מעמודים פעילים אוטומטית</span>
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
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePlacement === "header_nav"
              ? "bg-ali-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          תפריט עליון ראשי (Header Nav)
        </button>
        <button
          type="button"
          onClick={() => setActivePlacement("hero_pills")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePlacement === "hero_pills"
              ? "bg-ali-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          כפתורי ניווט בדף הבית (Hero Pills)
        </button>
        <button
          type="button"
          onClick={() => setActivePlacement("footer_links")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activePlacement === "footer_links"
              ? "bg-ali-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          קישורי פוטר (Footer)
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
              <p className="text-xs text-slate-500">לחץ &quot;+ הוסף פריט תפריט (בורר מקורות דינמי)&quot; ליצירה מהירה.</p>
            </div>
          ) : (
            currentItems.map((item, index) => (
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
                    />

                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) => handleUpdateItem(item.id, { label: e.target.value })}
                      placeholder="שם הפריט"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 w-44"
                    />

                    <input
                      type="text"
                      value={item.href}
                      onChange={(e) => handleUpdateItem(item.id, { href: e.target.value })}
                      placeholder="קישור יעד (למשל: /#top5)"
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 font-mono flex-1 min-w-[140px]"
                    />

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
                      {(item.children || []).map((child, cIdx) => (
                        <div key={child.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
                          <span className="text-slate-400 font-mono text-[10px] w-4 text-center">{cIdx + 1}</span>
                          <input
                            type="text"
                            value={child.icon || ""}
                            onChange={(e) => handleUpdateChild(item.id, child.id, { icon: e.target.value })}
                            placeholder="אימוג'י"
                            className="w-10 px-1 py-1 rounded border border-slate-200 text-center text-xs"
                          />
                          <input
                            type="text"
                            value={child.label}
                            onChange={(e) => handleUpdateChild(item.id, child.id, { label: e.target.value })}
                            placeholder="כותרת"
                            className="w-40 px-2 py-1 rounded border border-slate-200 text-xs font-semibold"
                          />
                          <input
                            type="text"
                            value={child.href}
                            onChange={(e) => handleUpdateChild(item.id, child.id, { href: e.target.value })}
                            placeholder="קישור"
                            className="flex-1 px-2 py-1 rounded border border-slate-200 text-xs font-mono text-slate-600"
                          />
                          <input
                            type="text"
                            value={child.subtitle || ""}
                            onChange={(e) => handleUpdateChild(item.id, child.id, { subtitle: e.target.value })}
                            placeholder="תת-כותרת"
                            className="w-40 px-2 py-1 rounded border border-slate-200 text-xs text-slate-500"
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => handleOpenAddModal(null)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ הוסף פריט תפריט (בורר מקורות דינמי)</span>
            </button>

            <button
              type="button"
              onClick={handleSaveMenu}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span>שמור תפריט עכשיו ב-Supabase</span>
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Source Selector Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-ali-600" />
                <h3 className="font-bold text-base text-slate-900">
                  {targetParentId ? "הוספת פריט משנה (Dropdown Child)" : "הוספת פריט תפריט חדש"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Source Type Tabs */}
            <div className="grid grid-cols-4 gap-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setSelectedSourceType("review")}
                className={`py-2 rounded-lg transition-all ${
                  selectedSourceType === "review" ? "bg-white text-ali-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                סקירת מוצר
              </button>
              <button
                type="button"
                onClick={() => setSelectedSourceType("top5")}
                className={`py-2 rounded-lg transition-all ${
                  selectedSourceType === "top5" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                מדריך TOP 5
              </button>
              <button
                type="button"
                onClick={() => setSelectedSourceType("category")}
                className={`py-2 rounded-lg transition-all ${
                  selectedSourceType === "category" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                קטגוריה
              </button>
              <button
                type="button"
                onClick={() => setSelectedSourceType("custom")}
                className={`py-2 rounded-lg transition-all ${
                  selectedSourceType === "custom" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                קישור מותאם
              </button>
            </div>

            {/* Source Selection Form */}
            <div className="space-y-4 pt-1">
              {selectedSourceType === "review" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">בחר סקירה פעילה מהאתר:</label>
                  {reviewPages.length > 0 ? (
                    <select
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      {reviewPages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} (/reviews/{p.slug})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      לא נמצאו סקירות מוכנות. תוכל להוסיף קישור מותאם אישית.
                    </div>
                  )}
                </div>
              )}

              {selectedSourceType === "top5" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">בחר עמוד השוואת TOP 5:</label>
                  {top5Pages.length > 0 ? (
                    <select
                      value={selectedPageId}
                      onChange={(e) => setSelectedPageId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-none"
                    >
                      {top5Pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} (/top5/{p.slug})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
                      לא נמצאו עמודי TOP 5 מוכנים. תוכל ליצור בסטודיו או להוסיף קישור מותאם.
                    </div>
                  )}
                </div>
              )}

              {selectedSourceType === "category" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700">בחר קטגוריה ראשית:</label>
                  {dbCategories.length > 0 ? (
                    <select
                      value={selectedCatId}
                      onChange={(e) => setSelectedCatId(e.target.value)}
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

              {selectedSourceType === "custom" && (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">שם הפריט בתפריט:</label>
                    <input
                      type="text"
                      placeholder="למשל: מחשבון מכס, מדריך קנייה..."
                      value={customForm.label}
                      onChange={(e) => setCustomForm({ ...customForm, label: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">קישור יעד (URL או עוגן #):</label>
                    <input
                      type="text"
                      placeholder="למשל: /#customs-guide או https://..."
                      value={customForm.href}
                      onChange={(e) => setCustomForm({ ...customForm, href: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">אייקון (אימוג'י):</label>
                      <input
                        type="text"
                        value={customForm.icon}
                        onChange={(e) => setCustomForm({ ...customForm, icon: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-center focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-700">תת-כותרת:</label>
                      <input
                        type="text"
                        placeholder="תיאור קצרצר..."
                        value={customForm.subtitle}
                        onChange={(e) => setCustomForm({ ...customForm, subtitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                ביטול
              </button>
              <button
                type="button"
                onClick={handleConfirmAddSource}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-ali-600 hover:bg-ali-700 text-white shadow-sm"
              >
                הוסף לתפריט
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
