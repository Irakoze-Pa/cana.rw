import {
  Award,
  Factory,
  Headphones,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";

const reasons = [
  {
    number: "01",
    icon: <Factory size={20} strokeWidth={1.8} />,
    title: "Quality Manufacturing",
    description:
      "CANA Paints delivers quality paint solutions engineered for beautiful, durable and reliable finishes.",
  },
  {
    number: "02",
    icon: <ShieldCheck size={20} strokeWidth={1.8} />,
    title: "Trusted Quality",
    description:
      "We focus on dependable products and professional services that consistently meet customer expectations.",
  },
  {
    number: "03",
    icon: <Award size={20} strokeWidth={1.8} />,
    title: "Professional Experience",
    description:
      "Our teams bring practical expertise across painting, construction support and related business solutions.",
  },
  {
    number: "04",
    icon: <Headphones size={20} strokeWidth={1.8} />,
    title: "Customer Focus",
    description:
      "We work closely with our clients to understand their needs and provide practical solutions for every project.",
  },
];

function WhyChoose() {
  return (
    <section className="relative overflow-hidden border-y border-black bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">

        {/* =====================================================
            HEADER
        ====================================================== */}
        <div className="grid gap-10 lg:grid-cols-[1fr_0.8fr] lg:items-end">

          {/* Heading */}
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-10 bg-red-700" />

              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
                Why Choose CANA
              </span>
            </div>

            <h2 className="mt-7 max-w-4xl text-4xl font-semibold leading-[1.05] tracking-[-0.04em] text-black sm:text-5xl lg:text-6xl">
              Built on quality.
              <br />

              <span className="text-gray-400">
                Driven by excellence.
              </span>
            </h2>
          </div>

          {/* Intro */}
          <div className="lg:pb-1">
            <p className="max-w-xl text-base leading-8 text-gray-600">
              From manufacturing to professional services, CANA Group
              combines quality, experience and customer-focused thinking
              to deliver solutions people can rely on.
            </p>
          </div>
        </div>

        {/* =====================================================
            REASONS
        ====================================================== */}
        <div className="mt-12 border-y border-black">

          {reasons.map((item) => (
            <div
              key={item.number}
              className="group grid gap-5 border-b border-gray-200 py-6 last:border-b-0 md:grid-cols-[70px_1fr_1.5fr] md:items-center md:gap-8"
            >

              {/* Number */}
              <div>
                <span className="text-xs font-semibold tracking-[0.2em] text-red-700 transition-colors duration-300 group-hover:text-black">
                  {item.number}
                </span>
              </div>

              {/* Title */}
              <div className="flex items-center gap-4">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white shadow-sm transition-all duration-300 group-hover:bg-red-700">
                  {item.icon}
                </div>

                <h3 className="text-lg font-semibold tracking-tight text-black sm:text-xl">
                  {item.title}
                </h3>

              </div>

              {/* Description */}
              <div className="flex items-center justify-between gap-8">

                <p className="max-w-xl text-sm leading-7 text-gray-600 sm:text-base">
                  {item.description}
                </p>

                <div className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black text-black transition-all duration-300 group-hover:border-red-700 group-hover:bg-red-700 group-hover:text-white md:flex">
                  <ArrowUpRight
                    size={15}
                    strokeWidth={2}
                  />
                </div>

              </div>

            </div>
          ))}

        </div>

        {/* =====================================================
            BOTTOM STATEMENT
        ====================================================== */}
        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

          <p className="max-w-xl text-sm leading-7 text-gray-500">
            Every project is an opportunity to deliver better quality,
            stronger relationships and lasting value.
          </p>

          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-red-600" />

            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-black">
              CANA GROUP
            </span>
          </div>

        </div>

      </div>
    </section>
  );
}

export default WhyChoose;
