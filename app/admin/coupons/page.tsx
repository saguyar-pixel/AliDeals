"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";
import {
  Ticket,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  MousePointerClick,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Filter,
} from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  title: string;
  discountText: string;
  discountPercent?: number;
  minSpendUsd?: number;
  placements: ("all" | "category" | "product" | "popup")[];
  targetCategoryIds?: string[];
  targetProductIds?: string[];
  isActive: boolean;
  expiresAt?: string;
  clickCount?: number;
  createdAt: string;
}

export default function CouponsAdminPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDiscountText, setNewDiscountText] = useState("");
  const [newDiscountPercent, setNewDiscountPercent] = useState("");
  const [newMinSpendUsd, setNewMinSpendUsd] = useState("");
  const [newPlacements, setNewPlacements] = useState<("all" | "category" | "product" | "popup")[]>(["all"]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCoupons = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/coupons", { headers: getAdminHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
      }
    } catch (err: any) {
      console.error("Failed to load coupons:", err);
      setFeedback({ type: "error", message: "שגיאה בטעינת קופונים" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const handleTogglePlacement = (placement: "all" | "category" | "product" | "popup") => {
    setNewPlacements((prev) =>
      prev.includes(placement) ? prev.filter((p) => p !== placement) : [...prev, placement]
    );
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newDiscountText.trim()) {
      setFeedback({ type: "error", message: "נא להזין קוד קופון ותיאור הנחה" });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const payload = {
        code: newCode.trim().toUpperCase(),
        title: newTitle.trim() || `קופון ${newCode.trim().toUpperCase()}`,
        discountText: newDiscountText.trim(),
        discountPercent: newDiscountPercent ? parseFloat(newDiscountPercent) : undefined,
        minSpendUsd: newMinSpendUsd ? parseFloat(newMinSpendUsd) : undefined,
        placements: newPlacements.length > 0 ? newPlacements : ["all"],
        isActive: true,
      };

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `הקופון ${payload.code} נוצר בהצלחה!` });
        setShowAddForm(false);
        setNewCode("");
        setNewTitle("");
        setNewDiscountText("");
        setNewDiscountPercent("");
        setNewMinSpendUsd("");
        setNewPlacements(["all"]);
        fetchCoupons();
      } else {
        setFeedback({ type: "error", message: data.error || "שגיאה ביצירת הקופון" });
      }
    } catch (err: any) {
      console.error("Create coupon error:", err);
      setFeedback({ type: "error", message: "שגיאה בשמירת הקופון" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    try {
      const res = await fetch(`/api/coupons/${coupon.id}`, {
        method: "PUT",
        headers: getAdminHeaders(),
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const data = await res.json();
      if (data.success) {
        setCoupons((prev) =>
          prev.map((c) => (c.id === coupon.id ? { ...c, isActive: !c.isActive } : c))
        );
      }
    } catch (err) {
      console.error("Failed to toggle coupon status:", err);
    }
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק את קוד הקופון ${code}?`)) return;

    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: `קוד הקופון ${code} נמחק בהצלחה` });
        setCoupons((prev) => prev.filter((c) => c.id !== id));
      } else {
        setFeedback({ type: "error", message: data.error || "מחיקת הקופון נכשלה" });
      }
    } catch (err) {
      console.error("Delete coupon failed:", err);
      setFeedback({ type: "error", message: "שגיאה במחיקת הקופון" });
    }
  };

  const totalClicks = coupons.reduce((sum, c) => sum + (c.clickCount || 0), 0);
  const activeCouponsCount = coupons.filter((c) => c.isActive).length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto" dir="rtl">
      {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div>
              <div className="flex items-center gap-2 text-ali-500 text-xs font-bold uppercase tracking-wider">
                <Ticket className="w-4 h-4" />
                ניהול קידומי מכירות והנחות
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">מערך קופונים וקודי הנחה</h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-1">
                הגדר קודי קופון של אלי אקספרס, שייך אותם למיקומים באתר, ועקוב אחר הקלקות בזמן אמת.
              </p>
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-500 text-white text-sm font-bold shadow-lg shadow-ali-600/20 transition-all cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>{showAddForm ? "סגור טופס" : "הוסף קופון חדש"}</span>
            </button>
          </div>

          {/* Feedback alert */}
          {feedback && (
            <div
              className={`p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-semibold ${
                feedback.type === "success"
                  ? "bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
                  : "bg-rose-950/80 border border-rose-500/40 text-rose-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400" />
                )}
                <span>{feedback.message}</span>
              </div>
              <button onClick={() => setFeedback(null)} className="text-xs opacity-70 hover:opacity-100">
                סגור
              </button>
            </div>
          )}

          {/* Live Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                <Ticket className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold">סך קופונים במערכת</span>
                <div className="text-2xl font-black text-white">{coupons.length}</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold">קופונים פעילים כעת</span>
                <div className="text-2xl font-black text-emerald-400">{activeCouponsCount}</div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <MousePointerClick className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs text-slate-400 font-semibold">סה&quot;כ העתקות וקליקים (חי)</span>
                <div className="text-2xl font-black text-amber-400">{totalClicks.toLocaleString()}</div>
              </div>
            </div>
          </div>

          {/* Add Coupon Form */}
          {showAddForm && (
            <form
              onSubmit={handleCreateCoupon}
              className="p-6 rounded-3xl bg-slate-800/90 border border-slate-700 shadow-xl space-y-6 animate-in slide-in-from-top-2 duration-200"
            >
              <div className="flex items-center gap-2 text-white font-bold text-lg border-b border-slate-700/80 pb-3">
                <Sparkles className="w-5 h-5 text-ali-500" />
                <h3>הגדרת קופון חדש</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    קוד קופון (באנגלית ובאותיות גדולות) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="למשל: ALIBUY2026"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-ali-500 text-white font-mono font-bold text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    כותרת קופון (פנימית)
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="קופון חודשי למוצרי אלקטרוניקה"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-ali-500 text-white text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    תיאור ההנחה שיוצג לגולש *
                  </label>
                  <input
                    type="text"
                    required
                    value={newDiscountText}
                    onChange={(e) => setNewDiscountText(e.target.value)}
                    placeholder="למשל: הנחה של $5 במעמד הצ'ק-אאוט"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-ali-500 text-white text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    סכום מינימום לקנייה ב-$ (אופציונלי)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newMinSpendUsd}
                    onChange={(e) => setNewMinSpendUsd(e.target.value)}
                    placeholder="30"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-ali-500 text-white text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    אחוז הנחה % (אופציונלי)
                  </label>
                  <input
                    type="number"
                    step="1"
                    value={newDiscountPercent}
                    onChange={(e) => setNewDiscountPercent(e.target.value)}
                    placeholder="10"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 focus:border-ali-500 text-white text-sm outline-none"
                  />
                </div>
              </div>

              {/* Placements */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2">
                  מיקומי הצגה באתר:
                </label>
                <div className="flex flex-wrap gap-2.5">
                  {[
                    { key: "all", label: "כל האתר (גלובלי)" },
                    { key: "product", label: "עמודי סקירות מוצרים" },
                    { key: "category", label: "עמודי טבלאות וקטגוריות" },
                    { key: "popup", label: "פופ-אפ עזיבה (Exit Intent)" },
                  ].map((p) => {
                    const isSelected = newPlacements.includes(p.key as any);
                    return (
                      <button
                        key={p.key}
                        type="button"
                        onClick={() => handleTogglePlacement(p.key as any)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-ali-600 border-ali-500 text-white"
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {isSelected ? "✓ " : "+ "}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700/80">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>שמור קופון</span>
                </button>
              </div>
            </form>
          )}

          {/* Coupons Table */}
          <div className="rounded-3xl bg-slate-800/80 border border-slate-700/80 overflow-hidden shadow-sm">
            <div className="p-4 sm:p-5 border-b border-slate-700/80 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-200">רשימת קופונים פעילים</h3>
              <button
                onClick={fetchCoupons}
                className="text-xs text-ali-400 hover:text-ali-300 font-semibold cursor-pointer"
              >
                רענן נתונים ↻
              </button>
            </div>

            {isLoading ? (
              <div className="py-20 text-center text-slate-400 flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-ali-500" />
                <span className="text-xs">טוען קופונים...</span>
              </div>
            ) : coupons.length === 0 ? (
              <div className="py-20 text-center text-slate-500 space-y-2">
                <Ticket className="w-10 h-10 mx-auto opacity-30" />
                <p className="text-sm font-semibold">לא הוגדרו עדיין קופונים במערכת</p>
                <p className="text-xs text-slate-600">לחץ על &quot;הוסף קופון חדש&quot; כדי להתחיל להציג מבצעים</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-700">
                    <tr>
                      <th className="p-4">קוד קופון</th>
                      <th className="p-4">הנחה ותיאור</th>
                      <th className="p-4">תנאי סף</th>
                      <th className="p-4">מיקומי הצגה</th>
                      <th className="p-4 text-center">הקלקות (חי)</th>
                      <th className="p-4 text-center">סטטוס</th>
                      <th className="p-4 text-center">פעולות</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60">
                    {coupons.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-750/40 transition-colors">
                        <td className="p-4">
                          <span className="px-3 py-1 rounded-lg bg-ali-500/10 border border-ali-500/30 text-ali-400 font-mono font-bold tracking-wider">
                            {c.code}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-slate-200">{c.discountText}</div>
                          {c.title && <div className="text-[11px] text-slate-400 mt-0.5">{c.title}</div>}
                        </td>
                        <td className="p-4 text-slate-300">
                          {c.minSpendUsd ? `קנייה מעל $${c.minSpendUsd}` : "ללא מינימום"}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1">
                            {c.placements?.map((plc) => (
                              <span
                                key={plc}
                                className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-700"
                              >
                                {plc === "all"
                                  ? "גלובלי"
                                  : plc === "product"
                                  ? "סקירות"
                                  : plc === "category"
                                  ? "קטגוריות"
                                  : "פופ-אפ"}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full">
                            {(c.clickCount || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleActive(c)}
                            className="cursor-pointer inline-flex items-center gap-1 text-xs"
                            title="לחץ לשינוי סטטוס"
                          >
                            {c.isActive ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/20">
                                פעיל
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-slate-700 text-slate-400 font-bold">
                                מושהה
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteCoupon(c.id, c.code)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="מחק קופון"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
    </div>
  );
}
