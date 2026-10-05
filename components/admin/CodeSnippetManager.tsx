"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Code,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit3,
  Copy,
  Check,
  History,
  FileCode,
  Tag,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  Info,
  Calendar,
  User,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import {
  CustomCodeSnippet,
  CodeSnippetLogRecord,
  CodeSnippetPlacement,
  CodeSnippetCategory,
  CodeSnippetTargetPages,
} from "@/lib/analytics/types";

interface CodeSnippetManagerProps {
  initialSnippets?: CustomCodeSnippet[];
  initialLogs?: CodeSnippetLogRecord[];
}

const TEMPLATES: Array<{
  name: string;
  category: CodeSnippetCategory;
  placement: CodeSnippetPlacement;
  code: string;
  notes: string;
}> = [
  {
    name: "Meta Pixel (פייסבוק ראשי)",
    category: "marketing",
    placement: "head",
    notes: "פיקסל פייסבוק כולל PageView ואירוע click_out_to_aliexpress",
    code: `<!-- Meta Pixel Code -->
<script>
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');
</script>
<noscript><img height="1" width="1" style="display:none"
src="https://www.facebook.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"
/></noscript>
<!-- End Meta Pixel Code -->`,
  },
  {
    name: "Google Tag Manager (קוד 1 - HEAD)",
    category: "analytics",
    placement: "head",
    notes: "קונטיינר GTM ראשי המוזרק ב-HEAD",
    code: `<!-- Google Tag Manager (HEAD) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-XXXXXXX');</script>
<!-- End Google Tag Manager -->`,
  },
  {
    name: "Google Tag Manager (קוד 2 - תחילת BODY noscript)",
    category: "analytics",
    placement: "body_start",
    notes: "תגית noscript של GTM בתחילת ה-BODY",
    code: `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-XXXXXXX"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->`,
  },
  {
    name: "אימות דומיין פייסבוק (Meta Domain Verification)",
    category: "utility",
    placement: "head",
    notes: "תגית Meta לאימות בעלות הדומיין במנהל העסקים של פייסבוק",
    code: `<meta name="facebook-domain-verification" content="YOUR_VERIFICATION_CODE_HERE" />`,
  },
  {
    name: "אימות Google Search Console (תגית HTML)",
    category: "utility",
    placement: "head",
    notes: "אימות אתר בקונסולת החיפוש של גוגל",
    code: `<meta name="google-site-verification" content="YOUR_GSC_VERIFICATION_CODE" />`,
  },
  {
    name: "TikTok Pixel (פיקסל טיקטוק)",
    category: "marketing",
    placement: "head",
    notes: "מעקב המרות ופיקסל טיקטוק",
    code: `<script>
!function (w, d, t) {
  w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript",o.async=!0,o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};
  ttq.load('YOUR_TIKTOK_PIXEL_ID');
  ttq.page();
}(window, document, 'ttq');
</script>`,
  },
];

export function CodeSnippetManager({ initialSnippets, initialLogs }: CodeSnippetManagerProps) {
  const [snippets, setSnippets] = useState<CustomCodeSnippet[]>(initialSnippets || []);
  const [logs, setLogs] = useState<CodeSnippetLogRecord[]>(initialLogs || []);
  const [isLoading, setIsLoading] = useState(!initialSnippets);
  const [activeTab, setActiveTab] = useState<"snippets" | "logs">("snippets");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [placementFilter, setPlacementFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Modal / Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editPlacement, setEditPlacement] = useState<CodeSnippetPlacement>("head");
  const [editCategory, setEditCategory] = useState<CodeSnippetCategory>("marketing");
  const [editTargetPages, setEditTargetPages] = useState<CodeSnippetTargetPages>("all");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNotes, setEditNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Expanded Code Previews in List
  const [expandedCodeId, setExpandedCodeId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchSnippetsAndLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/code-snippets?includeLogs=true");
      const data = await res.json();
      if (res.ok && data.success) {
        setSnippets(data.snippets || []);
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to load snippets", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialSnippets) {
      fetchSnippetsAndLogs();
    }
  }, [initialSnippets]);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleOpenAdd = () => {
    setEditId(null);
    setEditTitle("");
    setEditCode("");
    setEditPlacement("head");
    setEditCategory("marketing");
    setEditTargetPages("all");
    setEditIsActive(true);
    setEditNotes("");
    setSaveError(null);
    setIsEditing(true);
  };

  const handleOpenEdit = (snippet: CustomCodeSnippet) => {
    setEditId(snippet.id);
    setEditTitle(snippet.title);
    setEditCode(snippet.code);
    setEditPlacement(snippet.placement || "head");
    setEditCategory(snippet.category || "custom");
    setEditTargetPages(snippet.targetPages || "all");
    setEditIsActive(Boolean(snippet.isActive));
    setEditNotes(snippet.notes || "");
    setSaveError(null);
    setIsEditing(true);
  };

  const handleApplyTemplate = (tmpl: typeof TEMPLATES[0]) => {
    setEditTitle(tmpl.name);
    setEditCode(tmpl.code);
    setEditPlacement(tmpl.placement);
    setEditCategory(tmpl.category);
    setEditNotes(tmpl.notes);
    showToast(`תבנית "${tmpl.name}" נטענה לשדות`);
  };

  const handleToggleActive = async (id: string, currentStatus: boolean, title: string) => {
    const nextStatus = !currentStatus;
    // Optimistic UI update
    setSnippets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: nextStatus } : s))
    );

    try {
      const res = await fetch("/api/admin/code-snippets/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isActive: nextStatus, actor: "מנהל מערכת" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`המקטע "${title}" ${nextStatus ? "הופעל" : "הושבת"} בהצלחה!`);
        // Refresh logs in background
        fetchSnippetsAndLogs();
      } else {
        // Revert
        setSnippets((prev) =>
          prev.map((s) => (s.id === id ? { ...s, isActive: currentStatus } : s))
        );
        showToast(data.error || "שגיאה בעדכון הסטטוס", "error");
      }
    } catch {
      setSnippets((prev) =>
        prev.map((s) => (s.id === id ? { ...s, isActive: currentStatus } : s))
      );
      showToast("שגיאת תקשורת מול השרת", "error");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק לצמיתות את מקטע הקוד "${title}"?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/code-snippets?id=${encodeURIComponent(id)}&actor=מנהל מערכת`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSnippets((prev) => prev.filter((s) => s.id !== id));
        showToast(`המקטע "${title}" נמחק בהצלחה`);
        fetchSnippetsAndLogs();
      } else {
        showToast(data.error || "שגיאה במחיקת המקטע", "error");
      }
    } catch {
      showToast("שגיאת תקשורת במחיקה", "error");
    }
  };

  const handleSaveSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      setSaveError("נא להזין כותרת למקטע הקוד");
      return;
    }
    if (!editCode.trim()) {
      setSaveError("נא להזין את קוד ה-HTML/Script");
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    const payload: Partial<CustomCodeSnippet> = {
      ...(editId ? { id: editId } : {}),
      title: editTitle.trim(),
      code: editCode.trim(),
      placement: editPlacement,
      category: editCategory,
      targetPages: editTargetPages,
      isActive: editIsActive,
      notes: editNotes.trim() || undefined,
    };

    try {
      const res = await fetch("/api/admin/code-snippets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          snippet: payload,
          actor: "מנהל מערכת",
          logDescription: editId
            ? `עודכן מקטע קוד: "${editTitle.trim()}" (${editPlacement})`
            : `נוצר מקטע קוד חדש: "${editTitle.trim()}" (${editPlacement})`,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.snippet) {
        showToast(editId ? "מקטע הקוד עודכן בהצלחה!" : "מקטע קוד חדש הוטמע בהצלחה!");
        setIsEditing(false);
        fetchSnippetsAndLogs();
      } else {
        setSaveError(data.error || "שגיאה בשמירת מקטע הקוד");
      }
    } catch {
      setSaveError("שגיאת תקשורת מול השרת");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCode = (id: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filtered List
  const filteredSnippets = useMemo(() => {
    return snippets.filter((s) => {
      const matchesSearch =
        !searchQuery ||
        s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPlacement =
        placementFilter === "all" || s.placement === placementFilter;

      const matchesCategory =
        categoryFilter === "all" || s.category === categoryFilter;

      return matchesSearch && matchesPlacement && matchesCategory;
    });
  }, [snippets, searchQuery, placementFilter, categoryFilter]);

  const activeCount = snippets.filter((s) => s.isActive).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 ${
            notification.type === "success"
              ? "bg-emerald-950 text-emerald-100 border-emerald-600/50 shadow-emerald-950/40"
              : "bg-rose-950 text-rose-100 border-rose-600/50 shadow-rose-950/40"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold">{notification.message}</span>
        </div>
      )}

      {/* Header & Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Code className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                מרכז ניהול מקטעי קוד דינאמיים (פיקסלים, GTM וסקריפטים)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                שליטה מלאה בהטמעה, עריכה, הפעלה ומחיקה של קודים ב-HEAD וב-BODY בכל עמודי האתר, כולל יומן שינויים מלא.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchSnippetsAndLogs}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition-all"
            title="רענן נתונים"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-600" : ""}`} />
          </button>

          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>הוסף מקטע קוד חדש</span>
          </button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("snippets")}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "snippets"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>מקטעי קוד שמורים ({snippets.length})</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeCount > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
              }`}
            >
              {activeCount} פעילים
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "logs"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            <History className="w-4 h-4" />
            <span>יומן שינויים ו-Audit Trail ({logs.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: SNIPPETS LIST */}
      {activeTab === "snippets" && (
        <div className="space-y-4">
          {/* Search & Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="חיפוש לפי שם, תוכן קוד או הערות..."
                className="w-full pr-9 pl-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={placementFilter}
                onChange={(e) => setPlacementFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">כל המיקומים (HEAD / BODY)</option>
                <option value="head">HEAD בלבד</option>
                <option value="body_start">תחילת BODY</option>
                <option value="body_end">סוף BODY</option>
              </select>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="all">כל הקטגוריות</option>
                <option value="marketing">שיווק ופיקסלים</option>
                <option value="analytics">אנליטיקס ו-GTM</option>
                <option value="utility">כלי עזר ואימותים</option>
                <option value="custom">מותאם אישית</option>
              </select>
            </div>
          </div>

          {/* Snippets List / Cards */}
          {isLoading ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
              <RefreshCw className="w-6 h-6 animate-spin text-indigo-600 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-600">טוען מקטעי קוד מ-Supabase...</p>
            </div>
          ) : filteredSnippets.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center mx-auto">
                <Code className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">
                {searchQuery || placementFilter !== "all" || categoryFilter !== "all"
                  ? "לא נמצאו מקטעי קוד התואמים לסינון"
                  : "עדיין לא הוגדרו מקטעי קוד במערכת"}
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                הוסף מקטע קוד ראשון כמו פיקסל פייסבוק, תגיות GTM או אימות דומיין כדי להפעיל אותם באופן דינאמי ברחבי האתר.
              </p>
              <button
                type="button"
                onClick={handleOpenAdd}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>צור מקטע קוד ראשון</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSnippets.map((snippet) => {
                const isExpanded = expandedCodeId === snippet.id;
                const isCopied = copiedId === snippet.id;

                const placementBadge =
                  snippet.placement === "head" ? (
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                      HEAD
                    </span>
                  ) : snippet.placement === "body_start" ? (
                    <span className="px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[11px] font-bold">
                      תחילת BODY
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px] font-bold">
                      סוף BODY
                    </span>
                  );

                const categoryBadge =
                  snippet.category === "marketing" ? (
                    <span className="px-2 py-0.5 rounded-md bg-pink-50 text-pink-700 text-[10px] font-bold">
                      שיווק / פיקסל
                    </span>
                  ) : snippet.category === "analytics" ? (
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                      אנליטיקס / GTM
                    </span>
                  ) : snippet.category === "utility" ? (
                    <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                      אימות וכלי עזר
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[10px] font-bold">
                      מותאם
                    </span>
                  );

                return (
                  <div
                    key={snippet.id}
                    className={`rounded-2xl border transition-all duration-200 bg-white ${
                      snippet.isActive
                        ? "border-slate-200 shadow-sm hover:border-indigo-300"
                        : "border-slate-200/60 bg-slate-50/50 opacity-80"
                    }`}
                  >
                    <div className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      {/* Left: Info, title, badges */}
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-sm font-black text-slate-900 truncate">
                            {snippet.title}
                          </h4>
                          {placementBadge}
                          {categoryBadge}
                          <span className="text-[10px] text-slate-400 font-mono">
                            {snippet.code.length} תווים
                          </span>
                        </div>

                        {snippet.notes && (
                          <p className="text-xs text-slate-500 line-clamp-1">{snippet.notes}</p>
                        )}

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                          <span>
                            עודכן:{" "}
                            {snippet.updatedAt
                              ? new Date(snippet.updatedAt).toLocaleDateString("he-IL", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "לא ידוע"}
                          </span>
                          <span>•</span>
                          <span>
                            יעד:{" "}
                            {snippet.targetPages === "deals_only"
                              ? "עמודי דילים"
                              : snippet.targetPages === "articles_only"
                              ? "עמודי כתבות"
                              : "כל עמודי האתר"}
                          </span>
                        </div>
                      </div>

                      {/* Right: Toggle Switch & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        {/* Status Switch */}
                        <button
                          type="button"
                          onClick={() => handleToggleActive(snippet.id, snippet.isActive, snippet.title)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                            snippet.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200"
                          }`}
                          title={snippet.isActive ? "לחץ להשבתה מיידית" : "לחץ להפעלה מיידית"}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              snippet.isActive ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                            }`}
                          />
                          <span>{snippet.isActive ? "פעיל באתר" : "מושבת"}</span>
                        </button>

                        {/* Expand / Preview Code Button */}
                        <button
                          type="button"
                          onClick={() => setExpandedCodeId(isExpanded ? null : snippet.id)}
                          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
                          title="הצג / הסתר תוכן קוד"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>

                        {/* Copy Code */}
                        <button
                          type="button"
                          onClick={() => handleCopyCode(snippet.id, snippet.code)}
                          className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-all border border-slate-200"
                          title="העתק קוד ללוח"
                        >
                          {isCopied ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(snippet)}
                          className="p-2 rounded-xl text-indigo-600 hover:bg-indigo-50 transition-all border border-indigo-200"
                          title="ערוך מקטע קוד"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(snippet.id, snippet.title)}
                          className="p-2 rounded-xl text-rose-600 hover:bg-rose-50 transition-all border border-rose-200"
                          title="מחק מקטע קוד"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Expandable Code Box */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-950 border-t border-slate-800 rounded-b-2xl overflow-hidden">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-[11px] font-mono text-slate-400">
                          <span>קוד מוטמע ({snippet.code.split("\n").length} שורות):</span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(snippet.id, snippet.code)}
                            className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{isCopied ? "הועתק!" : "העתק"}</span>
                          </button>
                        </div>
                        <pre
                          dir="ltr"
                          className="text-xs font-mono text-emerald-400 overflow-x-auto max-h-56 p-1 leading-relaxed selection:bg-indigo-600 selection:text-white"
                        >
                          <code>{snippet.code}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT LOGS & CHANGELOG */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="font-bold text-sm text-slate-900">יומן שינויים ואבטחה (Audit Trail)</h3>
                <p className="text-xs text-slate-500">
                  כל שינוי, הוספה, עריכה, הפעלה או מחיקה של קוד מתועדים אוטומטית עם חותמת זמן ומבצע השינוי.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchSnippetsAndLogs}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>רענן לוגים</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              עדיין לא נרשמו פעולות ביומן השינויים.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {logs.map((log) => {
                const actionBadge =
                  log.action === "created" ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      נוצר
                    </span>
                  ) : log.action === "updated" ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                      עודכן
                    </span>
                  ) : log.action === "toggled" ? (
                    <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold">
                      סטטוס שונה
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                      נמחק
                    </span>
                  );

                return (
                  <div key={log.id} className="p-4 hover:bg-slate-50/60 transition-colors space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {actionBadge}
                        <span className="font-bold text-slate-900">{log.snippetTitle}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {log.timestamp
                          ? new Date(log.timestamp).toLocaleDateString("he-IL", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600">{log.description}</p>

                    {log.diffSummary && (
                      <p className="text-[11px] text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded inline-block">
                        פירוט: {log.diffSummary}
                      </p>
                    )}

                    <div className="text-[10px] text-slate-400 flex items-center gap-1 pt-0.5">
                      <User className="w-3 h-3" />
                      <span>בוצע ע&quot;י: {log.actor || "admin"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT SNIPPET */}
      {isEditing && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Code className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900">
                    {editId ? "עריכת מקטע קוד" : "הוספת מקטע קוד חדש"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    הקוד יישמר ב-Supabase, יירשם בלוג השינויים ויוטמע בכל עמודי האתר באופן מיידי.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Templates Drawer */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  תבניות מהירות להדבקה מיידית:
                </span>
                <span className="text-[10px] text-indigo-600 font-medium">לחץ לטעינת קוד מלא</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-900 rounded-lg text-[11px] font-bold transition-all shadow-sm"
                  >
                    {tmpl.name}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveSnippet} className="space-y-4">
              {saveError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Title & Placement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    שם / כותרת המקטע *
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="לדוגמה: פיקסל פייסבוק ראשי"
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    מיקום ההזרקה באתר (Placement) *
                  </label>
                  <select
                    value={editPlacement}
                    onChange={(e) => setEditPlacement(e.target.value as CodeSnippetPlacement)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="head">&lt;head&gt; (פיקסלים, אימות דומיין, GTM Head)</option>
                    <option value="body_start">תחילת &lt;body&gt; (GTM noscript, וידג&apos;טים עליונים)</option>
                    <option value="body_end">סוף &lt;body&gt; (צ&apos;אט WhatsApp, נגישות, סקריפטים נגררים)</option>
                  </select>
                </div>
              </div>

              {/* Category & Target Pages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    קטגוריה
                  </label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value as CodeSnippetCategory)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="marketing">שיווק, פיקסלים והמרות</option>
                    <option value="analytics">אנליטיקס ו-Google Tag Manager</option>
                    <option value="utility">אימות דומיין, כלי עזר ונגישות</option>
                    <option value="custom">מותאם אישית</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    עמודי יעד (Target Pages)
                  </label>
                  <select
                    value={editTargetPages}
                    onChange={(e) => setEditTargetPages(e.target.value as CodeSnippetTargetPages)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="all">כל עמודי האתר (Sitewide - מומלץ)</option>
                    <option value="deals_only">עמודי דילים ומוצרים בלבד</option>
                    <option value="articles_only">עמודי כתבות ומדריכים בלבד</option>
                  </select>
                </div>
              </div>

              {/* Code Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    תוכן הקוד (HTML / Script / Noscript / Meta) *
                  </label>
                  <span className="text-[11px] font-mono text-slate-400">
                    {editCode ? `${editCode.split("\n").length} שורות (${editCode.length} תווים)` : "ריק"}
                  </span>
                </div>
                <div className="relative rounded-2xl overflow-hidden border border-slate-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                  <textarea
                    rows={10}
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value)}
                    placeholder="<!-- הדבק כאן את קוד ה-HTML המלא -->"
                    dir="ltr"
                    className="w-full p-4 bg-slate-950 text-emerald-400 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-indigo-600 selection:text-white"
                    spellCheck={false}
                    required
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  ניתן להדביק תגיות <code>&lt;script&gt;</code>, <code>&lt;noscript&gt;</code>, <code>&lt;meta&gt;</code> או קוד JS נקי.
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  הערות ותיעוד פנימי (אופציונלי)
                </label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="לדוגמה: הוטמע לקראת קמפיין מגה סייל אלי אקספרס"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Active Toggle Switch */}
              <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                <div>
                  <span className="block text-xs font-bold text-slate-800">הפעל מקטע זה מיד עם השמירה</span>
                  <span className="text-[11px] text-slate-500">
                    אם מושבת, הקוד יישמר במערכת אך לא יוזרק לעמודי האתר עד להפעלתו.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-bold transition-all"
                >
                  ביטול
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>שומר מקטע קוד...</span>
                    </>
                  ) : (
                    <span>{editId ? "עדכן מקטע קוד" : "הוסף והפעל באתר"}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
