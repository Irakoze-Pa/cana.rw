import { Quote } from "lucide-react";

const testimonials = [
  { name: "Aline Mukamana", role: "Homeowner, Kigali", initials: "AM", quote: "The guidance was clear from colour selection to the final finish. Our space feels completely renewed." },
  { name: "Eric Niyonzima", role: "Project Manager", initials: "EN", quote: "CANA delivered dependable products and practical support that helped keep our project moving." },
  { name: "Claire Uwase", role: "Business Owner", initials: "CU", quote: "Professional communication, quality finishes, and a team that understood what we needed." },
];

export default function CorporateTestimonials() {
  return (
    <section className="bg-neutral-950 py-10 text-white lg:py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.2em] text-neutral-400">Client feedback</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Trusted for quality and delivery.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-neutral-400">Professional support and dependable results for every project.</p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {testimonials.map((item) => (
            <article key={item.name} className="flex min-h-52 flex-col rounded-xl border border-white/10 bg-white/[.035] p-4">
              <Quote size={18} className="text-red-500" />
              <p className="mt-3 flex-1 text-sm leading-6 text-neutral-200">“{item.quote}”</p>
              <div className="mt-4 flex items-center gap-3 border-t border-white/10 pt-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-700 text-[10px] font-bold">{item.initials}</span>
                <div>
                  <p className="text-sm font-bold">{item.name}</p>
                  <p className="text-xs text-neutral-400">{item.role}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
