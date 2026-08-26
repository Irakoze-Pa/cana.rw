import { Outlet } from "react-router-dom";

import CustomerSidebar from "../components/CustomerSidebar";
import DashboardTopbar from "../components/DashboardTopbar";

function CustomerDashboardLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
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