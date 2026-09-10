import { ArrowRight, HardHat, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";

import heroImage from "@/assets/images/heroscaf1.jpg";

const services = [
  { title: "Scaffolding", description: "Reliable scaffold rental and sales for safe access at every stage of work.", to: "/cana-services/scaffolds", icon: HardHat },
  { title: "Transport & delivery", description: "Coordinated movement of materials, equipment and finished products.", to: "/cana-services/transport", icon: Truck },
  { title: "Project support", description: "A responsive team for practical, site-ready service arrangements.", to: "/contact", icon: ShieldCheck },
];

function ServicesHome() {
  return (
    <main className="cana-public-surface min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
        <div className="grid overflow-hidden rounded-[1.5rem] bg-slate-950 shadow-2xl shadow-slate-900/15 lg:grid-cols-[.92fr_1.08fr]">
          <div className="relative order-last min-h-[20rem] lg:order-first lg:min-h-[32rem]"><img src={heroImage} alt="CANA Services scaffold installation" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-slate-950/25" /></div>
          <div className="flex min-h-[30rem] flex-col justify-center p-7 sm:p-10 lg:p-14"><p className="cana-section-kicker text-slate-300">CANA Services</p><h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-[-0.045em] text-white sm:text-5xl lg:text-6xl">Site services delivered with discipline.</h1><p className="mt-6 max-w-lg text-base leading-7 text-slate-300 sm:text-lg">Scaffold rental, transport and practical project support organised around the way your work is delivered.</p><div className="mt-9 flex flex-col gap-3 sm:flex-row"><Link to="/cana-services/scaffolds" className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-200">Explore scaffolding <ArrowRight size={17} /></Link><Link to="/contact" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/25 px-5 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10">Talk to our team</Link></div></div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-20"><p className="cana-section-kicker">Our services</p><h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Clear service options for active projects.</h2><div className="mt-7 grid gap-4 md:grid-cols-3">{services.map(({ title, description, to, icon: Icon }) => <Link key={title} to={to} className="cana-panel group p-6 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Icon size={19} /></span><h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{description}</p><span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-slate-900">View service <ArrowRight size={15} className="transition group-hover:translate-x-1" /></span></Link>)}</div></section>
    </main>
  );
}

export default ServicesHome;
