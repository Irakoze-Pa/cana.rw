import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, X } from "lucide-react";

import ManagementSidebar from "@/modules/dashboard/components/ManagementSidebar";
import ManagementTopbar from "@/modules/dashboard/components/DashboardTopbar";

function ManagementLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleDesktopSidebar = () => {
    setSidebarExpanded((previous) => !previous);
  };

  return (
    <div className="cana-operations-surface min-h-screen">
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
          ${sidebarExpanded ? "lg:w-72" : "lg:w-20"}
        `}
      >
        <ManagementSidebar
          sidebarOpen={sidebarExpanded}
          onToggle={toggleDesktopSidebar}
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
        className="fixed left-4 top-3 z-30 flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:bg-gray-100 lg:hidden"
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
        <div className="mx-auto w-full max-w-[1920px] p-3 pt-4 sm:p-5 lg:p-6">
          <Outlet />
        </div>

      </main>

    </div>
  );
}

export default ManagementLayout;
