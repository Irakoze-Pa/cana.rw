import { NavLink, Outlet } from "react-router-dom";
import { FileText, LayoutDashboard, Package, ShoppingCart } from "lucide-react";

import CustomerSidebar from "../components/CustomerSidebar";
import DashboardTopbar from "../components/DashboardTopbar";
import FloatingWhatsApp from "@/components/common/FloatingWhatsApp";

function CustomerDashboardLayout() {
  return (
    <div className="cana-operations-surface min-h-screen">
      <FloatingWhatsApp />
      <div className="flex min-h-screen">
        {/* =================================================
            SIDEBAR
        ================================================= */}

        <CustomerSidebar />

        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <div className="min-w-0 flex min-h-screen flex-1 flex-col">
          {/* =================================================
              TOPBAR
          ================================================= */}

          <DashboardTopbar />

          {/* =================================================
              PAGE CONTENT
          ================================================= */}

          <main className="flex-1">
            <div className="cana-page-content"><Outlet /></div>
          </main>
        </div>
      </div>
      <nav aria-label="Customer navigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-2 py-2 pb-[calc(.5rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur md:hidden">
        <MobileNav to="/dashboard" end icon={LayoutDashboard} label="Home"/>
        <MobileNav to="/cana-paints/products" icon={Package} label="Products"/>
        <MobileNav to="/dashboard/orders" icon={ShoppingCart} label="Orders"/>
        <MobileNav to="/dashboard/quotations" icon={FileText} label="Quotes"/>
      </nav>
    </div>
  );
}

export default CustomerDashboardLayout;

function MobileNav({ to, end, icon: Icon, label }: { to: string; end?: boolean; icon: typeof LayoutDashboard; label: string }) {
  return <NavLink to={to} end={end} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[11px] font-bold ${isActive ? "bg-red-50 text-red-700" : "text-slate-500"}`}><Icon size={19}/><span>{label}</span></NavLink>;
}
