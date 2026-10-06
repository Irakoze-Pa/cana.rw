import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Boxes, FileText, LayoutDashboard, Menu, Package, ShoppingCart, X } from "lucide-react";

import ManagementSidebar from "@/modules/dashboard/components/ManagementSidebar";
import ManagementTopbar from "@/modules/dashboard/components/DashboardTopbar";
import { useAuth } from "@/context/authContext";

function ManagementLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleDesktopSidebar = () => {
    setSidebarExpanded((previous) => !previous);
  };

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenuOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileMenuOpen]);

  return (
    <div className="cana-management-shell cana-operations-surface min-h-screen">
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-40 bg-gray-950/40 backdrop-blur-[1px] lg:hidden"
        />
      )}

      {/* SIDEBAR: desktop stays visible in compact mode; mobile uses a drawer. */}
      <aside
        className={`
          fixed
          inset-y-0
          left-0
          z-50
          transition-transform
          duration-300
          ease-in-out
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
          w-72
          ${sidebarExpanded ? "lg:w-72" : "lg:w-20"}
        `}
      >
        <ManagementSidebar
          sidebarOpen={sidebarExpanded || mobileMenuOpen}
          onToggle={toggleDesktopSidebar}
          onNavigate={() => setMobileMenuOpen(false)}
        />

        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
          className="absolute right-4 top-5 rounded-lg p-2 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <X size={19} />
        </button>
      </aside>

      <button
        type="button"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Open navigation menu"
        className="hidden"
      >
        <Menu size={19} strokeWidth={2} />
      </button>

      {/* MAIN AREA */}
      <main
        className={`
          min-h-screen
          min-w-0
          overflow-x-hidden
          transition-all
          duration-300
          ease-in-out
          ${sidebarExpanded ? "lg:ml-72" : "lg:ml-20"}
        `}
      >

        {/* TOPBAR */}
        <ManagementTopbar />

        {/* PAGE CONTENT */}
        <div className="cana-page-content pb-20 md:pb-5">
          <Outlet />
        </div>

      </main>
      <ManagementMobileNav onOpenMenu={() => setMobileMenuOpen(true)} menuOpen={mobileMenuOpen} role={user?.role} department={user?.department} />

    </div>
  );
}

export default ManagementLayout;

function ManagementMobileNav({ onOpenMenu, menuOpen, role, department }: { onOpenMenu: () => void; menuOpen: boolean; role?: string; department?: string }) {
  const elevated = role === "admin" || role === "superadmin";
  const links = [
    { to: "/management", label: "Overview", icon: LayoutDashboard, show: true },
    { to: "/management/quotations", label: "Quotes", icon: FileText, show: department === "marketing" },
    { to: "/management/sales", label: "Sales desk", icon: ShoppingCart, show: elevated || ["sales", "customer_service", "finance", "management"].includes(department || "") },
    { to: "/management/inventory", label: "Inventory", icon: Boxes, show: elevated || ["warehouse", "procurement", "production", "management"].includes(department || "") },
  ].filter((item) => item.show);
  return <nav aria-label="Management navigation" className="fixed inset-x-0 bottom-0 z-40 flex border-t border-slate-300 bg-white/95 px-2 py-1.5 pb-[calc(.375rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(15,23,42,.08)] backdrop-blur lg:hidden">{links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} end={to === "/management"} className={({ isActive }) => `flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-extrabold ${isActive ? "bg-red-50 text-red-700" : "text-slate-500"}`}><Icon size={18}/><span>{label}</span></NavLink>)}<button type="button" onClick={onOpenMenu} aria-expanded={menuOpen} className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-extrabold ${menuOpen ? "bg-slate-950 text-white" : "text-slate-500"}`}><Package size={18}/><span>More</span></button></nav>;
}
