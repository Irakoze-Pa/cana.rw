import {
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Factory,
  Handshake,
  HeartHandshake,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import teamPlaceholder from "@/assets/images/team-placeholder-v1.png";

const teams = [
  {
    icon: BriefcaseBusiness,
    number: "01",
    title: "Leadership & Administration",
    description:
      "Keeping the group focused, accountable, and ready to serve customers and partners well.",
  },
  {
    icon: Factory,
    number: "02",
    title: "Production & Quality",
    description:
      "Turning carefully selected materials into dependable CANA Paints products with consistent quality.",
  },
  {
    icon: Handshake,
    number: "03",
    title: "Sales & Customer Care",
    description:
      "Helping customers select the right solution, prepare quotations, and receive responsive support.",
  },
  {
    icon: ShieldCheck,
    number: "04",
    title: "Operations & Services",
    description:
      "Coordinating projects, logistics, site support, and the practical details behind reliable delivery.",
  },
];

const principles = [
  "Listen before we recommend",
  "Take ownership of the details",
  "Work safely and respectfully",
  "Keep improving every day",
];

export default function Team() {
  return (
    <main className="bg-white text-slate-950">
      <section className="overflow-hidden border-b border-slate-200 bg-slate-950 text-white">
        <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
          <div className="absolute -right-24 top-0 h-72 w-72 rounded-full bg-red-600/20 blur-3xl" />
          <div className="absolute bottom-0 left-1/2 h-48 w-96 -translate-x-1/2 rounded-full bg-white/5 blur-3xl" />

          <div className="relative max-w-4xl">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-10 bg-red-500" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-400">
                The people behind CANA
              </span>
            </div>

            <h1 className="text-5xl font-semibold leading-[1.04] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Meet our team.
              <span className="block text-slate-400">United by practical excellence.</span>
            </h1>

            <p className="mt-8 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
              Across CANA Paints and CANA Services, our people combine care,
              technical know-how, and a commitment to doing every job well.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Talk to our team
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/cana-paints/products"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              >
                Explore CANA Paints
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              One team, two divisions
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Built around the work that matters.
            </h2>
          </div>

          <div className="max-w-2xl">
            <p className="text-lg leading-8 text-slate-700">
              We bring the right people together from product development and
              production to customer service, site support, and delivery.
            </p>
            <p className="mt-6 leading-8 text-slate-500">
              Each team has a clear responsibility, while sharing the same
              standard: make every customer interaction and every finished
              result worthy of the CANA name.
            </p>
          </div>

          <figure className="relative overflow-hidden rounded-2xl bg-slate-100 shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
            <img
              src={teamPlaceholder}
              alt="Representative placeholder portrait of a CANA team"
              className="aspect-[3/2] h-full w-full object-cover"
            />
            <figcaption className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-slate-950/90 to-transparent px-5 pb-5 pt-14 text-xs font-medium text-white/90 sm:px-6 sm:pb-6">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              Representative team image.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="border-y border-slate-200 bg-slate-50/70 py-24 lg:py-28">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-600">
              How we work together
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Specialists with a shared purpose.
            </h2>
          </div>

          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 md:grid-cols-2">
            {teams.map((team) => {
              const Icon = team.icon;

              return (
                <article key={team.title} className="group bg-white p-8 sm:p-10">
                  <div className="flex items-start justify-between gap-6">
                    <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-red-600 group-hover:text-white">
                      <Icon size={22} strokeWidth={1.8} />
                    </span>
                    <span className="text-xs font-bold tracking-[0.18em] text-slate-300">
                      {team.number}
                    </span>
                  </div>
                  <h3 className="mt-10 text-2xl font-semibold tracking-tight text-slate-950">
                    {team.title}
                  </h3>
                  <p className="mt-4 max-w-md leading-7 text-slate-500">
                    {team.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="mx-auto grid max-w-7xl gap-14 px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white">
              <HeartHandshake size={22} strokeWidth={1.8} />
            </div>
            <p className="mt-8 text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
              Our way of working
            </p>
            <h2 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">
              Professional in process. Personal in service.
            </h2>
            <p className="mt-5 max-w-xl leading-8 text-slate-500">
              Good work comes from clear communication, disciplined execution,
              and genuine respect for the people who trust us with their homes,
              businesses, and projects.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-y border-slate-200">
            {principles.map((principle) => (
              <div key={principle} className="flex items-center gap-4 py-5">
                <BadgeCheck size={19} className="shrink-0 text-red-600" />
                <span className="font-medium text-slate-700">{principle}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-950 py-20 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <div>
            <div className="flex items-center gap-3 text-red-400">
              <Sparkles size={18} />
              <span className="text-xs font-bold uppercase tracking-[0.2em]">CANA Group</span>
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Let&apos;s make your next project count.
            </h2>
          </div>
          <Link
            to="/contact"
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-red-500"
          >
            Contact CANA
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </main>
  );
}
