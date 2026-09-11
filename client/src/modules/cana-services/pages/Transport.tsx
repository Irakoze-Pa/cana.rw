import {
  ArrowRight,
  ChevronRight,
  Clock3,
  MapPin,
  Package,
  ShieldCheck,
  Truck,
} from "lucide-react";
import { Link } from "react-router-dom";

const WHATSAPP_NUMBER = "250789408367";

const whatsappMessage = encodeURIComponent(
  "Hello CANA Services, I am interested in your transport and delivery service. I would like to request more information."
);

const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMessage}`;

const transportServices = [
  {
    number: "01",
    title: "Construction Materials",
    description:
      "Reliable transportation of building and construction materials from suppliers to project sites.",
    icon: Package,
  },
  {
    number: "02",
    title: "Scaffolding & Equipment",
    description:
      "Safe movement of scaffolding, tools and construction equipment between locations and project sites.",
    icon: Truck,
  },
  {
    number: "03",
    title: "Paint & Product Delivery",
    description:
      "Professional delivery of CANA Paints and related products to customers, contractors and project sites.",
    icon: Package,
  },
  {
    number: "04",
    title: "Commercial Deliveries",
    description:
      "Flexible transport solutions for businesses that need products, materials or equipment moved efficiently.",
    icon: Truck,
  },
];

const processSteps = [
  {
    number: "01",
    title: "Request",
    description:
      "Tell us what needs to be transported, where it is located and where it needs to go.",
  },
  {
    number: "02",
    title: "Plan",
    description:
      "We assess the load, distance and delivery requirements and arrange the appropriate solution.",
  },
  {
    number: "03",
    title: "Collect",
    description:
      "Our team coordinates pickup from the agreed location and prepares the load for transport.",
  },
  {
    number: "04",
    title: "Deliver",
    description:
      "Your materials or equipment are transported and delivered to the required destination.",
  },
];

const benefits = [
  {
    title: "Reliable Service",
    description:
      "Transport planned around your requirements and delivery schedule.",
    icon: ShieldCheck,
  },
  {
    title: "Careful Handling",
    description:
      "Materials and equipment are handled with attention throughout the journey.",
    icon: Package,
  },
  {
    title: "Flexible Solutions",
    description:
      "Transport options adapted to different loads and delivery requirements.",
    icon: Truck,
  },
  {
    title: "Professional Support",
    description:
      "Clear communication from pickup coordination through final delivery.",
    icon: Clock3,
  },
];

function ServiceCard({
  number,
  title,
  description,
  icon: Icon,
}: {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  return (
    <div className="group border-t border-neutral-200 pt-6">
      <div className="flex items-start justify-between gap-6">
        <span className="text-sm font-semibold tracking-[0.2em] text-red-600">
          {number}
        </span>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-neutral-200 transition-all duration-300 group-hover:border-red-600 group-hover:bg-red-600 group-hover:text-white">
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>

      <h3 className="mt-8 text-xl font-semibold tracking-tight text-neutral-950">
        {title}
      </h3>

      <p className="mt-3 max-w-md text-sm leading-7 text-neutral-500">
        {description}
      </p>

      <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-neutral-900">
        Transport solution
        <ChevronRight
          size={14}
          className="transition-transform duration-300 group-hover:translate-x-1"
        />
      </div>
    </div>
  );
}

function ProcessStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative border-l border-neutral-200 pl-6">
      <span className="absolute -left-[1px] top-0 h-12 w-px bg-red-600" />

      <span className="text-xs font-bold tracking-[0.2em] text-red-600">
        {number}
      </span>

      <h3 className="mt-4 text-lg font-semibold text-neutral-950">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-7 text-neutral-500">
        {description}
      </p>
    </div>
  );
}

export default function Transport() {
  return (
    <main className="bg-white text-neutral-950">
      {/* =========================================================
          PAGE INTRO
      ========================================================== */}
      <section className="border-b border-black">
        <div className="mx-auto max-w-7xl px-6 pb-14 pt-12 sm:px-8 lg:px-12 lg:pb-16 lg:pt-16">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <div className="mb-6 flex items-center gap-3">
                <span className="h-px w-8 bg-red-600" />

                <span className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">
                  CANA Services
                </span>
              </div>

              <h1 className="max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
                Reliable transport.
                <br />
                <span className="text-neutral-400">
                  Delivered with care.
                </span>
              </h1>
            </div>

            <div className="lg:pb-1">
              <p className="max-w-xl text-base leading-8 text-neutral-500 sm:text-lg">
                CANA Services provides dependable transport and delivery
                solutions for construction materials, scaffolding, paint
                products, equipment and commercial needs.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-lg bg-black px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Request Transport
                  <ArrowRight size={16} />
                </a>

                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-lg border border-black px-5 py-3.5 text-sm font-semibold text-black transition hover:border-red-700 hover:text-red-700"
                >
                  Contact CANA
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          SERVICES
      ========================================================== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mb-14 grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-red-600">
                What We Transport
              </span>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Transport built around your needs.
              </h2>
            </div>

            <p className="max-w-2xl text-sm leading-7 text-neutral-500 lg:justify-self-end">
              From construction materials to equipment and finished products,
              we provide practical transport solutions designed around the
              requirements of each delivery.
            </p>
          </div>

          <div className="grid gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {transportServices.map((service) => (
              <ServiceCard key={service.number} {...service} />
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================
          CANA ECOSYSTEM
      ========================================================== */}
      <section className="bg-neutral-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-red-500">
                Built Around Your Project
              </span>

              <h2 className="mt-5 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.03em] sm:text-4xl">
                More than transport.
                <br />
                <span className="text-neutral-500">
                  Complete project support.
                </span>
              </h2>
            </div>

            <div>
              <p className="max-w-2xl text-sm leading-8 text-neutral-400">
                CANA connects products, equipment and transport to support
                projects from supply to site. Whether you need paint,
                scaffolding or construction materials delivered to your
                location, our transport service helps keep your project
                moving.
              </p>

              <div className="mt-10 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 px-5 py-6">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-red-500">
                    01
                  </span>

                  <p className="mt-4 text-sm font-semibold">
                    CANA Paints
                  </p>

                  <p className="mt-1 text-xs leading-6 text-neutral-500">
                    Quality paint products
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 px-5 py-6">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-red-500">
                    02
                  </span>

                  <p className="mt-4 text-sm font-semibold">
                    Scaffolding
                  </p>

                  <p className="mt-1 text-xs leading-6 text-neutral-500">
                    Sale & hire solutions
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 px-5 py-6">
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-red-500">
                    03
                  </span>

                  <p className="mt-4 text-sm font-semibold">
                    Transport
                  </p>

                  <p className="mt-1 text-xs leading-6 text-neutral-500">
                    Delivery to your site
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          PROCESS
      ========================================================== */}
      <section className="border-y border-black bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[0.65fr_1.35fr]">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-red-600">
                Our Process
              </span>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Simple from request to delivery.
              </h2>

              <p className="mt-5 max-w-md text-sm leading-7 text-neutral-500">
                We keep the process straightforward, with clear communication
                at every stage of the delivery.
              </p>
            </div>

            <div className="grid gap-10 sm:grid-cols-2">
              {processSteps.map((step) => (
                <ProcessStep key={step.number} {...step} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          WHY CANA
      ========================================================== */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="mb-14 max-w-2xl">
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-red-600">
              Why CANA
            </span>

            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Transport you can depend on.
            </h2>
          </div>

          <div className="grid gap-0 border-y border-neutral-200 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => {
              const Icon = benefit.icon;

              return (
                <div
                  key={benefit.title}
                  className={`group px-6 py-8 lg:px-7 ${
                    index !== 0
                      ? "border-t border-neutral-200 sm:border-l lg:border-t-0"
                      : ""
                  }`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 transition-colors duration-300 group-hover:bg-red-600 group-hover:text-white">
                    <Icon size={18} strokeWidth={1.8} />
                  </div>

                  <h3 className="mt-7 text-base font-semibold">
                    {benefit.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-neutral-500">
                    {benefit.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          DELIVERY REQUIREMENTS
      ========================================================== */}
      <section className="border-t border-black bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.22em] text-red-600">
                Delivery Information
              </span>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
                Tell us what needs to move.
              </h2>

              <p className="mt-5 max-w-xl text-sm leading-7 text-neutral-500">
                To help us arrange the right transport solution, provide the
                type of material or equipment, quantity, pickup location and
                destination.
              </p>

              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-neutral-950 transition hover:text-red-600"
              >
                Start a transport request
                <ArrowRight size={16} />
              </a>
            </div>

            <div className="rounded-2xl border border-black bg-white p-7 shadow-sm sm:p-9">
              <div className="flex items-start gap-4 border-b border-neutral-200 pb-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
                  <MapPin size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    Pickup & destination
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Let us know where the load is coming from and where it
                    needs to be delivered.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 border-b border-neutral-200 py-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
                  <Package size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    Load information
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Share the type, quantity and approximate size of the
                    materials or equipment.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 pt-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-red-600">
                  <Clock3 size={18} />
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">
                    Delivery timing
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-neutral-500">
                    Tell us when the transport is required so we can plan
                    accordingly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================== */}
      <section className="bg-black">
        <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 lg:px-12 lg:py-20">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">
                Transport & Delivery
              </p>

              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
                Need something transported?
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-7 text-white/80">
                Tell us what you need moved and where it needs to go. Our team
                will help you arrange the right transport solution.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-red-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-red-600"
              >
                Request Transport
                <ArrowRight size={16} />
              </a>

              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-white hover:text-black"
              >
                Contact CANA
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
