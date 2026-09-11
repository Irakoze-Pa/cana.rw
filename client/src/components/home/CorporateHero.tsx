import { ArrowRight, ArrowUpRight, Calculator, CheckCircle2, Paintbrush, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import heroImage from "@/assets/images/hero.png";
import projectOne from "@/assets/images/canaproject1.jpeg";
import projectTwo from "@/assets/images/canaproject2.jpeg";

const pathways = [
  { icon: Paintbrush, title: "CANA Paints", text: "Choose finishes made for your surface.", to: "/cana-paints/products" },
  { icon: Calculator, title: "Project estimator", text: "Plan quantities and your indicative cost.", to: "/cana-paints/estimate-cost" },
  { icon: ShieldCheck, title: "CANA Services", text: "Access site support from one team.", to: "/cana-services" },
];

export default function CorporateHero() {
  return <section className="relative isolate overflow-hidden bg-white text-slate-950">
    <div className="absolute inset-x-0 top-0 h-px bg-red-700" />
    <div className="absolute -right-44 -top-44 h-[36rem] w-[36rem] rounded-full bg-red-50 blur-3xl" />
    <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-8 lg:py-12">
      <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,.08)] lg:grid-cols-[1.05fr_.95fr]">
        <div className="flex min-h-[30rem] flex-col justify-between p-6 sm:p-9 lg:min-h-[38rem] lg:p-12">
          <div>
            <div className="flex items-center gap-3 border-b border-slate-200 pb-5">
              <span className="h-px w-8 bg-red-700" />
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-500">CANAN Business Group Ltd · Kigali, Rwanda</p>
            </div>
            <div className="mt-12 sm:mt-16">
              <p className="cana-section-kicker text-red-700">Paints · services · project support</p>
              <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-slate-950 sm:text-5xl lg:text-6xl">Built for the work that matters.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">Quality coatings and practical site services, delivered with clear advice and professional care from first selection to final result.</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/cana-paints/products" className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800">Explore CANA Paints <ArrowRight size={17} /></Link><Link to="/cana-paints/request-quote" className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3.5 text-sm font-bold text-slate-900 transition hover:border-slate-950 hover:bg-slate-50">Request a quotation</Link></div>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-200 pt-5 text-xs font-medium text-slate-600"><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-red-700" /> Trusted products</span><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-red-700" /> Clear quotations</span><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-red-700" /> Practical support</span></div>
        </div>
        <div className="relative min-h-[24rem] overflow-hidden border-t border-slate-200 bg-slate-950 lg:min-h-0 lg:border-l lg:border-t-0">
          <img src={heroImage} alt="Professional CANA project finish" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/5 to-black/15" />
          <div className="absolute left-5 right-5 top-5 flex items-center justify-between sm:left-7 sm:right-7 sm:top-7"><span className="rounded-full border border-white/30 bg-black/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white backdrop-blur">Kigali, Rwanda</span><Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/30 bg-white text-slate-950 shadow-sm transition hover:bg-red-700 hover:text-white" aria-label="View our projects"><ArrowUpRight size={17} /></Link></div>
          <div className="cana-hero-float absolute right-6 top-20 hidden w-32 overflow-hidden rounded-lg border border-white/35 bg-white p-1 shadow-xl sm:block lg:right-8 lg:top-24 lg:w-40"><img src={projectOne} alt="CANA project gallery" className="h-24 w-full rounded-[.3rem] object-cover lg:h-28" /><p className="px-2 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-slate-700">Project gallery</p></div>
          <div className="cana-hero-float-delayed absolute left-6 top-44 hidden w-28 overflow-hidden rounded-lg border border-white/35 bg-white p-1 shadow-xl sm:block lg:left-8 lg:top-56 lg:w-36"><img src={projectTwo} alt="CANA portfolio image" className="h-20 w-full rounded-[.3rem] object-cover lg:h-24" /><p className="px-2 py-2 text-[10px] font-bold uppercase tracking-[.12em] text-slate-700">CANA portfolio</p></div>
          <div className="absolute inset-x-5 bottom-5 border-l-2 border-red-600 bg-black/75 p-4 text-white backdrop-blur-sm sm:inset-x-7 sm:bottom-7 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.17em] text-white/70">One clear process</p><p className="mt-2 text-base font-semibold leading-6 text-white">Select the right solution. Get a clear quote. Deliver the work with confidence.</p></div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{pathways.map(({ icon: Icon, title, text, to }) => <Link key={title} to={to} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-400 hover:shadow-md"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white transition group-hover:bg-red-700"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-slate-950">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{text}</span></span><ArrowUpRight size={16} className="shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-red-700" /></Link>)}</div>
    </div>
  </section>;
}
