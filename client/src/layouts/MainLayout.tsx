import { Outlet } from "react-router-dom";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/footer";


function MainLayout() {
  return (
    <>
      <Navbar />

      <main className="min-h-screen">
        <Outlet />
      </main>

      <Footer />
    </>
  );
}


export default MainLayout;