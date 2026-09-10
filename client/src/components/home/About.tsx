import {
  ArrowUpRight,
  Building2,
  Eye,
  Target,
} from "lucide-react";
import { Link } from "react-router-dom";

function About() {
  return (
    <section id="about" className="relative overflow-hidden bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* =========================
            TOP CONTENT
        ========================== */}
        <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">

          {/* Heading */}
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-neutral-900" />

              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
                About CANA Group
              </span>
            </div>

            <h2 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-black sm:text-5xl lg:text-6xl">
              Building better spaces
              <br />

              <span className="text-gray-400">
                through quality & expertise.
              </span>
            </h2>
          </div>

          {/* Intro */}
          <div className="lg:pb-1">
            <p className="max-w-xl text-base leading-8 text-gray-600">
              CANA is a Rwandan company delivering quality products
              and professional solutions across paints, construction support
              and related services.
            </p>
          </div>
        </div>

        {/* =========================
            MAIN CONTENT
        ========================== */}
        <div className="mt-12 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">

          {/* =========================
              LEFT
          ========================== */}
          <div className="relative">

            {/* Main Statement */}
            <div className="border-l-2 border-neutral-900 pl-7">
              <p className="text-lg font-medium leading-8 text-black sm:text-xl">
                We combine quality manufacturing, skilled teams and
                customer-focused service to help our clients build,
                transform and maintain better spaces.
              </p>
            </div>

            {/* CTA */}
            <Link
              to="/about"
              className="group mt-10 inline-flex items-center gap-3"
            >
              <span className="border-b border-black pb-1 text-sm font-semibold text-black transition-colors duration-300 group-hover:border-neutral-500 group-hover:text-neutral-600">
                Discover CANA Group
              </span>

              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-300 text-black transition-all duration-300 group-hover:border-neutral-900 group-hover:bg-neutral-900 group-hover:text-white">
                <ArrowUpRight
                  size={16}
                  strokeWidth={2}
                />
              </span>
            </Link>

            {/* Company Identity */}
            <div className="mt-10 flex items-center gap-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white">
                <Building2 size={18} />
              </div>

              <div>
                <p className="text-sm font-semibold text-black">
                  CANA
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  Paints • Services
                </p>
              </div>
            </div>
          </div>

          {/* =========================
              RIGHT
          ========================== */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm">

            <InfoBlock
              number="01"
              icon={<Target size={19} />}
              title="Our Mission"
              text="To deliver innovative products and dependable services that create lasting value for customers, businesses and communities."
            />

            <InfoBlock
              number="02"
              icon={<Eye size={19} />}
              title="Our Vision"
              text="To become one of East Africa's trusted brands in manufacturing and construction support services."
            />

          </div>
        </div>

        {/* =========================
            BOTTOM STATEMENT
        ========================== */}
        <div className="mt-12 border-t border-gray-200 pt-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

            <p className="text-xs font-medium uppercase tracking-[0.25em] text-gray-400">
              Driven by excellence
            </p>

            <p className="text-sm text-gray-500">
              Quality <span className="mx-2 text-gray-300">•</span>
              Innovation <span className="mx-2 text-gray-300">•</span>
              Professionalism
            </p>

          </div>
        </div>

      </div>
    </section>
  );
}

type InfoBlockProps = {
  number: string;
  icon: React.ReactNode;
  title: string;
  text: string;
};

function InfoBlock({
  number,
  icon,
  title,
  text,
}: InfoBlockProps) {
  return (
    <div className={`group flex gap-5 p-6 sm:gap-7 sm:p-8 ${number === "01" ? "bg-slate-950 text-white" : "bg-white text-slate-950"}`}>

      {/* Number */}
      <div className="pt-1">
        <span className={`text-xs font-semibold tracking-[0.2em] ${number === "01" ? "text-slate-400" : "text-slate-400"}`}>
          {number}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1">

        {/* Title */}
        <div className="flex items-center gap-3">

          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${number === "01" ? "bg-white/10 text-white group-hover:bg-white group-hover:text-slate-950" : "bg-slate-100 text-slate-800 group-hover:bg-slate-950 group-hover:text-white"}`}>
            {icon}
          </div>

          <h3 className={`text-xl font-semibold tracking-tight ${number === "01" ? "text-white" : "text-slate-950"}`}>
            {title}
          </h3>

        </div>

        {/* Description */}
        <p className={`mt-4 max-w-2xl text-sm leading-7 sm:text-base ${number === "01" ? "text-slate-300" : "text-slate-600"}`}>
          {text}
        </p>

      </div>
    </div>
  );
}

export default About;
