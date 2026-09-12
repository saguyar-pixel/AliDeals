"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  XCircle,
  X,
  AlertOctagon,
  HelpCircle,
} from "lucide-react";

export type ModalType = "critical" | "warning" | "confirm" | "info";
export type ToastType = "success" | "info" | "warning" | "error";

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  cancelText?: string;
}

interface ToastOptions {
  message: string;
  title?: string;
  type?: ToastType;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  createdAt: number;
}

interface AdminNotificationContextValue {
  confirmModal: (options: ModalOptions) => Promise<boolean>;
  alertModal: (options: ModalOptions) => Promise<void>;
  showToast: (options: ToastOptions | string, type?: ToastType) => void;
}

const AdminNotificationContext = createContext<AdminNotificationContextValue | null>(null);

export function AdminNotificationProvider({ children }: { children: ReactNode }) {
  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    options: ModalOptions;
    resolve: ((value: boolean) => void) | null;
    isConfirmDialog: boolean;
  }>({
    isOpen: false,
    options: { title: "", message: "", type: "info" },
    resolve: null,
    isConfirmDialog: true,
  });

  // Toasts State
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // 1. Confirm Modal (Returns Promise<boolean>)
  const confirmModal = useCallback((options: ModalOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options: {
          ...options,
          type: options.type || "confirm",
          confirmText: options.confirmText || "אישור",
          cancelText: options.cancelText || "ביטול",
        },
        resolve,
        isConfirmDialog: true,
      });
    });
  }, []);

  // 2. Alert Modal (Blocking Informational / Error Modal, returns Promise<void>)
  const alertModal = useCallback((options: ModalOptions): Promise<void> => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        options: {
          ...options,
          type: options.type || "critical",
          confirmText: options.confirmText || "סגור",
        },
        resolve: () => resolve(),
        isConfirmDialog: false,
      });
    });
  }, []);

  const handleModalClose = (confirmed: boolean) => {
    if (modalState.resolve) {
      modalState.resolve(confirmed);
    }
    setModalState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  };

  // 3. Subtle Toast (Auto-closing)
  const showToast = useCallback((options: ToastOptions | string, typeParam?: ToastType) => {
    const opts: ToastOptions =
      typeof options === "string" ? { message: options, type: typeParam || "info" } : options;

    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const duration = opts.durationMs ?? 3500;

    const newToast: ToastItem = {
      ...opts,
      id,
      createdAt: Date.now(),
      type: opts.type || typeParam || "info",
    };

    setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // max 5 toasts

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <AdminNotificationContext.Provider value={{ confirmModal, alertModal, showToast }}>
      {children}

      {/* BLOCKING MODAL DIALOG */}
      {modalState.isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
          dir="rtl"
          onKeyDown={(e) => {
            if (e.key === "Escape") handleModalClose(false);
          }}
        >
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 text-slate-900 space-y-5 animate-in zoom-in-95 duration-150 relative">
            {/* Modal Header */}
            <div className="flex items-start gap-4">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner ${
                  modalState.options.type === "critical"
                    ? "bg-rose-100 text-rose-600 border border-rose-200"
                    : modalState.options.type === "warning"
                    ? "bg-amber-100 text-amber-600 border border-amber-200"
                    : modalState.options.type === "confirm"
                    ? "bg-indigo-100 text-indigo-600 border border-indigo-200"
                    : "bg-blue-100 text-blue-600 border border-blue-200"
                }`}
              >
                {modalState.options.type === "critical" ? (
                  <AlertOctagon className="w-6 h-6" />
                ) : modalState.options.type === "warning" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : modalState.options.type === "confirm" ? (
                  <HelpCircle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-900">
                  {modalState.options.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed whitespace-pre-line font-medium">
                  {modalState.options.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleModalClose(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                title="סגור חלון"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              {modalState.isConfirmDialog && (
                <button
                  type="button"
                  onClick={() => handleModalClose(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
                >
                  {modalState.options.cancelText || "ביטול"}
                </button>
              )}

              <button
                type="button"
                autoFocus
                onClick={() => handleModalClose(true)}
                className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all ${
                  modalState.options.type === "critical"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                    : modalState.options.type === "warning"
                    ? "bg-amber-600 hover:bg-amber-700 shadow-amber-600/30"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30"
                }`}
              >
                {modalState.options.confirmText || "אישור"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTO-CLOSING TOASTS NOTIFICATIONS CONTAINER */}
      <div
        className="fixed top-4 left-4 z-[9998] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
        dir="rtl"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border flex items-start gap-3 backdrop-blur-md transition-all animate-in slide-in-from-top-4 duration-200 ${
              toast.type === "success"
                ? "bg-white/95 border-emerald-300 text-slate-900 shadow-emerald-500/10"
                : toast.type === "error"
                ? "bg-white/95 border-rose-300 text-slate-900 shadow-rose-500/10"
                : toast.type === "warning"
                ? "bg-white/95 border-amber-300 text-slate-900 shadow-amber-500/10"
                : "bg-white/95 border-slate-300 text-slate-900 shadow-slate-500/10"
            }`}
          >
            <div className="flex-shrink-0 mt-0.5">
              {toast.type === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : toast.type === "error" ? (
                <XCircle className="w-5 h-5 text-rose-600" />
              ) : toast.type === "warning" ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <Info className="w-5 h-5 text-indigo-600" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && (
                <h4 className="text-xs font-bold text-slate-900 mb-0.5">
                  {toast.title}
                </h4>
              )}
              <p className="text-xs text-slate-700 font-medium leading-snug">
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </AdminNotificationContext.Provider>
  );
}

export function useAdminNotification() {
  const ctx = useContext(AdminNotificationContext);
  if (!ctx) {
    throw new Error("useAdminNotification must be used within an AdminNotificationProvider");
  }
  return ctx;
}
