import { useEffect, useState } from "react";
import { ArrowUpRight, ChevronLeft, ChevronRight, MessageCircle, MoveDownRight } from "lucide-react";
import { Link } from "react-router-dom";
import paintHero from "@/assets/images/hero.png";
import serviceHero from "@/assets/images/hero4.jpg";
import scaffoldHero from "@/assets/images/heroscaf1.jpg";

type Slide = { image: string; category: string; title: string; accent: string; description: string; primaryLabel: string; primaryTo: string; index: string };

const slides: Slide[] = [
  { image: paintHero, category: "CANA Paints", title: "Colour with", accent: "confidence.", description: "Quality paint solutions for homes, workplaces and projects that deserve a finish made to last.", primaryLabel: "Explore paints", primaryTo: "/cana-paints/products", index: "01" },
  { image: serviceHero, category: "CANA Services", title: "Skilled work.", accent: "Beautiful results.", description: "Professional painting and finishing support, carefully planned around your space and your schedule.", primaryLabel: "Explore services", primaryTo: "/cana-paints/painting-services", index: "02" },
  { image: scaffoldHero, category: "CANA Services", title: "Built for", accent: "the work ahead.", description: "Practical scaffold and project-support solutions that help teams work safely, efficiently and with confidence.", primaryLabel: "View scaffold solutions", primaryTo: "/cana-services/scaffolds", index: "03" },
];

const SLIDE_DURATION = 7000;

export default function Hero() {
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const slide = slides[active];
  const next = () => setActive((current) => (current + 1) % slides.length);
  const previous = () => setActive((current) => (current - 1 + slides.length) % slides.length);

  useEffect(() => {
    const timer = window.setInterval(next, SLIDE_DURATION);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    setProgress(0);
    const started = Date.now();
    const timer = window.setInterval(() => setProgress(Math.min(((Date.now() - started) / SLIDE_DURATION) * 100, 100)), 50);
    return () => window.clearInterval(timer);
  }, [active]);

  return <section className="relative isolate min-h-[760px] overflow-hidden bg-gray-950 text-white lg:min-h-[calc(100vh-80px)]">
    <div className="absolute inset-0">{slides.map((item, index) => <img key={item.index} src={item.image} alt="" aria-hidden="true" className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-[1400ms] ease-out ${index === active ? "scale-100 opacity-100" : "scale-105 opacity-0"}`} />)}<div className="absolute inset-0 bg-gradient-to-r from-gray-950 via-gray-950/72 to-gray-950/10" /><div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-transparent to-gray-950/20" /><div className="absolute -left-32 top-20 h-96 w-96 rounded-full bg-red-600/20 blur-[130px]" /></div>

    <div className="relative mx-auto flex min-h-[760px] max-w-7xl flex-col px-6 pb-8 pt-12 sm:px-10 lg:min-h-[calc(100vh-80px)] lg:px-8 lg:pb-10 lg:pt-16">
      <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="h-px w-8 bg-red-500" /><p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/75">CANA Group · Rwanda</p></div><div className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-md sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />Quality in every detail</div></div>

      <div className="flex flex-1 items-center py-16 lg:py-20"><div className="max-w-4xl"><p className="text-xs font-bold uppercase tracking-[0.28em] text-red-400">{slide.category}</p><h1 className="mt-6 text-[clamp(3.5rem,8vw,7.4rem)] font-semibold leading-[0.88] tracking-[-0.065em]">{slide.title}<br /><span className="text-white/55">{slide.accent}</span></h1><p className="mt-8 max-w-xl text-base leading-8 text-white/75 sm:text-lg">{slide.description}</p><div className="mt-10 flex flex-wrap gap-3"><Link to={slide.primaryTo} className="group inline-flex items-center gap-4 rounded-full bg-white px-5 py-3 text-sm font-bold text-gray-950 transition hover:bg-red-600 hover:text-white">{slide.primaryLabel}<span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-950 text-white transition group-hover:bg-white group-hover:text-red-600"><ArrowUpRight size={15} /></span></Link><Link to="/contact" className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/15"><MessageCircle size={16} />Talk to CANA</Link></div></div></div>

      <div className="grid gap-5 border-t border-white/15 pt-5 lg:grid-cols-[1fr_auto_1fr] lg:items-end"><div className="hidden lg:block"><p className="text-xs uppercase tracking-[0.2em] text-white/45">CANA Paints · Services · Solutions</p><p className="mt-2 max-w-xs text-sm leading-6 text-white/70">Thoughtful products and practical support for places made to perform.</p></div><div className="order-2 flex items-center gap-2 lg:order-none">{slides.map((item, index) => <button key={item.index} type="button" onClick={() => setActive(index)} aria-label={`Show ${item.category} slide ${index + 1}`} className="group flex items-center gap-2 py-2"><span className={`h-1.5 rounded-full transition-all ${active === index ? "w-9 bg-red-500" : "w-2 bg-white/35 group-hover:bg-white/70"}`} /></button>)}</div><div className="order-1 flex items-center justify-between lg:order-none lg:justify-end lg:gap-8"><div className="text-right"><p className="text-2xl font-semibold tracking-tight">{slide.index}<span className="text-white/35"> / 0{slides.length}</span></p><div className="mt-2 h-px w-24 overflow-hidden bg-white/20"><div className="h-full bg-red-500" style={{ width: `${progress}%` }} /></div></div><div className="flex gap-2"><button type="button" aria-label="Previous feature" onClick={previous} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition hover:bg-white hover:text-gray-950"><ChevronLeft size={18} /></button><button type="button" aria-label="Next feature" onClick={next} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/25 transition hover:bg-white hover:text-gray-950"><ChevronRight size={18} /></button></div></div></div>
    </div>
    <a href="#about" aria-label="Explore CANA" className="absolute bottom-10 right-6 hidden h-11 w-11 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:bg-white hover:text-gray-950 xl:flex"><MoveDownRight size={18} /></a>
  </section>;
}
