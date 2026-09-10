import {
  ArrowRight,
  Award,
  Building2,
  Check,
  Eye,
  Factory,
  Lightbulb,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

const values = [
  {
    icon: ShieldCheck,
    title: "Integrity",
    description:
      "We build relationships through honesty, accountability, and transparency.",
  },
  {
    icon: Award,
    title: "Excellence",
    description:
      "We maintain high standards across our products, services, and operations.",
  },
  {
    icon: Lightbulb,
    title: "Innovation",
    description:
      "We continuously improve our solutions to create greater value.",
  },
  {
    icon: Users,
    title: "Customer Focus",
    description:
      "We listen, understand, and deliver solutions around our customers' needs.",
  },
];

const strengths = [
  "Quality-driven products and services",
  "Professional and reliable execution",
  "Customer-focused approach",
  "Long-term business relationships",
];

export default function About() {
  return (
    <main className="bg-white text-slate-950">
      {/* HERO */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <div className="max-w-4xl">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-10 bg-slate-900" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                CANA GROUP
              </span>
            </div>

            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Building businesses.
              <span className="block text-slate-400">
                Creating lasting value.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-8 text-slate-600 sm:text-lg">
              CANA brings together quality products, professional
              services, technology, and business solutions designed to create
              meaningful value for our customers and partners.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-5">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Work With Us
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/projects"
                className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-slate-950"
              >
                Explore Our Work
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* INTRODUCTION */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Who We Are
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              One group.
              <br />
              Multiple capabilities.
            </h2>
          </div>

          <div className="max-w-2xl">
            <p className="text-lg leading-8 text-slate-700">
              CANA is a growing Rwandan business group focused on
              delivering dependable products and professional solutions for
              individuals, businesses, and organizations.
            </p>

            <p className="mt-6 leading-8 text-slate-500">
              Our businesses combine manufacturing, technology, creativity,
              and professional services under one shared commitment to
              quality, reliability, and continuous improvement.
            </p>
          </div>
        </div>
      </section>

      {/* BUSINESS DIVISIONS */}
      <section className="border-y border-slate-200 bg-slate-50/60 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Our Business
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Two divisions.
              <br />
              One shared standard.
            </h2>
          </div>

          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-2">
            {/* PAINTS */}
            <div className="bg-white p-8 sm:p-10 lg:p-12">
              <Factory
                size={26}
                strokeWidth={1.7}
                className="text-slate-950"
              />

              <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Division 01
              </p>

              <h3 className="mt-3 text-2xl font-semibold">
                CANA Paints
              </h3>

              <p className="mt-5 max-w-lg leading-7 text-slate-600">
                Quality paint products, color solutions, and finishing
                services developed for residential, commercial, and
                professional applications.
              </p>

              <Link
                to="/cana-paints/painting-services"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-red-600"
              >
                Discover CANA Paints
                <ArrowRight size={16} />
              </Link>
            </div>

            {/* SERVICES */}
            <div className="bg-white p-8 sm:p-10 lg:p-12">
              <Building2
                size={26}
                strokeWidth={1.7}
                className="text-slate-950"
              />

              <p className="mt-10 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                Division 02
              </p>

              <h3 className="mt-3 text-2xl font-semibold">
                CANA Services
              </h3>

              <p className="mt-5 max-w-lg leading-7 text-slate-600">
                Digital, technology, branding, business support, transport,
                and other professional services helping organizations operate
                and grow.
              </p>

              <Link
                to="/cana-services/scaffolds"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 hover:text-red-600"
              >
                Discover CANA Services
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* MISSION / VISION */}
      <section className="border-y border-slate-200 bg-slate-50/70 py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="cana-section-kicker">Direction</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">The standard that guides every CANA decision.</h2>
          </div>
          <div className="mt-10 grid overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm lg:grid-cols-2">
            <article className="relative bg-slate-950 p-7 text-white sm:p-10 lg:p-12">
              <span className="absolute right-7 top-6 text-6xl font-semibold leading-none text-white/10 sm:right-10 sm:top-8">01</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/15 bg-white/10"><Target size={22} strokeWidth={1.8} /></div>
              <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-slate-300">Our Mission</p>
              <h3 className="mt-4 max-w-md text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Deliver practical value through quality and service.</h3>
              <p className="mt-5 max-w-lg leading-8 text-slate-300">We provide dependable products and professional services that solve real customer needs and create sustainable value.</p>
              <div className="mt-10 border-t border-white/15 pt-5 text-sm font-semibold text-white/80">Quality in every deliverable.</div>
            </article>
            <article className="relative bg-white p-7 sm:p-10 lg:p-12">
              <span className="absolute right-7 top-6 text-6xl font-semibold leading-none text-slate-100 sm:right-10 sm:top-8">02</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-800"><Eye size={22} strokeWidth={1.8} /></div>
              <p className="mt-10 text-xs font-bold uppercase tracking-[0.2em] text-slate-500">Our Vision</p>
              <h3 className="mt-4 max-w-md text-2xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-3xl">Build a trusted and diversified African business group.</h3>
              <p className="mt-5 max-w-lg leading-8 text-slate-600">We aspire to be recognized for quality, innovation, professionalism and lasting impact across the communities we serve.</p>
              <div className="mt-10 border-t border-slate-200 pt-5 text-sm font-semibold text-slate-700">Growing with purpose and accountability.</div>
            </article>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="border-y border-slate-200 py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                Our Values
              </p>

              <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
                What guides us.
              </h2>
            </div>

            <p className="max-w-md text-sm leading-7 text-slate-500">
              Our principles shape how we work, how we serve customers, and
              how we build long-term relationships.
            </p>
          </div>

          <div className="mt-10 grid gap-0 border-t border-slate-200 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => {
              const Icon = value.icon;

              return (
                <div
                  key={value.title}
                  className={`border-b border-slate-200 py-8 lg:border-b-0 lg:border-r lg:px-8 ${
                    index === 0 ? "lg:pl-0" : ""
                  } ${index === values.length - 1 ? "lg:border-r-0 lg:pr-0" : ""}`}
                >
                  <Icon
                    size={22}
                    strokeWidth={1.7}
                    className="text-slate-950"
                  />

                  <h3 className="mt-6 font-semibold">
                    {value.title}
                  </h3>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* WHY CANA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Why CANA
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built for long-term value.
            </h2>

            <p className="mt-5 max-w-xl leading-8 text-slate-500">
              We believe strong businesses are built through consistency,
              trust, quality, and the ability to adapt.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {strengths.map((strength) => (
              <div
                key={strength}
                className="flex items-center gap-4 py-5"
              >
                <Check size={18} className="text-red-600" />
                <span className="text-sm font-medium text-slate-700">
                  {strength}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="bg-slate-950 py-20 text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-y-12 px-6 sm:grid-cols-4 lg:px-8">
          <div>
            <p className="text-4xl font-semibold tracking-tight">2+</p>
            <p className="mt-2 text-sm text-slate-400">
              Business Divisions
            </p>
          </div>

          <div>
            <p className="text-4xl font-semibold tracking-tight">100+</p>
            <p className="mt-2 text-sm text-slate-400">
              Customers & Projects
            </p>
          </div>

          <div>
            <p className="text-4xl font-semibold tracking-tight">1</p>
            <p className="mt-2 text-sm text-slate-400">
              Shared Vision
            </p>
          </div>

          <div>
            <p className="text-4xl font-semibold tracking-tight">
              Rwanda
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Home Market
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-20">
        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
            Start a Conversation
          </p>

          <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">
            Let&apos;s create something valuable.
          </h2>

          <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-500">
            Tell us what you need and let&apos;s explore how CANA can
            help.
          </p>

          <Link
            to="/contact"
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Contact CANA GROUP
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
