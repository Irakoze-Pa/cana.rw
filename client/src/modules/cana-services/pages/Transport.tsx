import { ArrowRight, Check, Clock3, MapPin, Package, ShieldCheck, Truck } from "lucide-react";
import { Link } from "react-router-dom";

const whatsappNumber = "250789408367";
const transportLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Hello CANA Services, I would like to request transport for my project.")}`;

const services = [
  { title: "Construction materials", description: "Move building materials from suppliers to your project site.", icon: Package },
  { title: "Scaffolding & equipment", description: "Coordinate practical transport for scaffolding, tools and site equipment.", icon: Truck },
  { title: "Paint delivery", description: "Deliver CANA Paints and related products to homes, businesses and sites.", icon: Package },
  { title: "Commercial delivery", description: "Flexible transport support for business supplies and project loads.", icon: Clock3 },
];

const steps = [
  ["01", "Request", "Share the pickup, destination and load details."],
  ["02", "Plan", "We review the route and delivery requirements."],
  ["03", "Collect", "Pickup is coordinated from the agreed location."],
  ["04", "Deliver", "Your load is delivered to the required site."],
];

export default function Transport() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-9 sm:px-8 sm:py-12 lg:grid-cols-[1fr_.8fr] lg:items-end lg:px-8">
          <div>
            <p className="cana-section-kicker">CANA Services</p>
            <h1 className="mt-1 max-w-2xl text-4xl font-extrabold tracking-[-.055em] sm:text-5xl">Transport that keeps projects moving.</h1>
          </div>
          <div><p className="max-w-xl text-sm leading-6 text-slate-600 sm:text-base">Reliable delivery for paint, construction materials, scaffolding, equipment and commercial requirements across Rwanda.</p><div className="mt-6 flex flex-wrap gap-2"><a href={transportLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-red-700">Request transport <ArrowRight size={16} /></a><Link to="/contact" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-800 transition hover:border-slate-950">Contact CANA</Link></div></div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-8">
        <div><p className="cana-section-kicker">What we move</p><h2 className="mt-1 text-3xl font-extrabold tracking-[-.04em]">Transport built around the load.</h2></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{services.map(({ title, description, icon: Icon }) => <article key={title} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800"><Icon size={18} /></span><h3 className="mt-5 font-extrabold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{description}</p></article>)}</div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50"><div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[.8fr_1.2fr] lg:px-8"><div><p className="cana-section-kicker">From pickup to site</p><h2 className="mt-1 text-3xl font-extrabold tracking-[-.04em]">Simple delivery coordination.</h2><p className="mt-4 max-w-md text-sm leading-6 text-slate-600">Give us the collection point, destination, load type and preferred time. We will coordinate the practical next step.</p><div className="mt-6 flex items-center gap-2 text-sm font-bold text-slate-700"><MapPin size={16} className="text-red-700" />Kigali and project locations across Rwanda</div></div><div className="grid gap-3 sm:grid-cols-2">{steps.map(([number, title, description]) => <article key={number} className="rounded-xl border border-slate-200 bg-white p-4"><span className="text-xs font-extrabold tracking-[.16em] text-red-700">{number}</span><h3 className="mt-3 font-extrabold text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{description}</p></article>)}</div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-8"><div className="rounded-2xl bg-slate-950 p-5 text-white sm:p-7"><div className="grid gap-5 lg:grid-cols-[1fr_.9fr]"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-red-400">CANA project support</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Products, equipment and delivery in one workflow.</h2></div><div className="grid gap-2 sm:grid-cols-3">{[["CANA Paints", "Product supply"], ["Scaffolding", "Sale and hire"], ["Transport", "Delivery to site"]].map(([title, detail]) => <div key={title} className="rounded-xl border border-white/10 bg-white/[.04] p-4"><p className="font-extrabold">{title}</p><p className="mt-1 text-sm text-white/55">{detail}</p></div>)}</div></div></div></section>

      <section className="bg-slate-950 py-9 text-white sm:py-12"><div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-8"><div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-red-400">Start your delivery</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Send your transport requirement.</h2></div><a href={transportLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-600"><Truck size={16} /> Talk to CANA</a></div></section>
    </main>
  );
}
