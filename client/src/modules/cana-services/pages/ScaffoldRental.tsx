import { ArrowRight, Check, HardHat, Package, Ruler, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import heroImage from "@/assets/images/heroscaf1.jpg";
import scaffoldImage from "@/assets/images/heroscaf2.jpg";

const whatsappNumber = "250789408367";
const whatsappLink = (message: string) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

const options = [
  {
    title: "Buy scaffolding",
    label: "Own your equipment",
    description: "Build long-term access capacity for your business, site teams and repeat projects.",
    points: ["For contractors and frequent projects", "Flexible equipment requirements", "Long-term equipment investment"],
    icon: ShoppingCart,
    href: whatsappLink("Hello CANA Services, I would like information about buying scaffolding."),
    action: "Ask about buying",
    dark: true,
  },
  {
    title: "Hire scaffolding",
    label: "Use it for your project",
    description: "Get practical work-height access for a defined project period without purchasing equipment.",
    points: ["Flexible rental periods", "Suitable for painting and construction", "Practical project access"],
    icon: Package,
    href: whatsappLink("Hello CANA Services, I would like to hire scaffolding for my project."),
    action: "Ask about hiring",
    dark: false,
  },
];

const uses = [
  { title: "Construction", description: "Access for building and exterior work.", icon: HardHat },
  { title: "Painting & finishing", description: "Practical reach for high walls and facades.", icon: Ruler },
  { title: "Maintenance", description: "Support for repair, cleaning and maintenance work.", icon: ShieldCheck },
];

export default function ScaffoldRental() {
  return (
    <main className="bg-white text-slate-950">
      <section className="relative overflow-hidden bg-slate-950">
        <img src={heroImage} alt="CANA scaffolding solutions" className="absolute inset-0 h-full w-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/65 to-black/20" />
        <div className="relative mx-auto flex min-h-[31rem] max-w-7xl items-end px-5 py-9 sm:px-8 sm:py-12 lg:min-h-[36rem] lg:px-8">
          <div className="max-w-2xl text-white">
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-red-400">CANA Services</p>
            <h1 className="mt-3 text-4xl font-extrabold tracking-[-.055em] sm:text-5xl lg:text-6xl">Scaffolding for sale and hire.</h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75 sm:text-lg">Reliable elevated access for construction, painting, renovation and maintenance projects.</p>
            <div className="mt-7 flex flex-col gap-2 sm:flex-row">
              <a href={whatsappLink("Hello CANA Services, I would like to hire scaffolding for my project.")} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-bold text-slate-950 transition hover:bg-red-700 hover:text-white">Hire scaffolding <ArrowRight size={16} /></a>
              <a href={whatsappLink("Hello CANA Services, I would like information about buying scaffolding.")} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center justify-center rounded-lg border border-white/30 px-5 text-sm font-bold text-white transition hover:border-white hover:bg-white/10">Buy scaffolding</a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-8">
        <div className="max-w-2xl">
          <p className="cana-section-kicker">Choose your solution</p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-[-.04em]">Buy for the long term. Hire for the job.</h2>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {options.map(({ title, label, description, points, icon: Icon, href, action, dark }) => (
            <article key={title} className={`rounded-2xl border p-5 sm:p-6 ${dark ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"}`}>
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${dark ? "bg-red-700 text-white" : "bg-slate-100 text-slate-800"}`}><Icon size={19} /></span>
              <p className={`mt-5 text-xs font-extrabold uppercase tracking-[.15em] ${dark ? "text-white/55" : "text-slate-500"}`}>{label}</p>
              <h3 className="mt-2 text-2xl font-extrabold tracking-tight">{title}</h3>
              <p className={`mt-3 max-w-lg text-sm leading-6 ${dark ? "text-white/65" : "text-slate-600"}`}>{description}</p>
              <ul className="mt-5 space-y-2.5">
                {points.map((point) => <li key={point} className={`flex items-center gap-2 text-sm font-medium ${dark ? "text-white/75" : "text-slate-700"}`}><Check size={15} className="text-red-500" />{point}</li>)}
              </ul>
              <a href={href} target="_blank" rel="noreferrer" className={`mt-6 inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold transition ${dark ? "bg-white text-slate-950 hover:bg-red-700 hover:text-white" : "bg-red-700 text-white hover:bg-slate-950"}`}>{action} <ArrowRight size={15} /></a>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_.92fr] lg:px-8">
          <img src={scaffoldImage} alt="CANA scaffolding equipment" className="aspect-[16/10] w-full rounded-2xl object-cover" />
          <div className="flex flex-col justify-center">
            <p className="cana-section-kicker">Built around your project</p>
            <h2 className="mt-1 text-3xl font-extrabold tracking-[-.04em]">Access where the work is.</h2>
            <div className="mt-5 space-y-3">
              {uses.map(({ title, description, icon: Icon }) => <div key={title} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-700"><Icon size={17} /></span><div><h3 className="font-extrabold text-slate-950">{title}</h3><p className="mt-1 text-sm text-slate-500">{description}</p></div></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-9 text-white sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-red-400">Delivery and support</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Tell us the site, quantity and duration.</h2></div>
          <a href={whatsappLink("Hello CANA Services, I would like to discuss scaffolding for my project.")} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-600"><Truck size={16} /> Talk to CANA</a>
        </div>
      </section>
    </main>
  );
}
