"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Bot,
  Package,
  Sparkles,
  Search,
  FileText,
  Replace,
  TrendingUp,
  Settings,
  ExternalLink,
  ShoppingBag,
  Menu,
  X,
  Zap,
} from "lucide-react";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navSections: NavSection[] = [
    {
      title: "חמ\"ל ובינה מלאכותית",
      items: [
        {
          label: "דשבורד ראשי",
          href: "/admin",
          icon: LayoutDashboard,
        },
        {
          label: "חמ\"ל סוכנים (AI)",
          href: "/admin/agent-team",
          icon: Bot,
          badge: "6 סוכנים",
          badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
        },
      ],
    },
    {
      title: "ניהול קטלוג ומוצרים",
      items: [
        {
          label: "מאגר מוצרים מרכזי",
          href: "/admin/products",
          icon: Package,
          badge: "קטלוג",
          badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
        },
        {
          label: "סטודיו קישורים מהיר",
          href: "/admin/bulk-ingest",
          icon: Zap,
          badge: "Shortlinks",
          badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
        },
        {
          label: "חיפוש ב-AliExpress API",
          href: "/admin/ingest",
          icon: Search,
          badge: "API Live",
          badgeColor: "bg-ali-500/20 text-ali-300 border-ali-500/30",
        },
      ],
    },
    {
      title: "ניהול תוכן ו-SEO",
      items: [
        {
          label: "ניהול ועריכת עמודים",
          href: "/admin/pages",
          icon: FileText,
        },
        {
          label: "חיפוש והחלפה גלובלי",
          href: "/admin/find-replace",
          icon: Replace,
          badge: "כלי על",
          badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
        },
      ],
    },
    {
      title: "מונטיזציה ומערכת",
      items: [
        {
          label: "ארביטראז' ו-SubIDs",
          href: "/admin/arbitrage",
          icon: TrendingUp,
        },
        {
          label: "הגדרות וחיבורי API",
          href: "/admin/settings",
          icon: Settings,
        },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile Top Header Bar */}
      <div className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-40">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-ali-600 flex items-center justify-center text-white font-bold shadow-md shadow-ali-600/30">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-white text-sm">AliDeals</span>
            <span className="text-[9px] text-ali-400 font-bold uppercase tracking-wider">CMS Studio Pro</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/"
            target="_blank"
            className="text-slate-400 hover:text-white p-2 rounded-lg bg-slate-800"
            title="צפה באתר הראשי"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-lg bg-slate-800 text-white hover:bg-slate-700 transition-colors"
            aria-label="פתח תפריט"
          >
            {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Backdrop for Mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Main Sidebar (Desktop & Mobile Drawer) */}
      <aside
        className={`fixed md:sticky top-0 right-0 h-screen w-72 bg-slate-950 text-slate-300 flex flex-col justify-between shrink-0 p-5 border-l border-slate-800/80 z-50 transition-transform duration-300 ease-in-out ${
          isMobileOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"
        }`}
      >
        <div className="space-y-6 overflow-y-auto">
          {/* Logo & Public Link */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
            <Link href="/admin" className="flex items-center gap-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-ali-600 to-ali-500 flex items-center justify-center text-white font-black shadow-lg shadow-ali-600/30 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-black text-white text-base tracking-tight leading-none group-hover:text-ali-400 transition-colors">
                  AliDeals
                </span>
                <span className="text-[10px] text-ali-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                  <span>CMS Studio Pro</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </span>
              </div>
            </Link>

            <Link
              href="/"
              target="_blank"
              className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-900 border border-transparent hover:border-slate-800 transition-all"
              title="צפה באתר הציבורי בטאב חדש"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>

          {/* Navigation Sections */}
          <nav className="space-y-6 text-sm">
            {navSections.map((section, idx) => (
              <div key={idx} className="space-y-1.5">
                <div className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {section.title}
                </div>

                <div className="space-y-1">
                  {section.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileOpen(false)}
                        className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-200 ${
                          active
                            ? "bg-gradient-to-l from-ali-600/30 to-ali-600/10 text-white font-bold border-r-4 border-ali-500 shadow-sm"
                            : "text-slate-400 hover:text-slate-100 hover:bg-slate-900/80"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 transition-transform duration-200 group-hover:scale-110 ${
                              active ? "text-ali-400" : "text-slate-400 group-hover:text-slate-300"
                            }`}
                          />
                          <span className="text-xs sm:text-sm">{item.label}</span>
                        </div>

                        {item.badge && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                              item.badgeColor || "bg-slate-800 text-slate-300 border-slate-700"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Footer System Status & Logout */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3 shrink-0">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 space-y-2 text-[11px]">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-indigo-400" />
                <span>Gemini 2.0 Flash:</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                פעיל
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center gap-1.5">
                <ShoppingBag className="w-3 h-3 text-ali-400" />
                <span>AliExpress API:</span>
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                מסונכרן
              </span>
            </div>
          </div>

          <div className="pt-1">
            <AdminLogoutButton />
          </div>
        </div>
      </aside>
    </>
  );
}
