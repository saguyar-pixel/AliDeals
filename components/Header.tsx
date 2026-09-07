"use client";

import Link from "next/link";
import { ShoppingBag, Star, Flame, Layers, ShieldCheck, Settings } from "lucide-react";

export default function Header() {
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

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 font-medium text-sm text-slate-700">
            <Link
              href="/"
              className="px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
            >
              ראשי
            </Link>
            <Link
              href="/#reviews"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
            >
              <Star className="w-4 h-4 text-gold-500" />
              סקירות עומק
            </Link>
            <Link
              href="/#top5"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
            >
              <Layers className="w-4 h-4 text-indigo-500" />
              טבלאות TOP 5
            </Link>
            <Link
              href="/#deals"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
            >
              <Flame className="w-4 h-4 text-ali-500 animate-pulse" />
              דילים חמים
            </Link>
          </nav>

          {/* Trust badge & Admin link */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>בדיקת מכס עד $75</span>
            </div>
            <Link
              href="/admin"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors border border-slate-200"
              title="מערכת ניהול תוכן"
            >
              <Settings className="w-4 h-4 text-slate-500" />
              <span className="hidden sm:inline">CMS סטודיו</span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
