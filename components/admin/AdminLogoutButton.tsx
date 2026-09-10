"use client";

import { LogOut } from "lucide-react";

export function AdminLogoutButton() {
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors text-xs font-semibold mt-2"
    >
      <LogOut className="w-3.5 h-3.5" />
      <span>התנתקות מהמערכת</span>
    </button>
  );
}
