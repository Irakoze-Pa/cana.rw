import { Quote } from "lucide-react";

const testimonials = [
  { name: "Aline Mukamana", role: "Homeowner, Kigali", initials: "AM", quote: "The guidance was clear from colour selection to the final finish. Our space feels completely renewed." },
  { name: "Eric Niyonzima", role: "Project Manager", initials: "EN", quote: "CANA delivered dependable products and practical support that helped keep our project moving." },
  { name: "Claire Uwase", role: "Business Owner", initials: "CU", quote: "Professional communication, quality finishes, and a team that understood what we needed." },
];

export default function CorporateTestimonials() {
  return <section className="bg-slate-950 py-20 text-white sm:py-24 lg:py-28"><div className="mx-auto max-w-7xl px-6 lg:px-8"><div className="flex flex-col justify-between gap-6 border-b border-white/10 pb-10 lg:flex-row lg:items-end"><div><p className="text-[11px] font-extrabold uppercase tracking-[.2em] text-slate-400">Client feedback</p><h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">Trusted for quality and delivery.</h2></div><p className="max-w-md text-sm leading-6 text-slate-400">CANA works to make every project clearer, more dependable and easier to complete.</p></div><div className="mt-8 grid gap-4 md:grid-cols-3">{testimonials.map((item) => <article key={item.name} className="flex min-h-64 flex-col rounded-xl border border-white/10 bg-white/[.035] p-5"><Quote size={22} className="text-slate-400"/><p className="mt-5 flex-1 text-sm leading-7 text-slate-200">“{item.quote}”</p><div className="mt-6 flex items-center gap-3 border-t border-white/10 pt-4"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-xs font-bold">{item.initials}</span><div><p className="text-sm font-bold">{item.name}</p><p className="text-xs text-slate-400">{item.role}</p></div></div></article>)}</div></div></section>;
}
