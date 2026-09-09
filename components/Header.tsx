"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Star, Flame, Layers, ShieldCheck, Settings, Menu, X, ArrowLeft, ChevronDown } from "lucide-react";

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-ali-600 to-ali-500 flex items-center justify-center text-white shadow-md shadow-ali-500/20 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tight text-slate-900 leading-none">
                  Ali<span className="text-ali-600">Deals</span>
                </span>
                <span className="text-[11px] font-medium text-slate-500 mt-0.5">מדריכי קנייה וסקירות אלי אקספרס</span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-medium text-sm text-slate-700">
            <Link
              href="/"
              className="px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
            >
              ראשי
            </Link>
            <div className="relative group">
              <Link
                href="/#top5"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
              >
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>מדריכי TOP 5</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:rotate-180 transition-transform" />
              </Link>
              <div className="absolute top-full right-0 mt-1 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                <Link
                  href="/top5/top-5-mini-projectors-aliexpress"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-800"
                >
                  <span className="text-xl">📽️</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">מקרנים ניידים וחכמים</div>
                    <div className="text-[11px] text-slate-500 font-normal">השוואת 5 מקרנים לחדר ולנסיעות</div>
                  </div>
                </Link>
                <Link
                  href="/top5/top-5-baby-monitors-aliexpress"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-800"
                >
                  <span className="text-xl">👶</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">מוניטורים לתינוקות</div>
                    <div className="text-[11px] text-slate-500 font-normal">מצלמות מאובטחות ללא WiFi ו-PTZ</div>
                  </div>
                </Link>
                <Link
                  href="/top5/top-5-sports-shorts-aliexpress"
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-800"
                >
                  <span className="text-xl">🏃</span>
                  <div>
                    <div className="text-xs font-bold text-slate-900">מכנסוני ספורט וריצה</div>
                    <div className="text-[11px] text-slate-500 font-normal">דגמי 2 ב-1, דריי-פיט וקרוספיט</div>
                  </div>
                </Link>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <Link
                    href="/#top5"
                    className="block text-center py-2 text-xs font-semibold text-ali-600 hover:bg-ali-50 rounded-lg transition-colors"
                  >
                    לכל טבלאות ההשוואה באתר ←
                  </Link>
                </div>
              </div>
            </div>
            <Link
              href="/#reviews"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
            >
              <Star className="w-4 h-4 text-amber-500" />
              סקירות עומק
            </Link>
            <Link
              href="/#deals"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
            >
              <Flame className="w-4 h-4 text-ali-500 animate-pulse" />
              דילים חמים
            </Link>
          </nav>

          {/* Trust badge & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/#customs-guide"
              className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors px-3 py-1.5 rounded-full border border-emerald-200"
              title="לחץ לקריאת מדריך המכס והמע״מ"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>בדיקת מכס עד $75</span>
            </Link>

            {process.env.NODE_ENV === "development" && (
              <Link
                href="/admin"
                className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors border border-slate-200"
                title="מערכת ניהול תוכן"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>CMS סטודיו</span>
              </Link>
            )}

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200"
              aria-label="תפריט ניווט"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold text-sm transition-colors"
          >
            <span>ראשי</span>
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            href="/#reviews"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold text-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span>סקירות עומק</span>
            </span>
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            href="/#top5"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold text-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>טבלאות TOP 5</span>
            </span>
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>
          <Link
            href="/#deals"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold text-sm transition-colors"
          >
            <span className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-ali-500" />
              <span>דילים חמים</span>
            </span>
            <ArrowLeft className="w-4 h-4 text-slate-400" />
          </Link>

          {/* Quick Category Guides */}
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <div className="px-4 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              מדריכי השוואה פופולריים (TOP 5)
            </div>
            <Link
              href="/top5/top-5-mini-projectors-aliexpress"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>📽️</span>
                <span>מקרנים ניידים וחכמים</span>
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/top5/top-5-baby-monitors-aliexpress"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>👶</span>
                <span>מוניטורים ומצלמות לתינוקות</span>
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            </Link>
            <Link
              href="/top5/top-5-sports-shorts-aliexpress"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors"
            >
              <span className="flex items-center gap-2.5">
                <span>🏃</span>
                <span>מכנסוני ספורט וריצה</span>
              </span>
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            </Link>
          </div>

          <Link
            href="/#customs-guide"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 font-semibold text-sm transition-colors mt-2"
          >
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>מדריך ומחשבון מכס ($75)</span>
            </span>
            <ArrowLeft className="w-4 h-4 text-emerald-600" />
          </Link>
        </div>
      )}
    </header>
  );
}
