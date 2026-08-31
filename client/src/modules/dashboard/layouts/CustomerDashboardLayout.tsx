import { Outlet } from "react-router-dom";

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

        <div className="flex min-h-screen flex-1 flex-col">
          {/* =================================================
              TOPBAR
          ================================================= */}

          <DashboardTopbar />

          {/* =================================================
              PAGE CONTENT
          ================================================= */}

          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}

export default CustomerDashboardLayout;
