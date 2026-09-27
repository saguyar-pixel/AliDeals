"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ShoppingBag, Star, Flame, Layers, ChevronDown,
  ShieldCheck, Settings, Menu, X, ArrowLeft, Search,
} from "lucide-react";

const LiveSearchModal = dynamic(() => import("@/components/LiveSearchModal"), {
  ssr: false,
  loading: () => null,
});

export interface NavItem {
  id: string;
  title: string;
  href: string;
  icon?: string;
  subtitle?: string;
  placement: string;
  order: number;
  badge?: string;
  isActive: boolean;
  isDropdown?: boolean;
  children?: Array<{
    id: string;
    title: string;
    href: string;
    icon?: string;
    subtitle?: string;
    order: number;
  }>;
}

const NAV_CACHE_KEY = "alideals_nav_items";

const DEFAULT_HEADER_NAV: NavItem[] = [
  {
    id: "nav_home",
    title: "ראשי",
    href: "/",
    placement: "header",
    order: 1,
    isActive: true,
  },
  {
    id: "nav_top5",
    title: "מדריכי TOP 5",
    href: "/#top5",
    icon: "Layers",
    placement: "header",
    order: 2,
    isActive: true,
    isDropdown: true,
    children: [
      {
        id: "sub_projectors",
        title: "מקרנים ניידים וחכמים",
        href: "/top5/top-5-mini-projectors-aliexpress",
        icon: "📽️",
        subtitle: "השוואת מקרנים מומלצים לחדר ולנסיעות",
        order: 1,
      },
      {
        id: "sub_monitors",
        title: "מוניטורים לתינוקות",
        href: "/top5/top-5-baby-monitors-aliexpress",
        icon: "👶",
        subtitle: "מצלמות מאובטחות ללא WiFi ו-PTZ",
        order: 2,
      },
      {
        id: "sub_shorts",
        title: "מכנסוני ספורט וריצה",
        href: "/top5/top-5-sports-shorts-aliexpress",
        icon: "🏃",
        subtitle: "דגמי 2 ב-1, דריי-פיט וקרוספיט",
        order: 3,
      },
    ],
  },
  {
    id: "nav_reviews",
    title: "סקירות עומק",
    href: "/#reviews",
    icon: "Star",
    placement: "header",
    order: 3,
    isActive: true,
  },
  {
    id: "nav_deals",
    title: "דילים חמים",
    href: "/#deals",
    icon: "Flame",
    placement: "header",
    order: 4,
    isActive: true,
  },
];

function renderNavIcon(icon?: string) {
  if (!icon) return null;
  if (icon === "Star") return <Star className="w-4 h-4 text-amber-500" />;
  if (icon === "Flame") return <Flame className="w-4 h-4 text-ali-500" />;
  if (icon === "Layers") return <Layers className="w-4 h-4 text-indigo-500" />;
  if (icon === "ShieldCheck") return <ShieldCheck className="w-4 h-4 text-emerald-600" />;
  return <span className="text-base leading-none">{icon}</span>;
}

export default function Header() {
  const [navItems, setNavItems] = useState<NavItem[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

  const fetchNav = useCallback((forceRefresh = false) => {
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(NAV_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNavItems(parsed);
            return;
          }
        }
      } catch {}
    }

    fetch("/api/navigation")
      .then((r) => r.json())
      .then((data) => {
        const raw = Array.isArray(data.menu)
          ? data.menu
          : Array.isArray(data.items)
          ? data.items
          : [];
        if (raw.length === 0) return;

        const normalized: NavItem[] = raw.map((m: any) => ({
          id: m.id,
          title: m.label || m.title || "קישור",
          href: m.href || "/",
          icon: m.icon,
          subtitle: m.subtitle,
          placement:
            m.placement === "header_nav" || m.placement === "header"
              ? "header"
              : m.placement,
          order: Number(m.sortOrder || m.order) || 1,
          badge: m.badge,
          isActive: m.isActive !== undefined ? m.isActive : true,
          isDropdown: Boolean(m.isDropdown || (m.children && m.children.length > 0)),
          children: Array.isArray(m.children)
            ? m.children.map((c: any) => ({
                id: c.id,
                title: c.label || c.title || "פריט",
                href: c.href || "/",
                icon: c.icon,
                subtitle: c.subtitle,
                order: Number(c.sortOrder || c.order) || 1,
              }))
            : [],
        }));
        setNavItems(normalized);
        try {
          sessionStorage.setItem(NAV_CACHE_KEY, JSON.stringify(normalized));
        } catch {}
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchNav();

    // Listen for instant CMS menu update events
    const handleNavUpdated = () => {
      try {
        sessionStorage.removeItem(NAV_CACHE_KEY);
      } catch {}
      fetchNav(true);
    };

    window.addEventListener("alideals_nav_updated", handleNavUpdated);
    return () => {
      window.removeEventListener("alideals_nav_updated", handleNavUpdated);
    };
  }, [fetchNav]);

  // Global Ctrl+K / Cmd+K shortcut
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

  // Compute clean, unified list of active header items
  const activeHeaderItems = (navItems.length > 0 ? navItems : DEFAULT_HEADER_NAV)
    .filter(
      (item) =>
        (item.placement === "header" || item.placement === "header_nav") &&
        item.isActive
    )
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

            {/* Desktop Navigation - 100% Dynamic & Unified */}
            <nav className="hidden md:flex items-center gap-1 font-medium text-sm text-slate-700">
              {activeHeaderItems.map((item) => {
                if (item.isDropdown) {
                  const children = item.children || [];
                  return (
                    <div key={item.id} className="relative group">
                      <Link
                        href={item.href || "#"}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
                      >
                        {renderNavIcon(item.icon)}
                        <span>{item.title}</span>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:rotate-180 transition-transform" />
                      </Link>

                      <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 hidden group-hover:block z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                        {children.length > 0 ? (
                          children.map((child) => (
                            <Link
                              key={child.id}
                              href={child.href}
                              className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-800"
                            >
                              <span className="text-xl shrink-0">{child.icon || "⭐"}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {child.title}
                                </div>
                                {child.subtitle && (
                                  <div className="text-[11px] text-slate-500 font-normal truncate">
                                    {child.subtitle}
                                  </div>
                                )}
                              </div>
                            </Link>
                          ))
                        ) : (
                          <div className="p-3 text-xs text-slate-500 text-center">
                            מדריכים מעודכנים יופיעו כאן
                          </div>
                        )}

                        {item.href && item.href !== "#" && (
                          <div className="border-t border-slate-100 mt-1 pt-1">
                            <Link
                              href={item.href}
                              className="block text-center py-2 text-xs font-semibold text-ali-600 hover:bg-ali-50 rounded-lg transition-colors"
                            >
                              לכל הפריטים בקטגוריה ←
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-slate-100 hover:text-ali-600 transition-colors"
                  >
                    {renderNavIcon(item.icon)}
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => setSearchModalOpen(true)}
                className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-semibold border border-slate-200/80 transition-all cursor-pointer group"
                title="חיפוש באלי אקספרס (Ctrl+K)"
              >
                <Search className="w-4 h-4 text-ali-600 group-hover:scale-110 transition-transform" />
                <span className="hidden sm:inline">חיפוש באלי אקספרס</span>
                <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white rounded border border-slate-300 text-slate-400">
                  ⌘K
                </kbd>
              </button>

              <Link
                href="/#customs-guide"
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors px-3 py-1.5 rounded-full border border-emerald-200"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>בדיקת מכס עד $75</span>
              </Link>

              {process.env.NODE_ENV === "development" && (
                <Link
                  href="/admin"
                  className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition-colors border border-slate-200"
                >
                  <Settings className="w-4 h-4 text-slate-500" />
                  <span>CMS סטודיו</span>
                </Link>
              )}

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors border border-slate-200"
                aria-label="תפריט ניווט"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu - 100% Dynamic & Unified (Zero Duplication) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2 shadow-xl animate-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setSearchModalOpen(true);
              }}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-ali-50/80 border border-ali-200 text-ali-900 font-bold text-sm mb-2"
            >
              <span className="flex items-center gap-2">
                <Search className="w-4 h-4 text-ali-600" />
                <span>חיפוש חי באלי אקספרס...</span>
              </span>
              <ArrowLeft className="w-4 h-4 text-ali-500" />
            </button>

            {/* Unified Dynamic List */}
            {activeHeaderItems.map((item) => {
              if (item.isDropdown) {
                const children = item.children || [];
                return (
                  <div key={item.id} className="space-y-1">
                    <Link
                      href={item.href || "#"}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold text-sm"
                    >
                      <span className="flex items-center gap-2.5">
                        {renderNavIcon(item.icon)}
                        <span>{item.title}</span>
                      </span>
                      <ArrowLeft className="w-4 h-4 text-slate-400" />
                    </Link>

                    {children.length > 0 && (
                      <div className="mr-6 space-y-1 border-r-2 border-slate-100 pr-3 my-1">
                        {children.map((child) => (
                          <Link
                            key={child.id}
                            href={child.href}
                            onClick={() => setMobileMenuOpen(false)}
                            className="flex items-center justify-between py-2 text-xs text-slate-700 hover:text-ali-600"
                          >
                            <span className="flex items-center gap-2">
                              {child.icon && <span>{child.icon}</span>}
                              <span className="font-medium">{child.title}</span>
                            </span>
                            <ArrowLeft className="w-3 h-3 text-slate-300" />
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-900 font-semibold text-sm"
                >
                  <span className="flex items-center gap-2.5">
                    {renderNavIcon(item.icon)}
                    <span>{item.title}</span>
                  </span>
                  <ArrowLeft className="w-4 h-4 text-slate-400" />
                </Link>
              );
            })}

            <div className="pt-2 border-t border-slate-100">
              <Link
                href="/#customs-guide"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-emerald-900 font-semibold text-sm"
              >
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>מדריך ומחשבון מכס ($75)</span>
                </span>
                <ArrowLeft className="w-4 h-4 text-emerald-600" />
              </Link>
            </div>
          </div>
        )}
      </header>

      <LiveSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
}
