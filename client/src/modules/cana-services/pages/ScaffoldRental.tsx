import {
  ArrowRight,
  Check,
  HardHat,
  Package,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";

import heroImage from "@/assets/images/heroscaf1.jpg";
import scaffoldImage from "@/assets/images/heroscaf2.jpg";

function ScaffoldRental() {
  const whatsappNumber = "250789408367";

  const buyMessage = encodeURIComponent(
    "Hello CANA Services, I am interested in buying scaffolding. I would like to get information about available scaffolding equipment and pricing."
  );

  const hireMessage = encodeURIComponent(
    "Hello CANA Services, I am interested in hiring scaffolding. I would like to discuss my project and scaffolding requirements."
  );

  const buyLink = `https://wa.me/${whatsappNumber}?text=${buyMessage}`;
  const hireLink = `https://wa.me/${whatsappNumber}?text=${hireMessage}`;

  return (
    <main className="bg-white text-black">

      {/* =========================================================
          HERO
      ========================================================== */}
      <section className="relative min-h-[64vh] overflow-hidden">

        <img
          src={heroImage}
          alt="CANA scaffolding solutions"
          className="
            absolute
            inset-0
            h-full
            w-full
            object-cover
          "
        />

        <div className="absolute inset-0 bg-black/60" />

        <div
          className="
            relative
            z-10
            mx-auto
            flex
            min-h-[64vh]
            max-w-7xl
            items-end
            px-5
            pb-16
            lg:px-8
            lg:pb-20
          "
        >
          <div className="max-w-4xl">

            {/* Eyebrow */}
            <div className="mb-6 flex items-center gap-3">

              <span className="h-px w-10 bg-red-600" />

              <span
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.22em]
                  text-white/75
                "
              >
                CANA Services
              </span>

            </div>

            {/* Heading */}
            <h1
              className="
                text-4xl
                font-semibold
                leading-[1.02]
                tracking-[-0.05em]
                text-white
                sm:text-5xl
                lg:text-7xl
              "
            >
              Scaffolding
              <span className="block text-white/50">
                for sale & hire.
              </span>
            </h1>

            <p
              className="
                mt-7
                max-w-2xl
                text-base
                leading-7
                text-white/75
                sm:text-lg
              "
            >
              Quality scaffolding solutions for construction,
              painting, renovation and maintenance projects.
              Buy what you need or hire for the duration of your project.
            </p>

            {/* Hero Actions */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">

              {/* BUY */}
              <a
                href={buyLink}
                target="_blank"
                rel="noreferrer"
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-white
                  px-6
                  py-3.5
                  text-sm
                  font-semibold
                  text-black
                  transition-all
                  duration-300
                  hover:bg-red-700
                  hover:text-white
                "
              >
                Buy Scaffolding
                <ShoppingCart size={16} />
              </a>

              {/* HIRE */}
              <a
                href={hireLink}
                target="_blank"
                rel="noreferrer"
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-white/35
                  px-6
                  py-3.5
                  text-sm
                  font-semibold
                  text-white
                  transition-all
                  duration-300
                  hover:border-white
                  hover:bg-white
                  hover:text-black
                "
              >
                Hire Scaffolding
                <ArrowRight size={16} />
              </a>

            </div>

          </div>
        </div>
      </section>

      {/* =========================================================
          INTRO
      ========================================================== */}
      <section className="py-16 lg:py-20">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">

            <div>

              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.22em]
                  text-red-600
                "
              >
                Scaffolding Solutions
              </p>

              <h2
                className="
                  mt-5
                  text-3xl
                  font-semibold
                  leading-tight
                  tracking-[-0.04em]
                  sm:text-4xl
                "
              >
                Built for the work.
                <span className="block text-gray-400">
                  Available when you need it.
                </span>
              </h2>

            </div>

            <div>

              <p className="text-lg leading-8 text-gray-600">
                CANA Services provides scaffolding solutions for
                businesses, contractors and individual projects.
                Our scaffolding is available for both sale and hire.
              </p>

              <p className="mt-6 text-base leading-7 text-gray-500">
                Whether you need scaffolding as a long-term investment
                or temporary access equipment for a specific project,
                we can help you find a practical solution based on
                your requirements.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          SALE / HIRE
      ========================================================== */}
      <section className="border-y border-black bg-white py-16 lg:py-20">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div className="max-w-2xl">

            <p
              className="
                text-xs
                font-semibold
                uppercase
                tracking-[0.22em]
                text-red-600
              "
            >
              Choose Your Solution
            </p>

            <h2
              className="
                mt-4
                text-3xl
                font-semibold
                tracking-[-0.04em]
                sm:text-4xl
              "
            >
              Buy or hire.
              <span className="text-gray-400">
                {" "}You choose.
              </span>
            </h2>

          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2">

            {/* ===================================================
                SALE
            ==================================================== */}
            <div
              className="
                rounded-2xl
                bg-black
                p-8
                text-white
                sm:p-10
              "
            >

              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-red-600
                "
              >
                <ShoppingCart size={21} />
              </div>

              <p className="mt-8 text-xs font-semibold text-white/40">
                01
              </p>

              <h3 className="mt-2 text-2xl font-semibold">
                Scaffold Sales
              </h3>

              <p className="mt-5 max-w-md text-sm leading-7 text-white/55">
                Purchase scaffolding for your construction business,
                projects or long-term equipment needs.
              </p>

              <div className="mt-7 space-y-3">

                {[
                  "Long-term investment",
                  "Suitable for contractors",
                  "Build your own equipment stock",
                  "Available in different requirements",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10">
                      <Check size={12} />
                    </span>

                    <span className="text-sm text-white/70">
                      {item}
                    </span>
                  </div>
                ))}

              </div>

              <a
                href={buyLink}
                target="_blank"
                rel="noreferrer"
                className="
                  mt-9
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-white
                  px-6
                  py-3
                  text-sm
                  font-semibold
                  text-black
                  transition-all
                  duration-300
                  hover:bg-red-600
                  hover:text-white
                "
              >
                Ask About Buying
                <ArrowRight size={15} />
              </a>

            </div>

            {/* ===================================================
                HIRE
            ==================================================== */}
            <div
              className="
                rounded-2xl
                border
                border-black/[0.08]
                bg-white
                p-8
                sm:p-10
              "
            >

              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-black
                  text-white
                "
              >
                <Package size={21} />
              </div>

              <p className="mt-8 text-xs font-semibold text-gray-400">
                02
              </p>

              <h3 className="mt-2 text-2xl font-semibold">
                Scaffold Hire
              </h3>

              <p className="mt-5 max-w-md text-sm leading-7 text-gray-500">
                Hire scaffolding for short-term or long-term projects
                without the need to purchase the equipment.
              </p>

              <div className="mt-7 space-y-3">

                {[
                  "Flexible rental periods",
                  "Ideal for construction projects",
                  "Suitable for painting work",
                  "Cost-effective project access",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3"
                  >
                    <span
                      className="
                        flex
                        h-5
                        w-5
                        items-center
                        justify-center
                        rounded-full
                        bg-red-600
                        text-white
                      "
                    >
                      <Check size={12} />
                    </span>

                    <span className="text-sm text-gray-600">
                      {item}
                    </span>
                  </div>
                ))}

              </div>

              <a
                href={hireLink}
                target="_blank"
                rel="noreferrer"
                className="
                  mt-9
                  inline-flex
                  items-center
                  gap-2
                  rounded-full
                  bg-red-600
                  px-6
                  py-3
                  text-sm
                  font-semibold
                  text-white
                  transition-all
                  duration-300
                  hover:bg-black
                "
              >
                Ask About Hiring
                <ArrowRight size={15} />
              </a>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          EQUIPMENT / PROJECTS
      ========================================================== */}
      <section className="py-16 lg:py-20">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">

            {/* IMAGE */}
            <div className="overflow-hidden rounded-2xl">

              <img
                src={scaffoldImage}
                alt="CANA scaffolding equipment"
                className="
                  aspect-[4/3]
                  h-full
                  w-full
                  object-cover
                  transition-transform
                  duration-700
                  hover:scale-105
                "
              />

            </div>

            {/* CONTENT */}
            <div>

              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.22em]
                  text-red-600
                "
              >
                Built Around Your Project
              </p>

              <h2
                className="
                  mt-4
                  text-3xl
                  font-semibold
                  leading-tight
                  tracking-[-0.04em]
                  sm:text-4xl
                "
              >
                One solution.
                <span className="block text-gray-400">
                  Different applications.
                </span>
              </h2>

              <p className="mt-6 text-base leading-7 text-gray-500">
                Our scaffolding solutions can support a wide range
                of construction, maintenance, renovation and painting
                activities.
              </p>

              <div className="mt-8 space-y-5">

                {/* Construction */}
                <div className="flex gap-4">

                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-gray-100
                    "
                  >
                    <HardHat size={18} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">
                      Construction
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Access solutions for building and structural work.
                    </p>
                  </div>

                </div>

                {/* Painting */}
                <div className="flex gap-4">

                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-gray-100
                    "
                  >
                    <RulerIcon />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">
                      Painting & Finishing
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Practical access for interior and exterior work.
                    </p>
                  </div>

                </div>

                {/* Maintenance */}
                <div className="flex gap-4">

                  <div
                    className="
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-gray-100
                    "
                  >
                    <ShieldCheck size={18} />
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold">
                      Maintenance
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-gray-500">
                      Reliable access for repair and maintenance work.
                    </p>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          WHY CANA
      ========================================================== */}
      <section className="border-y border-black bg-white py-16 lg:py-20">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">

            <div>

              <p
                className="
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.22em]
                  text-red-600
                "
              >
                Why CANA
              </p>

              <h2
                className="
                  mt-4
                  text-3xl
                  font-semibold
                  tracking-[-0.04em]
                  sm:text-4xl
                "
              >
                Equipment.
                <span className="block text-gray-400">
                  Service. Reliability.
                </span>
              </h2>

            </div>

            <div className="divide-y divide-black/10">

              <Feature
                number="01"
                title="Quality Equipment"
                description="Scaffolding solutions selected with project performance and reliability in mind."
              />

              <Feature
                number="02"
                title="Flexible Options"
                description="Buy for long-term use or hire for the duration of your project."
              />

              <Feature
                number="03"
                title="Professional Support"
                description="Clear communication and practical support from enquiry to completion."
              />

              <Feature
                number="04"
                title="Project Focused"
                description="Solutions designed around your project requirements, quantity and duration."
              />

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          DELIVERY / SUPPORT
      ========================================================== */}
      <section className="bg-black py-16 text-white lg:py-20">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">

            <div>

              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-red-600
                "
              >
                <Truck size={21} />
              </div>

              <p
                className="
                  mt-6
                  text-xs
                  font-semibold
                  uppercase
                  tracking-[0.22em]
                  text-red-500
                "
              >
                Project Support
              </p>

              <h2
                className="
                  mt-4
                  text-3xl
                  font-semibold
                  tracking-[-0.04em]
                  sm:text-4xl
                "
              >
                Tell us what
                <span className="block text-white/40">
                  your project needs.
                </span>
              </h2>

            </div>

            <div>

              <p className="text-lg leading-8 text-white/60">
                Let us know what you are working on, how much
                scaffolding you need and whether you want to buy
                or hire. Our team can help you determine the next step.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">

                <a
                  href={buyLink}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    bg-white
                    px-6
                    py-3.5
                    text-sm
                    font-semibold
                    text-black
                    transition-all
                    duration-300
                    hover:bg-red-600
                    hover:text-white
                  "
                >
                  Buy Scaffolding
                  <ShoppingCart size={15} />
                </a>

                <a
                  href={hireLink}
                  target="_blank"
                  rel="noreferrer"
                  className="
                    inline-flex
                    items-center
                    justify-center
                    gap-2
                    rounded-full
                    border
                    border-white/25
                    px-6
                    py-3.5
                    text-sm
                    font-semibold
                    text-white
                    transition-all
                    duration-300
                    hover:border-white
                    hover:bg-white
                    hover:text-black
                  "
                >
                  Hire Scaffolding
                  <ArrowRight size={15} />
                </a>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================== */}
      <section className="py-16 lg:py-20">

        <div className="mx-auto max-w-5xl px-5 text-center lg:px-8">

          <p
            className="
              text-xs
              font-semibold
              uppercase
              tracking-[0.22em]
              text-red-600
            "
          >
            CANA Services
          </p>

          <h2
            className="
              mx-auto
              mt-5
              max-w-3xl
              text-3xl
              font-semibold
              leading-tight
              tracking-[-0.04em]
              sm:text-5xl
            "
          >
            Need scaffolding?
            <span className="block text-gray-400">
              Buy it or hire it.
            </span>
          </h2>

          <p
            className="
              mx-auto
              mt-6
              max-w-2xl
              text-base
              leading-7
              text-gray-500
            "
          >
            Contact CANA Services today and tell us what your
            project requires.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

            <a
              href={buyLink}
              target="_blank"
              rel="noreferrer"
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-full
                bg-red-600
                px-7
                py-3.5
                text-sm
                font-semibold
                text-white
                transition-all
                duration-300
                hover:bg-black
              "
            >
              Buy Scaffolding
              <ShoppingCart size={16} />
            </a>

            <a
              href={hireLink}
              target="_blank"
              rel="noreferrer"
              className="
                inline-flex
                items-center
                justify-center
                gap-2
                rounded-full
                border
                border-black
                px-7
                py-3.5
                text-sm
                font-semibold
                text-black
                transition-all
                duration-300
                hover:bg-black
                hover:text-white
              "
            >
              Hire Scaffolding
              <ArrowRight size={16} />
            </a>

          </div>

        </div>

      </section>

    </main>
  );
}

/* =============================================================
   FEATURE
============================================================= */

type FeatureProps = {
  number: string;
  title: string;
  description: string;
};

function Feature({
  number,
  title,
  description,
}: FeatureProps) {
  return (
    <div className="flex gap-5 py-6">

      <span className="w-8 shrink-0 text-xs font-semibold text-gray-400">
        {number}
      </span>

      <div>
        <h3 className="text-base font-semibold">
          {title}
        </h3>

        <p className="mt-2 max-w-xl text-sm leading-6 text-gray-500">
          {description}
        </p>
      </div>

    </div>
  );
}

/* =============================================================
   SIMPLE ICON
============================================================= */

function RulerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21.3 8.7 8.7 21.3a2.4 2.4 0 0 1-3.4 0l-2.6-2.6a2.4 2.4 0 0 1 0-3.4L15.3 2.7a2.4 2.4 0 0 1 3.4 0l2.6 2.6a2.4 2.4 0 0 1 0 3.4Z" />
      <path d="m14 6 4 4" />
      <path d="m11 9 2 2" />
      <path d="m8 12 2 2" />
      <path d="m5 15 2 2" />
    </svg>
  );
}

export default ScaffoldRental;
