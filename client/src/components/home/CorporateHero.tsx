import { ArrowRight, ArrowUpRight, Calculator, CheckCircle2, Paintbrush, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import heroImage from "@/assets/images/hero.png";

const pathways = [
  { icon: Paintbrush, title: "CANA Paints", text: "Choose finishes made for your surface.", to: "/cana-paints/products" },
  { icon: Calculator, title: "Project estimator", text: "Plan quantities and your indicative cost.", to: "/cana-paints/estimate-cost" },
  { icon: ShieldCheck, title: "CANA Services", text: "Access site support from one team.", to: "/cana-services" },
];

export default function CorporateHero() {
  return <section className="relative isolate overflow-hidden bg-slate-950 text-white">
    <div className="absolute inset-0 opacity-50"><div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-slate-700/30 blur-3xl" /><div className="absolute -bottom-56 right-0 h-[34rem] w-[34rem] rounded-full bg-slate-600/20 blur-3xl" /></div>
    <div className="relative mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-8 lg:py-12">
      <div className="grid overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] shadow-2xl shadow-black/20 lg:grid-cols-[1.05fr_.95fr]">
        <div className="flex min-h-[31rem] flex-col justify-between p-6 sm:p-9 lg:min-h-[39rem] lg:p-12">
          <div>
            <div className="flex items-center gap-3 border-b border-white/10 pb-5">
              <span className="h-px w-8 bg-white/70" />
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-300">CANAN Business Group Ltd · Kigali, Rwanda</p>
            </div>
            <div className="mt-12 sm:mt-16">
              <p className="cana-section-kicker text-slate-400">Paints · services · project support</p>
              <h1 className="mt-5 max-w-xl text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-white sm:text-5xl lg:text-6xl">Built for the work that matters.</h1>
              <p className="mt-6 max-w-xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">Quality coatings and practical site services, delivered with clear advice and professional care from first selection to final result.</p>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/cana-paints/products" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200">Explore CANA Paints <ArrowRight size={17} /></Link><Link to="/cana-paints/request-quote" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[.04] px-5 py-3.5 text-sm font-bold text-white transition hover:border-white/40 hover:bg-white/10">Request a quotation</Link></div>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-5 text-xs font-medium text-slate-300"><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-slate-400" /> Trusted products</span><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-slate-400" /> Clear quotations</span><span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-slate-400" /> Practical support</span></div>
        </div>
        <div className="relative min-h-[22rem] overflow-hidden border-t border-white/10 lg:min-h-0 lg:border-l lg:border-t-0"><img src={heroImage} alt="Professional CANA project finish" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/10 to-transparent" /><div className="absolute left-5 right-5 top-5 flex items-center justify-between sm:left-7 sm:right-7 sm:top-7"><span className="rounded-full border border-white/20 bg-slate-950/55 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white backdrop-blur">Kigali, Rwanda</span><Link to="/projects" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-slate-950/55 text-white backdrop-blur transition hover:bg-white hover:text-slate-950" aria-label="View our projects"><ArrowUpRight size={17} /></Link></div><div className="absolute inset-x-5 bottom-5 rounded-xl border border-white/15 bg-slate-950/80 p-4 backdrop-blur-sm sm:inset-x-7 sm:bottom-7 sm:p-5"><p className="text-[10px] font-bold uppercase tracking-[.17em] text-slate-400">One clear process</p><p className="mt-2 text-base font-semibold leading-6 text-white">Select the right solution. Get a clear quote. Deliver the work with confidence.</p></div></div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">{pathways.map(({ icon: Icon, title, text, to }) => <Link key={title} to={to} className="group flex items-center gap-3 rounded-xl border border-white/10 bg-white/[.035] p-4 transition hover:border-white/25 hover:bg-white/[.075]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white"><Icon size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-bold text-white">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-400">{text}</span></span><ArrowUpRight size={16} className="shrink-0 text-slate-400 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white" /></Link>)}</div>
    </div>
  </section>;
}
