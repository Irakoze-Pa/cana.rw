import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

import heroImage from "@/assets/images/hero.png";

const assurances = ["Reliable products", "Clear quotations", "Practical support"];

export default function CorporateHero() {
  return (
    <section className="border-t border-red-700 bg-white text-neutral-950">
      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-8 sm:py-8 lg:px-8 lg:py-10">
        <div className="grid overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_16px_45px_rgba(0,0,0,.07)] lg:grid-cols-[1.05fr_.95fr]">
          <div className="flex min-h-[31rem] flex-col justify-between p-6 sm:p-9 lg:min-h-[38rem] lg:p-12">
            <div>
              <p className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[.2em] text-neutral-500">
                <span className="h-px w-8 bg-red-700" />
                CANAN Business Group Ltd · Kigali, Rwanda
              </p>

              <div className="mt-12 sm:mt-16">
                <p className="text-[11px] font-bold uppercase tracking-[.18em] text-red-700">
                  CANA Paints &amp; Services
                </p>
                <h1 className="mt-4 max-w-xl text-4xl font-extrabold leading-[.98] tracking-[-.055em] text-neutral-950 sm:text-5xl lg:text-6xl">
                  Quality solutions for work that lasts.
                </h1>
                <p className="mt-6 max-w-xl text-base leading-7 text-neutral-600 sm:text-lg sm:leading-8">
                  Choose dependable coatings and practical project support from one professional team—clear from first selection to final result.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/cana-paints/products"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-neutral-950 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-neutral-800"
                >
                  Explore products <ArrowRight size={17} />
                </Link>
                <Link
                  to="/cana-paints/request-quote"
                  className="inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3.5 text-sm font-bold text-neutral-950 transition hover:border-neutral-950 hover:bg-neutral-50"
                >
                  Request a quotation
                </Link>
              </div>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-5 gap-y-2 border-t border-neutral-200 pt-5 text-xs font-medium text-neutral-600">
              {assurances.map((item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-red-700" />
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="relative min-h-[25rem] overflow-hidden bg-neutral-950 lg:min-h-0">
            <img
              src={heroImage}
              alt="A professional CANA project finish"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/20" />

            <div className="absolute left-5 right-5 top-5 flex items-center justify-between sm:left-7 sm:right-7 sm:top-7">
              <span className="rounded-full border border-white/30 bg-black/45 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.16em] text-white backdrop-blur">
                Kigali, Rwanda
              </span>
              <Link
                to="/projects"
                aria-label="View CANA projects"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-950 transition hover:bg-red-700 hover:text-white"
              >
                <ArrowUpRight size={18} />
              </Link>
            </div>

            <div className="absolute inset-x-5 bottom-5 border-l-2 border-red-600 bg-black/70 p-4 text-white backdrop-blur-sm sm:inset-x-7 sm:bottom-7 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[.17em] text-white/70">Made for real projects</p>
              <p className="mt-2 max-w-sm text-base font-semibold leading-6">
                Products and services that help projects move forward with confidence.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
