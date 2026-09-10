import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthGate>
      <div className="min-h-screen bg-slate-100 flex flex-col md:flex-row text-slate-900" dir="rtl">
        {/* Dynamic Responsive Admin Sidebar */}
        <AdminSidebar />

        {/* Main Admin Content */}
        <main className="flex-1 p-4 sm:p-8 lg:p-10 overflow-y-auto">{children}</main>
      </div>
    </AdminAuthGate>
  );
}
