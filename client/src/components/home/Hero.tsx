import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "react-router-dom";

import hero from "@/assets/images/hero.png";
import hero1 from "@/assets/images/hero1.jpg";
import hero2 from "@/assets/images/hero2.jpg";
import hero3 from "@/assets/images/hero3.jpg";
import hero4 from "@/assets/images/hero4.jpg";
import heroscaf1 from "@/assets/images/heroscaf1.jpg";
import heroscaf2 from "@/assets/images/heroscaf2.jpg";

type HeroSlide = {
  image: string;
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  cta?: string;
  ctaLink?: string;
  number: string;
};

const slides: HeroSlide[] = [
  {
    image: hero4,
    eyebrow: "CANA SERVICES",
    title: "Professional",
    highlight: "Expertise.",
    description:
      "Professional painting solutions delivered with precision, experience and attention to detail.",
    cta: "Explore Services",
    ctaLink: "/cana-services/scaffolds",
    number: "05",
  },
  {
    image: hero,
    eyebrow: "CANA PAINTS",
    title: "Quality That",
    highlight: "Shows.",
    description:
      "Premium paint solutions designed to transform spaces with lasting beauty and performance.",
    cta: "Explore Products",
    ctaLink: "/cana-paints/products",
    number: "01",
  },
  {
    image: hero1,
    eyebrow: "CANA PAINTS",
    title: "Transform",
    highlight: "Your Space.",
    description:
      "Bring character, color and confidence to every surface with CANA Paints.",
    cta: "Discover CANA Paints",
    ctaLink: "/cana-paints/products",
    number: "02",
  },
  {
    image: hero2,
    eyebrow: "CANA PAINTS",
    title: "Beautiful Finishes.",
    highlight: "Built to Last.",
    description:
      "Reliable finishes created for homes, businesses and modern architectural spaces.",
    cta: "View Our Products",
    ctaLink: "/cana-paints/products",
    number: "03",
  },
  {
    image: hero3,
    eyebrow: "CANA GROUP",
    title: "Building",
    highlight: "Better.",
    description:
      "A growing group delivering quality products, professional services and practical solutions.",
    cta: "Discover CANA",
    ctaLink: "/",
    number: "04",
  },
  
  {
    image: heroscaf1,
    eyebrow: "CANA SERVICES",
    title: "Work Higher.",
    highlight: "Work Smarter.",
    description:
      "Reliable scaffold solutions designed to support safer and more efficient construction projects.",
    cta: "Scaffold Solutions",
    ctaLink: "/cana-services/scaffolds",
    number: "06",
  },
  {
    image: heroscaf2,
    eyebrow: "CANA SERVICES",
    title: "Solutions",
    highlight: "That Move Projects.",
    description:
      "Practical solutions and professional support built around the needs of your project.",
    cta: "Talk to CANA",
    ctaLink: "/contact",
    number: "07",
  },
];

const SLIDE_DURATION = 6500;

export default function Hero() {
  const [activeSlide, setActiveSlide] = useState(0);
  const [progress, setProgress] = useState(0);

  const currentSlide = slides[activeSlide];

  const nextSlide = () => {
    setActiveSlide((current) => (current + 1) % slides.length);
    setProgress(0);
  };

  const previousSlide = () => {
    setActiveSlide(
      (current) => (current - 1 + slides.length) % slides.length,
    );
    setProgress(0);
  };

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    setProgress(0);
  };

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
      setProgress(0);
    }, SLIDE_DURATION);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const startTime = Date.now();

    const progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const percentage = Math.min(
        (elapsed / SLIDE_DURATION) * 100,
        100,
      );

      setProgress(percentage);
    }, 50);

    return () => window.clearInterval(progressInterval);
  }, [activeSlide]);

  const whatsappNumber = "250795572029";

  const whatsappMessage =
    currentSlide.eyebrow === "CANA PAINTS"
      ? "Hello CANA, I would like to know more about your paint products."
      : "Hello CANA, I would like to know more about your services.";

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    whatsappMessage,
  )}`;

  return (
    <section className="relative min-h-[calc(100vh-80px)] w-full overflow-hidden bg-black">
      {/* =====================================================
          BACKGROUND SLIDES
      ====================================================== */}
      <div className="absolute inset-0">
        {slides.map((slide, index) => {
          const isActive = index === activeSlide;

          return (
            <div
              key={slide.image}
              className={`absolute inset-0 transition-opacity duration-[1400ms] ease-in-out ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
            >
              <img
                src={slide.image}
                alt={`${slide.eyebrow} - ${slide.title} ${slide.highlight}`}
                className={`h-full w-full object-cover transition-transform duration-[7500ms] ease-out ${
                  isActive ? "scale-100" : "scale-110"
                }`}
              />
            </div>
          );
        })}

        {/* Main cinematic overlay */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Left dark gradient for typography */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/10" />

        {/* Bottom gradient */}
        <div className="absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Subtle red atmospheric glow */}
        <div className="absolute left-[-10%] top-[20%] h-[400px] w-[400px] rounded-full bg-red-600/10 blur-[120px]" />
      </div>

      {/* =====================================================
          MAIN CONTENT
      ====================================================== */}
      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-[1600px] items-center px-6 py-20 sm:px-10 lg:px-16 xl:px-20">
        <div className="w-full max-w-4xl">
          {/* Eyebrow */}
          <div className="mb-7 flex items-center gap-4">
            <span className="h-px w-10 bg-red-500 sm:w-14" />

            <span className="text-[11px] font-semibold tracking-[0.28em] text-white/80 sm:text-xs">
              {currentSlide.eyebrow}
            </span>
          </div>

          {/* Heading */}
          <h1 className="max-w-5xl text-[clamp(3.4rem,8vw,7.8rem)] font-semibold leading-[0.88] tracking-[-0.055em] text-white">
            {currentSlide.title}
            <br />

            <span className="text-white">
              {currentSlide.highlight}
            </span>
          </h1>

          {/* Description */}
          <p className="mt-8 max-w-xl text-sm leading-7 text-white/70 sm:text-base sm:leading-8">
            {currentSlide.description}
          </p>

          {/* CTA */}
          {currentSlide.cta && currentSlide.ctaLink && (
            <div className="mt-9">
              <Link
                to={currentSlide.ctaLink}
                className="group inline-flex items-center gap-4 border border-white/30 bg-white px-6 py-3.5 text-sm font-semibold text-black transition-all duration-300 hover:border-white hover:bg-red-600 hover:text-white"
              >
                <span>{currentSlide.cta}</span>

                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-white transition-all duration-300 group-hover:bg-white group-hover:text-red-600">
                  <ArrowUpRight size={15} strokeWidth={2.2} />
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================
          DESKTOP SIDE NAVIGATION
      ====================================================== */}
      <div className="absolute bottom-24 right-8 z-20 hidden lg:block xl:right-12">
        <div className="flex flex-col items-end gap-3">
          {slides.map((slide, index) => {
            const isActive = index === activeSlide;

            return (
              <button
                key={slide.number}
                type="button"
                onClick={() => goToSlide(index)}
                className="group flex items-center gap-3"
                aria-label={`Go to slide ${slide.number}`}
              >
                <span
                  className={`text-[10px] tracking-[0.2em] transition-all duration-300 ${
                    isActive
                      ? "text-white"
                      : "text-white/30 group-hover:text-white/70"
                  }`}
                >
                  {slide.number}
                </span>

                <span
                  className={`h-px transition-all duration-500 ${
                    isActive
                      ? "w-14 bg-red-500"
                      : "w-5 bg-white/30 group-hover:w-9 group-hover:bg-white/60"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* =====================================================
          BOTTOM INFORMATION BAR
      ====================================================== */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <div className="mx-auto max-w-[1600px] px-6 pb-6 sm:px-10 lg:px-16 xl:px-20">
          <div className="flex items-end justify-between gap-8">
            {/* Brand positioning */}
            <div className="hidden md:block">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-white/40">
                Driven by excellence
              </p>
            </div>

            {/* Navigation */}
            <div className="ml-auto flex items-center gap-3">
              <button
                type="button"
                onClick={previousSlide}
                aria-label="Previous slide"
                className="flex h-11 w-11 items-center justify-center border border-white/20 bg-black/10 text-white backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:bg-white hover:text-black"
              >
                <ChevronLeft size={18} />
              </button>

              <button
                type="button"
                onClick={nextSlide}
                aria-label="Next slide"
                className="flex h-11 w-11 items-center justify-center border border-white/20 bg-black/10 text-white backdrop-blur-sm transition-all duration-300 hover:border-white/60 hover:bg-white hover:text-black"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="mt-5 h-px w-full overflow-hidden bg-white/15">
            <div
              className="h-full bg-red-500 transition-[width] duration-75 ease-linear"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* =====================================================
          SLIDE COUNTER
      ====================================================== */}
      <div className="absolute right-6 top-8 z-20 sm:right-10 lg:right-16 xl:right-20">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium tracking-[0.2em] text-white">
            {currentSlide.number}
          </span>

          <span className="h-px w-8 bg-white/30" />

          <span className="text-xs tracking-[0.2em] text-white/40">
            {String(slides.length).padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* =====================================================
          MOBILE SLIDE DOTS
      ====================================================== */}
      <div className="absolute bottom-[78px] left-6 z-20 flex items-center gap-2 sm:left-10 lg:hidden">
        {slides.map((slide, index) => (
          <button
            key={slide.number}
            type="button"
            onClick={() => goToSlide(index)}
            aria-label={`Go to slide ${slide.number}`}
            className={`h-1 transition-all duration-500 ${
              index === activeSlide
                ? "w-8 bg-red-500"
                : "w-2 bg-white/40"
            }`}
          />
        ))}
      </div>

      {/* =====================================================
          FLOATING WHATSAPP
      ====================================================== */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with CANA on WhatsApp"
        className="group fixed bottom-6 right-5 z-[9999] sm:bottom-7 sm:right-7"
      >
        {/* Pulse */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping" />

        {/* Button */}
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-2xl shadow-black/30 transition-all duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
          <svg
            viewBox="0 0 32 32"
            className="h-7 w-7 fill-white sm:h-8 sm:w-8"
            aria-hidden="true"
          >
            <path d="M16 3.2C9.05 3.2 3.4 8.84 3.4 15.8c0 2.22.58 4.3 1.6 6.1L3.2 28.8l7.05-1.85a12.5 12.5 0 0 0 5.75 1.4h.01c6.95 0 12.6-5.64 12.6-12.6C28.61 8.84 22.96 3.2 16 3.2Zm0 22.95c-1.8 0-3.57-.48-5.12-1.4l-.37-.22-4.18 1.1 1.12-4.08-.24-.39a10.5 10.5 0 0 1-1.61-5.58c0-5.8 4.72-10.52 10.53-10.52 2.81 0 5.45 1.1 7.43 3.08a10.45 10.45 0 0 1 3.08 7.44c-.01 5.8-4.73 10.52-10.64 10.57Zm5.76-7.87c-.32-.16-1.9-.94-2.2-1.04-.3-.11-.52-.16-.74.16-.22.32-.85 1.04-1.04 1.25-.19.22-.38.24-.7.08-.32-.16-1.35-.5-2.57-1.6-.95-.84-1.6-1.88-1.79-2.2-.19-.32-.02-.5.14-.66.14-.14.32-.38.48-.57.16-.19.21-.32.32-.54.11-.22.05-.4-.03-.56-.08-.16-.74-1.79-1.02-2.45-.27-.64-.55-.55-.74-.56h-.63c-.22 0-.57.08-.87.4-.3.32-1.14 1.12-1.14 2.74s1.17 3.18 1.33 3.4c.16.22 2.3 3.51 5.57 4.92.78.34 1.39.54 1.86.69.78.25 1.5.21 2.06.13.63-.09 1.9-.78 2.17-1.53.27-.76.27-1.41.19-1.55-.08-.13-.29-.21-.61-.37Z" />
          </svg>
        </span>

        {/* Desktop tooltip */}
        <span className="pointer-events-none absolute right-[calc(100%+12px)] top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded-lg bg-black px-3 py-2 text-xs font-medium text-white opacity-0 shadow-lg transition-all duration-300 group-hover:opacity-100 sm:block">
          Chat with us
        </span>
      </a>
    </section>
  );
}
