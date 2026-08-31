import Hero from "@/components/home/Hero";
import About from "@/components/home/About";
import WhyChoose from "@/components/home/WhyChoose";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import Testimonials from "@/components/home/Testimonials";



function Home() {
  return (
    <main>
      <Hero />
      <About />
      <FeaturedProducts />
      <WhyChoose />
      <Testimonials />
    </main>
  );
}


export default Home;
