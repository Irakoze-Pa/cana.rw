import { ArrowRight, BriefcaseBusiness, MonitorCog } from "lucide-react";
import { Link } from "react-router-dom";
import irakozeIsidorePortrait from "@/assets/images/irakoze-isidore-it-manager-cropped.png";
import kabandaFredPortrait from "@/assets/images/kabanda-fred-ceo-suit.png";

const team = [
  { name: "KABANDA Fred", role: "Chief Executive Officer & Managing Director", area: "Corporate leadership and business direction", icon: BriefcaseBusiness, image: kabandaFredPortrait, position: "50% 24%", zoom: 1.12 },
  { name: "Irakoze Isidore", role: "IT Manager", area: "Systems, technology and digital support", icon: MonitorCog, image: irakozeIsidorePortrait, position: "50% 16%", zoom: 1.06 },
];

export default function Team() {
  return (
    <main className="bg-white text-slate-950">
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-9 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-12">
          <div>
            <p className="cana-section-kicker">CANAN Business Group</p>
            <h1 className="mt-1 text-4xl font-extrabold tracking-[-.055em] sm:text-5xl">Meet our team.</h1>
          </div>
          <Link to="/contact" className="inline-flex h-10 w-fit items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-red-700">
            Contact CANA <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-8">
        <div className="grid max-w-4xl gap-5 sm:grid-cols-2">
          {team.map(({ name, role, area, icon: Icon, position, image, zoom }) => (
            <article key={role} className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="aspect-[4/5] w-full shrink-0 overflow-hidden bg-white">
                <img
                  src={image}
                  alt={`${name} — ${role}`}
                  style={{ objectPosition: position, transform: `scale(${zoom})` }}
                  className="h-full w-full origin-center object-cover"
                />
              </div>
              <div className="flex min-h-[148px] flex-1 items-start gap-3 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700"><Icon size={18} /></span>
                <div className="min-w-0">
                  <h2 className="text-lg font-extrabold tracking-tight text-slate-950">{name}</h2>
                  <p className="mt-1 text-sm font-bold text-red-700">{role}</p>
                  <p className="mt-1 text-sm text-slate-500">{area}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-50 py-9 sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <p className="cana-section-kicker">Work with CANA</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Ready for your next project.</h2>
          </div>
          <Link to="/contact" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-red-700">
            Contact our team <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
