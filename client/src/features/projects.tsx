import {
  ArrowRight,
  CheckCircle2,
  MapPin,
  PaintRoller,
  Ruler,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import api from "@/services/api";

// =========================================================
// LOCAL CANA PROJECT IMAGES
// IMPORTANT: filenames must match the actual files exactly.
// =========================================================

import CanaProject1 from "@/assets/images/canaproject1.jpeg";
import CanaProject2 from "@/assets/images/canaproject2.jpeg";
import CanaProject3 from "@/assets/images/Canaproject3.jpeg";
import CanaProject4 from "@/assets/images/canaproject4.jpeg";
import CanaProject5 from "@/assets/images/canaproject5.jpeg";

// =========================================================
// TYPES
// =========================================================

type ProjectCategory = "All" | "House Painting" | "Scaffolding";

interface Project {
  id: number;
  title: string;
  category: Exclude<ProjectCategory, "All">;
  location: string;
  description: string;
  image: string;
  features: string[];
}

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

const siteMapLink = (site: PublicSiteProject) =>
  site.latitude != null && site.longitude != null
    ? `https://www.google.com/maps?q=${site.latitude},${site.longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`;

// =========================================================
// PROJECT DATA
// =========================================================

const projects: Project[] = [
  {
    id: 1,
    title: "Scaffolding",
    category: "Scaffolding",
    location: "Kigali, Rwanda",
    description:
      "Professional scaffolding arranged to provide practical access for elevated residential construction, painting and exterior finishing work.",
    image: CanaProject1,
    features: [
      "Scaffolding setup",
      "Working-height access",
      "Exterior work support",
    ],
  },
  {
    id: 2,
    title: "Residential House Painting",
    category: "House Painting",
    location: "Kigali, Rwanda",
    description:
      "Residential painting work focused on careful preparation, clean application and a professional finished appearance.",
    image: CanaProject2,
    features: [
      "Surface preparation",
      "House painting",
      "Professional finish",
    ],
  },
  {
    id: 3,
    title: "Scaffolding Access Solution",
    category: "Scaffolding",
    location: "Kigali, Rwanda",
    description:
      "Scaffolding installed to provide practical access around a building during exterior construction, maintenance and finishing activities.",
    image: CanaProject3,
    features: [
      "Exterior access",
      "Scaffolding installation",
      "Finishing support",
    ],
  },
  {
    id: 4,
    title: "Exterior House Painting",
    category: "House Painting",
    location: "Kigali, Rwanda",
    description:
      "Exterior painting designed to improve the appearance and protection of residential buildings through careful preparation and quality application.",
    image: CanaProject4,
    features: [
      "Exterior painting",
      "Surface preparation",
      "Weather protection",
    ],
  },
  {
    id: 5,
    title: "Professional Painting Finish",
    category: "House Painting",
    location: "Kigali, Rwanda",
    description:
      "Detailed residential painting work with attention to color consistency, application quality and the final appearance of the property.",
    image: CanaProject5,
    features: [
      "Color application",
      "Clean finishing",
      "Quality inspection",
    ],
  },
];

// =========================================================
// FILTERS
// =========================================================

const filters: ProjectCategory[] = [
  "All",
  "House Painting",
  "Scaffolding",
];

// =========================================================
// HELPERS
// =========================================================

function CategoryIcon({
  category,
  size = 15,
}: {
  category: ProjectCategory;
  size?: number;
}) {
  return category === "Scaffolding" ? (
    <Ruler size={size} />
  ) : (
    <PaintRoller size={size} />
  );
}

// =========================================================
// MAIN COMPONENT
// =========================================================

export default function Projects() {
  const [activeFilter, setActiveFilter] =
    useState<ProjectCategory>("All");
  const [siteProjects, setSiteProjects] = useState<PublicSiteProject[]>([]);

  useEffect(() => {
    api.get<{ data: PublicSiteProject[] }>("/sites/public")
      .then((response) => setSiteProjects((response.data.data || []).filter((site) => Boolean(site.image))))
      .catch(() => setSiteProjects([]));
  }, []);

  const filteredProjects = useMemo(() => {
    if (activeFilter === "All") {
      return projects;
    }

    return projects.filter(
      (project) => project.category === activeFilter
    );
  }, [activeFilter]);

  const featuredProject = useMemo(() => {
    if (activeFilter === "All") {
      return projects[0];
    }

    return (
      projects.find(
        (project) => project.category === activeFilter
      ) ?? projects[0]
    );
  }, [activeFilter]);

  const paintingProjects = projects.filter(
    (project) => project.category === "House Painting"
  );

  const scaffoldingProjects = projects.filter(
    (project) => project.category === "Scaffolding"
  );

  const scrollToProjects = () => {
    document
      .getElementById("projects-gallery")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const scrollToServices = () => {
    document
      .getElementById("services")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  const selectCategory = (category: ProjectCategory) => {
    setActiveFilter(category);

    setTimeout(() => {
      scrollToProjects();
    }, 50);
  };

  return (
    <main className="min-h-screen bg-white text-black">

      {/* =====================================================
          HERO
      ===================================================== */}

      <section className="relative overflow-hidden border-b border-black bg-white">

        {/* Decorative background */}

        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-32 top-10 h-96 w-96 rounded-full bg-red-50 blur-3xl" />

          <div className="absolute -right-40 top-0 h-[500px] w-[500px] rounded-full bg-black/[0.035] blur-3xl" />

          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-50/40 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6 py-12 sm:py-16 lg:px-8 lg:py-20">

          <div className="grid items-center gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-16">

            {/* HERO CONTENT */}

            <div>

              <div className="mb-7 flex items-center gap-3">

                <span className="h-px w-10 bg-red-600" />

                <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                  CANA Projects
                </span>

              </div>

              <h1 className="max-w-3xl text-5xl font-semibold leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl xl:text-[5.2rem]">

                Real Projects.

                <span className="block">
                  Real Results.
                </span>

                <span className="block text-slate-400">
                  Built With Care.
                </span>

              </h1>

              <p className="mt-7 max-w-xl text-base leading-7 text-slate-600 lg:text-lg lg:leading-8">
                Explore selected CANA projects in residential
                house painting and scaffolding. From preparation
                and access to final finishing, we focus on
                professional execution and quality results.
              </p>

              {/* ACTIONS */}

              <div className="mt-9 flex flex-wrap gap-3">

                <button
                  type="button"
                  onClick={scrollToProjects}
                  className="group inline-flex items-center gap-2 rounded-lg bg-black px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition duration-300 hover:-translate-y-0.5 hover:bg-red-700"
                >
                  View Projects

                  <ArrowRight
                    size={16}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    selectCategory("House Painting")
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-black bg-white px-6 py-3.5 text-sm font-semibold text-black transition duration-300 hover:border-red-700 hover:text-red-700"
                >
                  <PaintRoller size={16} />

                  Painting Work
                </button>

              </div>

              {/* STATS */}

              <div className="mt-11 grid max-w-xl grid-cols-3 border-t border-slate-200 pt-7">

                <div>
                  <p className="text-2xl font-semibold tracking-tight">
                    02
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Services
                  </p>
                </div>

                <div className="border-x border-slate-200 px-5">
                  <p className="text-2xl font-semibold tracking-tight">
                    05
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Projects
                  </p>
                </div>

                <div className="pl-5">
                  <p className="text-2xl font-semibold tracking-tight">
                    Kigali
                  </p>

                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Focus Area
                  </p>
                </div>

              </div>

            </div>

            {/* HERO IMAGE */}

            <div className="group relative">

              <div className="absolute -inset-4 rounded-[2.5rem] bg-gradient-to-br from-red-100 via-transparent to-black/5 opacity-80 blur-2xl" />

              <div className="relative overflow-hidden rounded-[1.5rem] border border-black bg-black shadow-2xl">

                {/* Featured badge */}

                <div className="absolute left-5 top-5 z-10 flex items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-700 shadow-lg backdrop-blur">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-600" />

                  Featured Project
                </div>

                <img
                  src={featuredProject.image}
                  alt={featuredProject.title}
                  className="h-[430px] w-full object-cover transition duration-700 group-hover:scale-105 sm:h-[560px] lg:h-[610px]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                {/* Image information */}

                <div className="absolute inset-x-0 bottom-0 p-7 sm:p-9">

                  <div className="flex items-end justify-between gap-6">

                    <div className="text-white">

                      <div className="flex items-center gap-2 text-white/70">

                        <CategoryIcon
                          category={featuredProject.category}
                          size={14}
                        />

                        <p className="text-xs font-bold uppercase tracking-[0.18em]">
                          {featuredProject.category}
                        </p>

                      </div>

                      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
                        {featuredProject.title}
                      </h2>

                      <div className="mt-3 flex items-center gap-2 text-sm text-white/70">
                        <MapPin size={14} />

                        {featuredProject.location}
                      </div>

                    </div>

                    <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/15 text-white backdrop-blur-md sm:flex">

                      <CategoryIcon
                        category={featuredProject.category}
                        size={21}
                      />

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          FILTER BAR
      ===================================================== */}

      <section className="sticky top-0 z-30 border-b border-black bg-white/95 backdrop-blur-xl">

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 overflow-x-auto px-6 py-4 lg:px-8">

          <div className="flex items-center gap-2">

            {filters.map((filter) => {

              const active =
                activeFilter === filter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() =>
                    setActiveFilter(filter)
                  }
                  className={`inline-flex whitespace-nowrap items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition duration-300 ${
                    active
                      ? "border-black bg-black text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-500 hover:border-black hover:text-black"
                  }`}
                >
                  {filter !== "All" && (
                    <CategoryIcon
                      category={filter}
                      size={14}
                    />
                  )}

                  {filter}
                </button>
              );
            })}

          </div>

          <div className="hidden items-center gap-2 whitespace-nowrap text-sm font-medium text-slate-400 sm:flex">

            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />

            {filteredProjects.length}{" "}
            {filteredProjects.length === 1
              ? "project"
              : "projects"}

          </div>

        </div>

      </section>

      {/* =====================================================
          PROJECT GALLERY
      ===================================================== */}

      <section
        id="projects-gallery"
        className="scroll-mt-20 py-16 lg:py-20"
      >

        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          {/* HEADER */}

          <div className="mb-12 flex flex-col justify-between gap-7 lg:flex-row lg:items-end">

            <div className="max-w-3xl">

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                Selected Work
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Work we are proud of.
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
                A growing collection of CANA projects showcasing
                our residential painting and scaffolding work.
              </p>

            </div>

            <div className="hidden rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 md:block">

              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                Current Focus
              </p>

              <div className="mt-2 flex items-center gap-2 text-sm font-semibold">

                <span className="h-2 w-2 rounded-full bg-red-600" />

                Painting + Scaffolding

              </div>

            </div>

          </div>

          {/* PROJECT GRID */}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">

            {filteredProjects.map(
              (project, index) => {

                const isFirst =
                  index === 0;

                return (
                  <article
                    key={project.id}
                    className={`group overflow-hidden rounded-2xl border border-black bg-white transition duration-500 hover:-translate-y-1 hover:border-red-700 hover:shadow-2xl ${
                      isFirst
                        ? "md:col-span-2 lg:col-span-2"
                        : ""
                    }`}
                  >

                    {/* IMAGE */}

                    <div
                      className={`relative overflow-hidden bg-slate-100 ${
                        isFirst
                          ? "aspect-[16/8]"
                          : "aspect-[4/3]"
                      }`}
                    >

                      <img
                        src={project.image}
                        alt={project.title}
                        loading={
                          index === 0
                            ? "eager"
                            : "lazy"
                        }
                        decoding="async"
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />

                      {/* Overlay */}

                      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-90 transition duration-500 group-hover:from-black/75" />

                      {/* Category */}

                      <div className="absolute left-5 top-5">

                        <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.08em] text-red-600 shadow-lg backdrop-blur">

                          <CategoryIcon
                            category={project.category}
                            size={12}
                          />

                          {project.category}

                        </span>

                      </div>

                      {/* Number */}

                      <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-black/30 text-xs font-bold text-white backdrop-blur-md">

                        {String(project.id).padStart(
                          2,
                          "0"
                        )}

                      </div>

                      {/* Location */}

                      <div className="absolute bottom-5 left-5">

                        <p className="flex items-center gap-2 text-xs font-medium text-white/80">

                          <MapPin size={13} />

                          {project.location}

                        </p>

                      </div>

                    </div>

                    {/* CONTENT */}

                    <div className="p-6 sm:p-7">

                      <h3 className="text-xl font-semibold tracking-tight sm:text-2xl">
                        {project.title}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-500">
                        {project.description}
                      </p>

                      <div className="mt-6 border-t border-slate-100 pt-5">

                        <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                          Project Highlights
                        </p>

                        <div className="grid gap-2 sm:grid-cols-2">

                          {project.features.map(
                            (feature) => (

                              <div
                                key={feature}
                                className="flex items-center gap-2 text-xs font-medium text-slate-500"
                              >

                                <CheckCircle2
                                  size={14}
                                  className="shrink-0 text-red-600"
                                />

                                {feature}

                              </div>

                            )
                          )}

                        </div>

                      </div>

                    </div>

                  </article>
                );
              }
            )}

          </div>

          {/* EMPTY */}

          {filteredProjects.length === 0 && (
            <div className="rounded-3xl border border-dashed border-slate-300 py-20 text-center">

              <p className="text-sm font-medium text-slate-500">
                No projects available in this category yet.
              </p>

            </div>
          )}

        </div>

      </section>

      {siteProjects.length > 0 && (
        <section className="border-y border-black bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div className="max-w-3xl">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">CANA site portfolio</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Recent work, with locations.</h2>
                <p className="mt-4 text-sm leading-7 text-slate-500 sm:text-base">Current project photos shared directly by our operations team. Open any location when you want to see where the work is happening.</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Live portfolio</p><p className="mt-1 text-xl font-extrabold text-slate-950">{siteProjects.length} site{siteProjects.length === 1 ? "" : "s"}</p></div>
            </div>
            <div className="mt-9 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {siteProjects.map((site) => (
                <article key={site._id} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-1 hover:border-red-300 hover:shadow-xl">
                  <div className="relative overflow-hidden"><img src={site.image} alt={site.name} loading="lazy" className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.12em] text-red-700 shadow-sm">{site.workType}</span></div>
                  <div className="p-5">
                    <h3 className="text-lg font-extrabold text-slate-950">{site.name}</h3>
                    <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500"><MapPin size={15} className="mt-0.5 shrink-0 text-red-600" />{site.address}{site.district ? ` · ${site.district}` : ""}</p>
                    {site.publicSummary && <p className="mt-3 text-sm leading-6 text-slate-600">{site.publicSummary}</p>}
                    <a href={siteMapLink(site)} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 border-t border-slate-100 pt-4 text-sm font-bold text-red-700 transition hover:text-slate-950"><MapPin size={15} />View site on map</a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* =====================================================
          SERVICE INTRO
      ===================================================== */}

      <section
        id="services"
        className="scroll-mt-20 border-y border-black bg-white py-16 lg:py-20"
      >

        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="mb-12 max-w-3xl">

            <div className="mb-5 flex items-center gap-3">

              <span className="h-px w-8 bg-red-600" />

              <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Our Services
              </span>

            </div>

            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Two core services.
              <span className="block text-slate-400">
                One professional standard.
              </span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              CANA currently focuses on two practical services for
              residential properties: professional house painting
              and scaffolding solutions for elevated exterior work.
            </p>

          </div>

          {/* SERVICE CARDS */}

          <div className="grid gap-7 lg:grid-cols-2">

            {/* =================================================
                PAINTING
            ================================================= */}

            <article className="group overflow-hidden rounded-2xl border border-black bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:border-red-700 hover:shadow-2xl">

              <div className="relative overflow-hidden">

                <img
                  src={CanaProject2}
                  alt="CANA residential house painting project"
                  className="h-[350px] w-full object-cover transition duration-700 group-hover:scale-105 sm:h-[430px]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                <div className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-red-600 shadow-xl">

                  <PaintRoller size={21} />

                </div>

                <div className="absolute bottom-0 inset-x-0 p-7 sm:p-8">

                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                    Service 01
                  </p>

                  <h3 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                    House Painting
                  </h3>

                  <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">
                    Professional interior and exterior painting
                    for residential properties.
                  </p>

                </div>

              </div>

              <div className="p-7 sm:p-8">

                <p className="text-sm leading-7 text-slate-500">
                  We provide professional house painting with
                  careful preparation, consistent application and
                  attention to the final appearance of every
                  surface.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">

                  {[
                    "Interior painting",
                    "Exterior painting",
                    "Surface preparation",
                    "Color finishing",
                  ].map((item) => (

                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm font-medium text-slate-600"
                    >

                      <CheckCircle2
                        size={16}
                        className="shrink-0 text-red-600"
                      />

                      {item}

                    </div>

                  ))}

                </div>

                <button
                  type="button"
                  onClick={() =>
                    selectCategory("House Painting")
                  }
                  className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 transition hover:text-red-600"
                >
                  View painting projects

                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </button>

              </div>

            </article>

            {/* =================================================
                SCAFFOLDING
            ================================================= */}

            <article className="group overflow-hidden rounded-2xl border border-black bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:border-red-700 hover:shadow-2xl">

              <div className="relative overflow-hidden">

                <img
                  src={CanaProject1}
                  alt="CANA residential scaffolding project"
                  className="h-[350px] w-full object-cover transition duration-700 group-hover:scale-105 sm:h-[430px]"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />

                <div className="absolute left-6 top-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white text-red-600 shadow-xl">

                  <Ruler size={21} />

                </div>

                <div className="absolute bottom-0 inset-x-0 p-7 sm:p-8">

                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                    Service 02
                  </p>

                  <h3 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">
                    Scaffolding
                  </h3>

                  <p className="mt-2 max-w-lg text-sm leading-6 text-white/75">
                    Practical access solutions for exterior
                    construction, painting and finishing.
                  </p>

                </div>

              </div>

              <div className="p-7 sm:p-8">

                <p className="text-sm leading-7 text-slate-500">
                  We provide scaffolding rental and installation
                  to support residential painting, maintenance and
                  exterior finishing work at different working
                  heights.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">

                  {[
                    "Scaffolding rental",
                    "Installation",
                    "Painting access",
                    "Exterior maintenance",
                  ].map((item) => (

                    <div
                      key={item}
                      className="flex items-center gap-2 text-sm font-medium text-slate-600"
                    >

                      <CheckCircle2
                        size={16}
                        className="shrink-0 text-red-600"
                      />

                      {item}

                    </div>

                  ))}

                </div>

                <button
                  type="button"
                  onClick={() =>
                    selectCategory("Scaffolding")
                  }
                  className="group mt-7 inline-flex items-center gap-2 text-sm font-semibold text-slate-950 transition hover:text-red-600"
                >
                  View scaffolding projects

                  <ArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-1"
                  />

                </button>

              </div>

            </article>

          </div>

        </div>

      </section>

      {/* =====================================================
          PORTFOLIO BREAKDOWN
      ===================================================== */}

      <section className="border-b border-black bg-black py-14 text-white lg:py-16">

        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="grid gap-5 md:grid-cols-3">

            {/* TOTAL */}

            <div className="group rounded-2xl border border-white/15 bg-white/[.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-red-500 hover:bg-white/[.08] hover:shadow-lg">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-4xl font-semibold tracking-tight">
                    {projects.length}
                  </p>

                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
                    Featured Projects
                  </p>
                </div>

                <Sparkles
                  size={20}
                  className="text-red-600"
                />

              </div>

              <p className="mt-5 text-sm leading-6 text-white/70">
                Selected examples of our current project work.
              </p>

            </div>

            {/* PAINTING */}

            <div className="group rounded-2xl border border-white/15 bg-white/[.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-red-500 hover:bg-white/[.08] hover:shadow-lg">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-4xl font-semibold tracking-tight">
                    {paintingProjects.length}
                  </p>

                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
                    Painting Projects
                  </p>
                </div>

                <PaintRoller
                  size={20}
                  className="text-red-600"
                />

              </div>

              <p className="mt-5 text-sm leading-6 text-white/70">
                Residential interior and exterior painting work.
              </p>

            </div>

            {/* SCAFFOLDING */}

            <div className="group rounded-2xl border border-white/15 bg-white/[.04] p-6 transition duration-300 hover:-translate-y-1 hover:border-red-500 hover:bg-white/[.08] hover:shadow-lg">

              <div className="flex items-start justify-between">

                <div>
                  <p className="text-4xl font-semibold tracking-tight">
                    {scaffoldingProjects.length}
                  </p>

                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/55">
                    Scaffolding Projects
                  </p>
                </div>

                <Ruler
                  size={20}
                  className="text-red-600"
                />

              </div>

              <p className="mt-5 text-sm leading-6 text-white/70">
                Practical access solutions for elevated exterior
                work.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          WHY CANA
      ===================================================== */}

      <section className="py-20 lg:py-28">

        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="mb-12 max-w-3xl">

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
              Why Choose CANA
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              Professional from preparation
              <span className="block text-slate-400">
                to completion.
              </span>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
              Our approach combines practical planning, quality
              workmanship, responsible access and attention to the
              final details.
            </p>

          </div>

          <div className="grid gap-5 md:grid-cols-3">

            {/* QUALITY */}

            <div className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-red-100 hover:shadow-xl">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 transition duration-300 group-hover:bg-red-600 group-hover:text-white">

                <PaintRoller size={20} />

              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Quality Finishing
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Careful preparation and professional painting
                techniques help create clean, consistent and
                attractive finishes.
              </p>

            </div>

            {/* SAFETY */}

            <div className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-red-100 hover:shadow-xl">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 transition duration-300 group-hover:bg-red-600 group-hover:text-white">

                <ShieldCheck size={20} />

              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Safety Focus
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Our scaffolding approach focuses on practical access
                and responsible working conditions for elevated
                exterior work.
              </p>

            </div>

            {/* DETAIL */}

            <div className="group rounded-3xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-1 hover:border-red-100 hover:shadow-xl">

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600 transition duration-300 group-hover:bg-red-600 group-hover:text-white">

                <Sparkles size={20} />

              </div>

              <h3 className="mt-5 text-lg font-semibold">
                Attention to Detail
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                We pay attention to preparation, application, access
                and finishing details that improve the completed
                project.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          PROCESS
      ===================================================== */}

      <section className="border-y border-black bg-white py-16 lg:py-20">

        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">

            <div>

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-600">
                Our Approach
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                A clear process.
                <span className="block text-slate-400">
                  A professional result.
                </span>
              </h2>

              <p className="mt-5 max-w-lg text-sm leading-7 text-slate-500 sm:text-base">
                We keep the project process practical and clear,
                from understanding the property through preparation,
                execution and final review.
              </p>

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              {[
                {
                  number: "01",
                  title: "Assess",
                  text: "Understand the property, surfaces, access requirements and project scope.",
                },
                {
                  number: "02",
                  title: "Prepare",
                  text: "Prepare surfaces and organize the required painting or scaffolding solution.",
                },
                {
                  number: "03",
                  title: "Execute",
                  text: "Carry out the work with professional application and practical site management.",
                },
                {
                  number: "04",
                  title: "Finish",
                  text: "Review the completed work and focus on a clean, professional final result.",
                },
              ].map((step) => (

                <div
                  key={step.number}
                  className="group rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-red-200 hover:shadow-lg"
                >

                  <div className="flex items-center justify-between">

                    <span className="text-xs font-bold tracking-[0.15em] text-red-600">
                      {step.number}
                    </span>

                    <ArrowRight
                      size={16}
                      className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-red-600"
                    />

                  </div>

                  <h3 className="mt-4 text-lg font-semibold">
                    {step.title}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    {step.text}
                  </p>

                </div>

              ))}

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          FINAL CTA
      ===================================================== */}

      <section className="relative overflow-hidden bg-black py-16 text-white lg:py-20">

        <div className="pointer-events-none absolute -right-40 -top-40 h-[500px] w-[500px] rounded-full bg-red-600/20 blur-3xl" />

        <div className="pointer-events-none absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-white/5 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 lg:px-8">

          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] px-7 py-10 sm:px-10 lg:px-14 lg:py-16">

            <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">

              <div className="max-w-2xl">

                <div className="flex items-center gap-3">

                  <span className="h-px w-8 bg-red-500" />

                  <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-400">
                    Start Your Project
                  </p>

                </div>

                <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">

                  Ready to transform

                  <span className="block text-slate-400">
                    your property?
                  </span>

                </h2>

                <p className="mt-5 max-w-xl text-sm leading-7 text-slate-400 sm:text-base">
                  Whether you need professional house painting or
                  scaffolding for exterior work, CANA is ready to
                  help with a practical solution for your project.
                </p>

              </div>

              <button
                type="button"
                onClick={scrollToServices}
                className="group inline-flex shrink-0 items-center justify-center gap-3 rounded-xl bg-white px-7 py-4 text-sm font-semibold text-slate-950 transition duration-300 hover:-translate-y-0.5 hover:bg-red-600 hover:text-white"
              >
                Explore Services

                <ArrowRight
                  size={17}
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />

              </button>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}
