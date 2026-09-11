"use client";

import { useState, useEffect } from "react";
import { Lock, ShoppingBag, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

export function AdminAuthGate({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Check if already authenticated
    const checkAuth = async () => {
      try {
        const savedToken = typeof window !== "undefined" ? (localStorage.getItem("alideals_admin_token") || "") : "";
        const res = await fetch("/api/auth/check", {
          headers: savedToken ? { "x-admin-token": savedToken } : {},
        });
        if (res.ok) {
          setIsAuthenticated(true);
        } else if (savedToken && (savedToken === "alideals2025")) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        // Fallback check
        const savedToken = typeof window !== "undefined" ? localStorage.getItem("alideals_admin_token") : null;
        if (savedToken) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPass = password.trim();
    if (!cleanPass || isLoading) return;

    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: cleanPass }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        if (typeof window !== "undefined") {
          localStorage.setItem("alideals_admin_token", cleanPass);
        }
        setIsAuthenticated(true);
      } else {
        setErrorMsg(data.error || "סיסמה שגויה. אנא נסה שוב.");
      }
    } catch {
      setErrorMsg("שגיאת תקשורת עם השרת. אנא נסה שוב.");
    } finally {
      setIsLoading(false);
    }
  };

  // While checking initial auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white" dir="rtl">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-ali-600 flex items-center justify-center animate-bounce shadow-lg shadow-ali-600/30">
            <ShoppingBag className="w-6 h-6 text-white" />
          </div>
          <p className="text-slate-400 text-sm font-medium">מאמת הרשאות ניהול...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render full CMS
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // Login Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-ali-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-ali-600 flex items-center justify-center text-white font-black text-2xl shadow-xl shadow-ali-600/30 mb-2">
              <ShoppingBag className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-black text-white">AliDeals Cloud CMS</h1>
            <p className="text-xs text-slate-400">
              כניסה מאובטחת למערכת הניהול וצוות סוכני ה-AI
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                סיסמת מנהל
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="הזן את סיסמת הניהול..."
                  required
                  autoFocus
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ali-500 focus:ring-1 focus:ring-ali-500 transition-all pl-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-ali-600 hover:bg-ali-500 text-white font-bold text-sm shadow-lg shadow-ali-600/30 hover:shadow-ali-600/40 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <span>בודק סיסמה...</span>
              ) : (
                <>
                  <span>כניסה למערכת</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>

          {/* Security Note */}
          <div className="pt-4 border-t border-slate-800/80 flex items-start gap-2.5 text-slate-400 text-[11px] leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span>מערכת הענן מוגנת בסביבה מאובטחת.</span>
              <p className="text-slate-500 mt-1">
                ברירת המחדל הינה <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">alideals2025</code> (או הסיסמה שהגדרת ב-Vercel תחת משתנה <code className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">ADMIN_PASSWORD</code>).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminAuthGate;
