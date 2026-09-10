import CorporateHero from "@/components/home/CorporateHero";
import About from "@/components/home/About";
import WhyChoose from "@/components/home/WhyChoose";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CorporateTestimonials from "@/components/home/CorporateTestimonials";



function Home() {
  return (
    <main className="cana-home">
      <CorporateHero />
      <About />
      <FeaturedProducts />
      <WhyChoose />
      <CorporateTestimonials />
    </main>
  );
}


export default Home;
