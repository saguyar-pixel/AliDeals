"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ShoppingBag,
  Star,
  Flame,
  Layers,
  ShieldCheck,
  Settings,
  Menu,
  X,
  ArrowLeft,
  ChevronDown,
  Search,
} from "lucide-react";
import LiveSearchModal from "@/components/LiveSearchModal";

interface NavItem {
  id: string;
  title: string;
  href: string;
  icon?: string;
  subtitle?: string;
  placement: "header" | "hero_pills" | "footer" | "top5_dropdown";
  order: number;
  badge?: string;
  isActive: boolean;
  children?: NavItem[];
}

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [navItems, setNavItems] = useState<NavItem[]>([]);

  useEffect(() => {
    let mounted = true;
    fetch("/api/navigation")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data && Array.isArray(data.items)) {
          setNavItems(data.items);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  // Global Ctrl+K / Cmd+K search hotkey
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchModalOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Filter items by placement
  const top5Items = navItems
    .filter((item) => item.placement === "top5_dropdown" && item.isActive)
    .sort((a, b) => a.order - b.order);

  const customHeaderLinks = navItems
    .filter((item) => item.placement === "header" && item.isActive)
    .sort((a, b) => a.order - b.order);

  return (
    <>
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
                  <span className="text-[11px] font-medium text-slate-500 mt-0.5">
                    מדריכי קנייה וסקירות אלי אקספרס
                  </span>
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

              {/* Dynamic TOP 5 Dropdown */}
              <div className="relative group">
                <Link
                  href="/#top5"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
                >
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>מדריכי TOP 5</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:rotate-180 transition-transform" />
                </Link>

                <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  {top5Items.length > 0 ? (
                    top5Items.map((item) => (
                      <Link
                        key={item.id}
                        href={item.href}
                        className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-800"
                      >
                        <span className="text-xl">{item.icon || "⭐"}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{item.title}</div>
                          {item.subtitle && (
                            <div className="text-[11px] text-slate-500 font-normal truncate">{item.subtitle}</div>
                          )}
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="p-3 text-xs text-slate-500 text-center">
                      מדריכי TOP 5 מעודכנים יופיעו כאן
                    </div>
                  )}

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

              {/* Any custom header links configured in CMS */}
              {customHeaderLinks.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className="px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
                >
                  {item.title}
                </Link>
              ))}
            </nav>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Live Search Trigger Button */}
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200/80 transition-all cursor-pointer shadow-2xs group"
                title="חיפוש באלי אקספרס (Ctrl+K)"
              >
                <Search className="w-4 h-4 text-ali-600 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">חיפוש באלי אקספרס</span>
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-slate-300 text-slate-400">
                  ⌘K
                </kbd>
              </button>

              {/* Customs Guide Badge */}
              <Link
                href="/#customs-guide"
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors px-3 py-1.5 rounded-full border border-emerald-200"
                title="לחץ לקריאת מדריך המכס והמע״מ"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>בדיקת מכס עד $75</span>
              </Link>

              {/* CMS Studio shortcut in development */}
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
            {/* Mobile Search Button */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-ali-50/80 border border-ali-200 text-ali-900 font-bold text-sm transition-colors mb-2"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-ali-600" />
                <span>חיפוש חי באלי אקספרס...</span>
              </span>
              <ArrowLeft className="w-4 h-4 text-ali-500" />
            </button>

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

            {/* Dynamic Mobile TOP 5 links */}
            {top5Items.length > 0 && (
              <div className="pt-2 border-t border-slate-100 space-y-1">
                <div className="px-4 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  מדריכי השוואה פופולריים (TOP 5)
                </div>
                {top5Items.map((item) => (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-slate-50 text-slate-800 text-sm font-medium transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <span>{item.icon || "⭐"}</span>
                      <span>{item.title}</span>
                    </span>
                    <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                ))}
              </div>
            )}

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

      {/* Public Live Search Modal */}
      <LiveSearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </>
  );
}
