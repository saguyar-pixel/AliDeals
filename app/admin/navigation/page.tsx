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

  const fetchNavigation = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/navigation", {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.menu) {
        setMenu(data.menu);
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: "שגיאה בטעינת התפריט מהשרת" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNavigation();
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
        setFeedback({ type: "success", message: "התפריט עודכן בהצלחה וזמין מיידית בכל רחבי האתר!" });
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

  // Auto-sync from published pages: populates TOP 5 dropdown and Hero pills from existing pages
  const handleAutoSyncFromPages = async () => {
    setIsSyncing(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/pages", { headers: getAdminHeaders() });
      const data = await res.json();
      const pages = data.pages || [];

      const top5Pages = pages.filter((p: any) => p.type === "top5" && p.status !== "draft");
      const reviewPages = pages.filter((p: any) => p.type === "review" && p.status !== "draft");

      const newMenu = [...menu];

      // Update TOP 5 dropdown sub-items
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

      // Update Hero pills with active TOP 5 and reviews
      const nonPills = newMenu.filter((m) => m.placement !== "hero_pills");
      const syncedPills: MenuItem[] = [
        {
          id: "hero_calc",
          label: "מחשבון מכס $75",
          href: "#customs-calculator",
          icon: "🛡️",
          placement: "hero_pills",
          sortOrder: 1,
          isActive: true,
        },
        ...top5Pages.slice(0, 3).map((p: any, idx: number) => ({
          id: `hero_top5_${p.id || idx}`,
          label: p.title.replace(/^5\s+/, "").split("-")[0].trim().slice(0, 25),
          href: `/top5/${p.slug}`,
          icon: idx === 0 ? "📽️" : idx === 1 ? "👶" : "🏃",
          placement: "hero_pills" as const,
          sortOrder: idx + 2,
          isActive: true,
        })),
      ];

      setMenu([...nonPills, ...syncedPills]);
      setFeedback({
        type: "success",
        message: `סונכרנו בהצלחה ${top5Pages.length} עמודי TOP 5 לתפריט הנפתח ול-Hero Pills! לחץ "שמור שינויים" לשמירה קבועה.`,
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

  const handleAddItem = () => {
    const newItem: MenuItem = {
      id: `item_${Date.now()}`,
      label: "קישור חדש",
      href: "/",
      placement: activePlacement,
      sortOrder: currentItems.length + 1,
      isActive: true,
      children: [],
    };
    setMenu([...menu, newItem]);
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

  const handleAddChild = (parentId: string) => {
    setMenu(
      menu.map((m) => {
        if (m.id !== parentId) return m;
        const children = m.children || [];
        const newChild: ChildMenuItem = {
          id: `child_${Date.now()}`,
          label: "פריט משנה חדש",
          href: "/",
          sortOrder: children.length + 1,
        };
        return { ...m, isDropdown: true, children: [...children, newChild] };
      })
    );
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

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">CMS Navigation Manager</span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">ניהול תפריטים ודף הבית</h1>
          <p className="text-sm text-slate-500 mt-1">
            הוסף, ערוך, סדר ומחק פריטים מהתפריט העליון, מהתפריטים הנפתחים (Dropdowns) ומכפתורי ה-Hero Pills. אפס קישורים שבורים.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleAutoSyncFromPages}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
          >
            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span>סנכרן מעמודים פעילים אוטומטית</span>
          </button>

          <button
            type="button"
            onClick={handleSaveMenu}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-emerald-400" />}
            <span>שמור שינויים</span>
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
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
          <span className="text-xs font-semibold">טוען נתוני תפריט...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {currentItems.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <FolderTree className="w-10 h-10 text-slate-400 mx-auto" />
              <h3 className="font-bold text-slate-700">אין פריטים במיקום זה</h3>
              <p className="text-xs text-slate-500">לחץ &quot;הוסף פריט חדש&quot; או &quot;סנכרן מעמודים פעילים&quot; ליצירה מהירה.</p>
            </div>
          ) : (
            currentItems.map((item, index) => (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 hover:border-slate-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center shrink-0">
                      {index + 1}
                    </span>

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
                      value={item.icon || ""}
                      onChange={(e) => handleUpdateItem(item.id, { icon: e.target.value })}
                      placeholder="אייקון (אימוג'י)"
                      className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-center w-16"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                    <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 cursor-pointer ml-2">
                      <input
                        type="checkbox"
                        checked={item.isDropdown || false}
                        onChange={(e) => handleUpdateItem(item.id, { isDropdown: e.target.checked })}
                        className="rounded text-ali-600"
                      />
                      <span>תפריט נפתח (Dropdown)</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => handleMoveItem(item.id, "up")}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                      title="הזז למעלה"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveItem(item.id, "down")}
                      disabled={index === currentItems.length - 1}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30"
                      title="הזז למטה"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1.5 rounded-lg text-rose-400 hover:text-rose-700 hover:bg-rose-50"
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
                      <span className="text-xs font-bold text-slate-700">פריטי תפריט משנה ({item.children?.length || 0}):</span>
                      <button
                        type="button"
                        onClick={() => handleAddChild(item.id)}
                        className="flex items-center gap-1 text-[11px] font-bold text-ali-600 hover:text-ali-700"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>הוסף פריט משנה</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(item.children || []).map((child) => (
                        <div key={child.id} className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-slate-200 text-xs">
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
                            placeholder="תת-כותרת / תיאור"
                            className="w-44 px-2 py-1 rounded border border-slate-200 text-xs text-slate-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteChild(item.id, child.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>הוסף קישור למיקום זה</span>
            </button>

            <button
              type="button"
              onClick={handleSaveMenu}
              disabled={isSaving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              <span>שמור תפריט עכשיו</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
