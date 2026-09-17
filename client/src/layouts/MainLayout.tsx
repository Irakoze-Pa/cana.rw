import { Outlet } from "react-router-dom";

import Navbar from "@/components/navigation/Navbar";
import Footer from "@/components/navigation/footer";
import FloatingWhatsApp from "@/components/common/FloatingWhatsApp";
import Seo from "@/components/seo/Seo";


function MainLayout() {
  return (
    <>
      <Seo />
      <Navbar />

      <main className="cana-public-surface min-h-screen">
        <Outlet />
      </main>

      <Footer />
      <FloatingWhatsApp />
    </>
  );
}


export default MainLayout;
