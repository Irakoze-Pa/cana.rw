import { ArrowRight, Calculator, Paintbrush, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import heroImage from "@/assets/images/hero1.jpg";

const capabilities = [
  { title: "Paint catalogue", description: "Explore available interior, exterior and specialist coatings.", to: "/cana-paints/products", icon: Paintbrush },
  { title: "Project estimate", description: "Estimate paint quantities and request a quotation for your space.", to: "/cana-paints/estimate-cost", icon: Calculator },
  { title: "Professional application", description: "Plan a complete painting service with the CANA team.", to: "/cana-paints/painting-services", icon: ShieldCheck },
];

function PaintsHome() {
  return (
    <main className="cana-public-surface min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="grid overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-2xl shadow-slate-900/15 lg:grid-cols-[1.08fr_.92fr]">
          <div className="flex min-h-[30rem] flex-col justify-center p-7 sm:p-10 lg:p-14">
            <p className="cana-section-kicker text-slate-300">CANA Paints</p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">Quality coatings for work that lasts.</h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">Products, project support and professional painting services for homes, businesses and construction sites.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link to="/cana-paints/products" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">Browse products <ArrowRight size={17} /></Link>
              <Link to="/cana-paints/request-quote" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-5 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10">Request a quote</Link>
            </div>
          </div>
          <div className="relative min-h-[19rem]">
            <img src={heroImage} alt="CANA Paints products and professional coating work" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-slate-950/20" />
            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/25 bg-slate-950/85 p-4 text-white backdrop-blur sm:bottom-7 sm:left-7 sm:right-auto sm:max-w-xs">
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-300">Built for your project</p>
              <p className="mt-2 text-sm leading-6 text-white/90">Choose the right product, calculate what you need, then request a clear quotation.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-20">
        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="cana-section-kicker">Plan with confidence</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Everything needed to move a paint project forward.</h2></div><Link to="/cana-paints/request-quote" className="text-sm font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 hover:text-slate-950">Start a request</Link></div>
        <div className="grid gap-4 md:grid-cols-3">
          {capabilities.map(({ title, description, to, icon: Icon }) => <Link key={title} to={to} className="cana-panel group p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Icon size={19} /></span><h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">Open <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></Link>)}
        </div>
      </section>
    </main>
  );
}

export default PaintsHome;
