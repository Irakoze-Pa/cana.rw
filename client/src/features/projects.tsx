import { ArrowRight, ArrowUpRight, MapPin, PaintRoller, Ruler } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/api";
import CanaProject1 from "@/assets/images/canaproject1.jpeg";
import CanaProject2 from "@/assets/images/canaproject2.jpeg";
import CanaProject3 from "@/assets/images/Canaproject3.jpeg";
import CanaProject4 from "@/assets/images/canaproject4.jpeg";
import CanaProject5 from "@/assets/images/canaproject5.jpeg";

type ProjectCategory = "All" | "Painting" | "Scaffolding";

type Project = {
  id: number;
  title: string;
  category: Exclude<ProjectCategory, "All">;
  location: string;
  description: string;
  image: string;
};

type PublicSiteProject = {
  _id: string;
  name: string;
  workType: string;
  address: string;
  district?: string;
  publicSummary?: string;
  image?: string;
  latitude?: number | null;
  longitude?: number | null;
};

const projects: Project[] = [
  { id: 1, title: "Scaffolding access", category: "Scaffolding", location: "Kigali, Rwanda", description: "Practical elevated access for exterior construction, maintenance and finishing work.", image: CanaProject1 },
  { id: 2, title: "Residential house painting", category: "Painting", location: "Kigali, Rwanda", description: "Careful preparation and clean paint application for a polished residential finish.", image: CanaProject2 },
  { id: 3, title: "Exterior access solution", category: "Scaffolding", location: "Kigali, Rwanda", description: "Safe, structured access arranged around an active building project.", image: CanaProject3 },
  { id: 4, title: "Exterior house finish", category: "Painting", location: "Kigali, Rwanda", description: "Protective exterior painting with consistent colour and professional preparation.", image: CanaProject4 },
  { id: 5, title: "Professional paint finish", category: "Painting", location: "Kigali, Rwanda", description: "Detail-focused residential painting work with a clean final presentation.", image: CanaProject5 },
];

const filters: ProjectCategory[] = ["All", "Painting", "Scaffolding"];

const formatWorkType = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

const siteMapLink = (site: PublicSiteProject) =>
  site.latitude != null && site.longitude != null
    ? `https://www.google.com/maps?q=${site.latitude},${site.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`;

function ProjectType({ category }: { category: Exclude<ProjectCategory, "All"> }) {
  const Icon = category === "Scaffolding" ? Ruler : PaintRoller;
  return <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[.15em] text-white/80"><Icon size={13} />{category}</span>;
}

export default function Projects() {
  const [activeFilter, setActiveFilter] = useState<ProjectCategory>("All");
  const [siteProjects, setSiteProjects] = useState<PublicSiteProject[]>([]);

  useEffect(() => {
    api.get<{ data: PublicSiteProject[] }>("/sites/public")
      .then((response) => setSiteProjects((response.data.data || []).filter((site) => Boolean(site.image))))
      .catch(() => setSiteProjects([]));
  }, []);

  const filteredProjects = useMemo(
    () => activeFilter === "All" ? projects : projects.filter((project) => project.category === activeFilter),
    [activeFilter],
  );

  const featured = filteredProjects[0] ?? projects[0];

  return (
    <main className="bg-white text-slate-950">
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[.82fr_1.18fr] lg:items-end lg:px-8 lg:py-12">
          <div>
            <p className="cana-section-kicker">CANA portfolio</p>
            <h1 className="mt-1 max-w-xl text-4xl font-extrabold tracking-[-.055em] sm:text-5xl">Work made to last.</h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">A selection of CANA painting and access projects delivered across Rwanda.</p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link to="/contact" className="inline-flex h-10 items-center gap-2 rounded-lg bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-red-700">Start a project <ArrowRight size={16} /></Link>
              <Link to="/cana-paints/request-quote" className="inline-flex h-10 items-center rounded-lg border border-slate-300 px-4 text-sm font-bold text-slate-800 transition hover:border-slate-950">Request quotation</Link>
            </div>
          </div>
          <article className="group relative min-h-64 overflow-hidden rounded-2xl bg-slate-950 sm:min-h-80">
            <img src={featured.image} alt={featured.title} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
            <div className="absolute inset-x-5 bottom-5 text-white sm:inset-x-6 sm:bottom-6">
              <ProjectType category={featured.category} />
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight">{featured.title}</h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75"><MapPin size={14} />{featured.location}</p>
            </div>
          </article>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="cana-section-kicker">Selected work</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Our project gallery.</h2>
          </div>
          <div className="flex w-full gap-2 overflow-x-auto pb-1 sm:w-auto sm:overflow-visible">
            {filters.map((filter) => (
              <button key={filter} type="button" onClick={() => setActiveFilter(filter)} aria-pressed={activeFilter === filter} className={`h-9 shrink-0 rounded-lg px-3 text-sm font-bold transition ${activeFilter === filter ? "bg-slate-950 text-white" : "border border-slate-300 text-slate-700 hover:border-slate-950"}`}>
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <article key={project.id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <img src={project.image} alt={project.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-4 pb-3 pt-10"><ProjectType category={project.category} /></div>
              </div>
              <div className="p-4">
                <h3 className="font-extrabold text-slate-950">{project.title}</h3>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin size={14} />{project.location}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{project.description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {siteProjects.length > 0 && (
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-5 py-7 sm:px-8 sm:py-9 lg:px-8">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="cana-section-kicker">Live portfolio</p>
                <h2 className="mt-1 text-2xl font-extrabold tracking-tight">Current CANA sites.</h2>
              </div>
              <span className="text-sm font-bold text-slate-500">{siteProjects.length} site{siteProjects.length === 1 ? "" : "s"}</span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {siteProjects.map((site) => (
                <article key={site._id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  <img src={site.image} alt={site.name} className="aspect-[16/10] w-full object-cover" />
                  <div className="p-4">
                    <p className="text-xs font-extrabold uppercase tracking-[.14em] text-red-700">{formatWorkType(site.workType)}</p>
                    <h3 className="mt-1 font-extrabold text-slate-950">{site.name}</h3>
                    <p className="mt-1 flex items-start gap-1 text-sm text-slate-500"><MapPin className="mt-0.5 shrink-0" size={14} />{site.district || site.address}</p>
                    {site.publicSummary && <p className="mt-3 text-sm leading-6 text-slate-600">{site.publicSummary}</p>}
                    <a href={siteMapLink(site)} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-slate-950 hover:text-red-700">View location <ArrowUpRight size={15} /></a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-slate-950 py-9 text-white sm:py-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-8">
          <div><p className="text-xs font-extrabold uppercase tracking-[.16em] text-red-400">Your project</p><h2 className="mt-2 text-2xl font-extrabold tracking-tight">Let’s plan the next finish.</h2></div>
          <Link to="/contact" className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-600">Talk to CANA <ArrowRight size={16} /></Link>
        </div>
      </section>
    </main>
  );
}
