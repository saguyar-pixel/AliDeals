"use client";

import { useState, useEffect } from "react";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  RefreshCw,
  Clock,
  Plug,
  Zap,
  Truck,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  AlertCircle,
  Filter,
} from "lucide-react";
import { UgcVerificationRecord, UgcSummary } from "@/lib/db/json-db";

export default function UgcAdminPage() {
  const [verifications, setVerifications] = useState<UgcVerificationRecord[]>([]);
  const [summary, setSummary] = useState<UgcSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "approved" | "pending">("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchVerifications = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ugc-verification", {
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.verifications)) {
        setVerifications(data.verifications);
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err: any) {
      console.error("Failed to load UGC:", err);
      setFeedback({ type: "error", message: "שגיאה בטעינת דיווחי קהילה" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVerifications();
  }, []);

  const handleToggleApproval = async (id: string, currentApproved: boolean) => {
    try {
      const res = await fetch("/api/ugc-verification", {
        method: "PATCH",
        headers: {
          ...getAdminHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, isApproved: !currentApproved }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifications((prev) =>
          prev.map((v) => (v.id === id ? { ...v, isApproved: !currentApproved } : v))
        );
        setFeedback({
          type: "success",
          message: !currentApproved ? "הדיווח אושר בהצלחה ויוצג באתר" : "הדיווח הועבר למצב ממתין",
        });
      } else {
        throw new Error(data.error || "שגיאה בעדכון");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "שגיאה באישור הדיווח" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק דיווח זה לצמיתות?")) return;

    try {
      const res = await fetch(`/api/ugc-verification?id=${id}`, {
        method: "DELETE",
        headers: getAdminHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setVerifications((prev) => prev.filter((v) => v.id !== id));
        setFeedback({ type: "success", message: "הדיווח נמחק בהצלחה" });
      } else {
        throw new Error(data.error || "שגיאה במחיקה");
      }
    } catch (err: any) {
      setFeedback({ type: "error", message: err.message || "שגיאה במחיקת הדיווח" });
    }
  };

  const filteredItems = verifications.filter((v) => {
    if (filter === "approved") return v.isApproved;
    if (filter === "pending") return !v.isApproved;
    return true;
  });

  const totalCount = verifications.length;
  const approvedCount = verifications.filter((v) => v.isApproved).length;
  const pendingCount = totalCount - approvedCount;

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-right" dir="rtl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 text-ali-600 text-xs font-bold uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>ניהול Social Proof & אימותי קהילה</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
            אימותי רוכשים ישראליים (UGC)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            אישור, ניטור ומחיקת דיווחי קונים (תקע EU מקורי, תאימות 220V וזמני משלוח לדואר ישראל).
          </p>
        </div>

        <button
          onClick={fetchVerifications}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-sm font-bold shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-ali-600" : ""}`} />
          <span>רענון נתונים</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between text-sm font-bold shadow-xs animate-in fade-in duration-200 ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          <span>{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs opacity-70 hover:opacity-100 underline cursor-pointer"
          >
            סגור
          </button>
        </div>
      )}

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs text-slate-500 font-semibold">סה&quot;כ דיווחים</span>
          <div className="text-3xl font-black text-slate-900">{totalCount}</div>
          <span className="text-xs text-slate-400">
            {approvedCount} מאושרים • {pendingCount} ממתינים
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">תקע אירופאי (EU)</span>
            <Plug className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-3xl font-black text-blue-600">
            {totalCount > 0
              ? Math.round((verifications.filter((v) => v.isEuPlug).length / totalCount) * 100)
              : 0}
            %
          </div>
          <span className="text-xs text-blue-700">תואם תקע ישראלי</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">תאימות 220V</span>
            <Zap className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-black text-emerald-600">
            {totalCount > 0
              ? Math.round((verifications.filter((v) => v.voltage220vCompatible).length / totalCount) * 100)
              : 0}
            %
          </div>
          <span className="text-xs text-emerald-700">בטוח לרשת החשמל</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">זמן הגעה ממוצע</span>
            <Truck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-black text-amber-600">
            {totalCount > 0
              ? Math.round(verifications.reduce((sum, v) => sum + (v.deliveryDays || 11), 0) / totalCount)
              : 11}{" "}
            ימים
          </div>
          <span className="text-xs text-amber-700">AliExpress Standard</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Filter className="w-4 h-4 text-slate-400 ml-1" />
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          הכל ({totalCount})
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filter === "pending" ? "bg-amber-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          ממתינים לאישור ({pendingCount})
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            filter === "approved" ? "bg-emerald-600 text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          מאושרים באתר ({approvedCount})
        </button>
      </div>

      {/* List / Table */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-ali-600" />
          <p className="text-sm font-semibold">טוען דיווחי קהילה...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 space-y-2">
          <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
          <h3 className="text-base font-bold text-slate-700">אין דיווחים להצגה בסטטוס זה</h3>
          <p className="text-xs text-slate-500">
            דיווחי גולשים חדשים מטופס ה-10 שניות יופיעו כאן בזמן אמת.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                <tr>
                  <th className="p-3.5">סטטוס</th>
                  <th className="p-3.5">מזהה מוצר</th>
                  <th className="p-3.5">תקע EU</th>
                  <th className="p-3.5">מתח 220V</th>
                  <th className="p-3.5">זמן משלוח</th>
                  <th className="p-3.5">המלצה</th>
                  <th className="p-3.5">הערת קונה</th>
                  <th className="p-3.5">תאריך</th>
                  <th className="p-3.5 text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          item.isApproved
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {item.isApproved ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>מאושר</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3" />
                            <span>ממתין</span>
                          </>
                        )}
                      </span>
                    </td>

                    <td className="p-3.5 font-mono text-slate-800 font-bold max-w-[140px] truncate" title={item.productId}>
                      {item.productId}
                    </td>

                    <td className="p-3.5">
                      {item.isEuPlug ? (
                        <span className="text-emerald-700 font-bold">✓ תקע EU</span>
                      ) : (
                        <span className="text-red-600 font-bold">✗ מתאם/אחר</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      {item.voltage220vCompatible ? (
                        <span className="text-emerald-700 font-bold">✓ 220V תקין</span>
                      ) : (
                        <span className="text-red-600 font-bold">✗ דורש שנאי</span>
                      )}
                    </td>

                    <td className="p-3.5 font-semibold text-slate-700">
                      {item.deliveryDays} ימים
                    </td>

                    <td className="p-3.5">
                      {item.isRecommended ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                          <ThumbsUp className="w-3 h-3" />
                          <span>מומלץ</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 font-medium">
                          <ThumbsDown className="w-3 h-3" />
                          <span>לא מומלץ</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 text-slate-600 max-w-[200px] truncate" title={item.buyerComment || "ללא הערה"}>
                      {item.buyerComment || <span className="text-slate-300">-</span>}
                    </td>

                    <td className="p-3.5 text-slate-400 font-mono text-[11px]">
                      {new Date(item.createdAt).toLocaleDateString("he-IL")}
                    </td>

                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleApproval(item.id, item.isApproved)}
                          className={`p-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            item.isApproved
                              ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                              : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                          title={item.isApproved ? "העבר לממתין" : "אשר להצגה באתר"}
                        >
                          {item.isApproved ? "בטל אישור" : "אשר דיווח"}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer"
                          title="מחק לצמיתות"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
