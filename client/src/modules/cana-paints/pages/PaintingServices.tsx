import { ArrowRight, Check, ClipboardCheck, Paintbrush, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

import heroImage from "@/assets/images/hero2.jpg";
import serviceImage from "@/assets/images/hero3.jpg";

const whatsappNumber = "250789408367";
const quoteLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello CANA Paints, I would like a quotation for painting services.")}`;

const services = [
  { title: "Residential painting", description: "Careful interior and exterior finishes for homes, apartments and renovations.", icon: Paintbrush },
  { title: "Commercial spaces", description: "Reliable painting for offices, retail, hospitality and operational facilities.", icon: Sparkles },
  { title: "Exterior protection", description: "Durable coating systems selected for exposure, surface condition and finish.", icon: ShieldCheck },
];

const steps = [
  ["01", "Assess", "Review the space, surfaces, scope and desired finish."],
  ["02", "Prepare", "Repair, clean and prime surfaces for a dependable result."],
  ["03", "Apply", "Use the right CANA coating and professional application method."],
  ["04", "Inspect", "Review the completed work with attention to the final details."],
];

export default function PaintingServices() {
  return (
    <main className="bg-white text-slate-950">
      <section className="relative overflow-hidden bg-slate-950">
        <img src={heroImage} alt="CANA professional painting service" className="absolute inset-0 h-full w-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/25" />
        <div className="relative mx-auto flex min-h-[31rem] max-w-7xl items-end px-5 py-9 sm:px-8 sm:py-12 lg:min-h-[36rem] lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-red-400">CANA Paints</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-[-.055em] sm:text-5xl lg:text-6xl">A finish built to last.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">Professional painting for homes, businesses and project sites—planned well, applied carefully and finished cleanly.</p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <a href={quoteLink} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-red-700 hover:text-white">Request a quotation <ArrowRight size={16} /></a>
              <Link to="/cana-paints/products" className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 px-5 text-sm font-bold text-white transition hover:border-white hover:bg-white/10">View paint products</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-8">
        <div className="max-w-2xl">
          <p className="cana-section-kicker">Painting services</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-[-.04em]">The right coating. The right application.</h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">CANA combines trusted paint products with trained application for work that looks professional from preparation to handover.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {services.map(({ title, description, icon: Icon }) => (
            <article key={title} className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-700"><Icon size={19} /></span>
              <h3 className="mt-5 text-lg font-extrabold tracking-tight">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[.92fr_1fr] lg:px-8">
          <img src={serviceImage} alt="CANA team completing a painting project" className="aspect-[16/10] h-full w-full rounded-2xl object-cover" />
          <div className="flex flex-col justify-center">
            <p className="cana-section-kicker">Our approach</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-.04em]">Good preparation makes the difference.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {steps.map(([number, title, description]) => (
                <div key={number} className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-extrabold tracking-[.14em] text-red-700">{number}</p>
                  <h3 className="mt-2 font-extrabold">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-9 text-white sm:py-12">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 sm:px-8 md:grid-cols-[1fr_auto] md:items-center lg:px-8">
          <div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-700"><ClipboardCheck size={19} /></div>
            <p className="mt-4 text-xs font-extrabold uppercase tracking-[.16em] text-red-400">Plan your project</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Tell us the site, surfaces and preferred timing.</h2>
            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/65">
              {["Project assessment", "CANA paint selection", "Professional application"].map((item) => <li key={item} className="flex items-center gap-2"><Check size={15} className="text-red-400" />{item}</li>)}
            </ul>
          </div>
          <a href={quoteLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-600">Start an enquiry <ArrowRight size={15} /></a>
        </div>
      </section>
    </main>
  );
}
