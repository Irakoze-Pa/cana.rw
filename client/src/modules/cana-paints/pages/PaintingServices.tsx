import {
  ArrowRight,
  Check,
  Home,
  Paintbrush,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { Link } from "react-router-dom";

import heroImage from "@/assets/images/hero2.jpg";
import serviceImage from "@/assets/images/hero3.jpg";

function PaintingServices() {
  const whatsappNumber = "250789408367";

  const whatsappMessage = encodeURIComponent(
    "Hello CANA Paints, I am interested in your painting services. I would like to discuss my project and request a quotation."
  );

  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${whatsappMessage}`;

  return (
    <main className="bg-white text-black">

      {/* =========================================================
          HERO
      ========================================================== */}
      <section className="relative min-h-[78vh] overflow-hidden">

        <img
          src={heroImage}
          alt="Professional painting services by CANA Paints"
          className="
            absolute
            inset-0
            h-full
            w-full
            object-cover
          "
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-black/55" />

        {/* Content */}
        <div
          className="
            relative
            z-10
            mx-auto
            flex
            min-h-[78vh]
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
                CANA Paints
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
              Professional
              <span className="block text-white/50">
                painting services.
              </span>
            </h1>

            {/* Description */}
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
              Transforming residential, commercial and industrial
              spaces with quality paints, professional application
              and carefully finished surfaces.
            </p>

            {/* Actions */}
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">

              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  bg-red-600
                  px-6
                  py-3.5
                  text-sm
                  font-semibold
                  text-white
                  transition-all
                  duration-300
                  hover:bg-white
                  hover:text-black
                "
              >
                Request a Quote
                <ArrowRight size={16} />
              </a>

              <Link
                to="/cana-paints/products"
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-full
                  border
                  border-white/30
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
                Explore Our Paints
              </Link>

            </div>

          </div>
        </div>

      </section>

      {/* =========================================================
          INTRO
      ========================================================== */}
      <section className="py-20 lg:py-28">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-24">

            {/* Left */}
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
                Our Expertise
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
                More than a coat
                <span className="block text-gray-400">
                  of paint.
                </span>
              </h2>

            </div>

            {/* Right */}
            <div>

              <p
                className="
                  text-lg
                  leading-8
                  text-gray-600
                "
              >
                At CANA Paints, we combine quality paint products
                with professional application to deliver surfaces
                that look better, perform better and last longer.
              </p>

              <p
                className="
                  mt-6
                  text-base
                  leading-7
                  text-gray-500
                "
              >
                From a single room to an entire commercial property,
                our team approaches every project with attention to
                preparation, application, finishing and detail.
              </p>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          SERVICES
      ========================================================== */}
      <section className="bg-[#f7f7f7] py-20 lg:py-28">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          {/* Header */}
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
              What We Do
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
              Painting solutions
              <span className="text-gray-400">
                {" "}for every space.
              </span>
            </h2>

          </div>

          {/* Services */}
          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">

            {/* Residential */}
            <ServiceCard
              number="01"
              icon={<Home size={20} />}
              title="Residential"
              description="Interior and exterior painting for homes, apartments and residential properties."
            />

            {/* Commercial */}
            <ServiceCard
              number="02"
              icon={<Sparkles size={20} />}
              title="Commercial"
              description="Professional finishes for offices, retail spaces, hotels and commercial properties."
            />

            {/* Interior */}
            <ServiceCard
              number="03"
              icon={<Paintbrush size={20} />}
              title="Interior Finishes"
              description="Carefully applied finishes designed to improve the appearance and feel of interior spaces."
            />

            {/* Exterior */}
            <ServiceCard
              number="04"
              icon={<ShieldCheck size={20} />}
              title="Exterior Painting"
              description="Durable exterior finishes designed to protect surfaces while improving appearance."
            />

          </div>

        </div>

      </section>

      {/* =========================================================
          PROCESS
      ========================================================== */}
      <section className="py-20 lg:py-28">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div className="grid gap-14 lg:grid-cols-2 lg:gap-20">

            {/* Image */}
            <div className="overflow-hidden rounded-2xl">

              <img
                src={serviceImage}
                alt="CANA professional painting project"
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

            {/* Content */}
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
                Our Process
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
                A better process
                <span className="block text-gray-400">
                  creates a better finish.
                </span>
              </h2>

              <p
                className="
                  mt-6
                  text-base
                  leading-7
                  text-gray-500
                "
              >
                We don't rush the details. Every project follows
                a structured process designed to deliver consistent,
                professional results.
              </p>

              {/* Steps */}
              <div className="mt-9 space-y-6">

                <ProcessStep
                  number="01"
                  title="Project Assessment"
                  description="We understand your space, surfaces, colours, scope and project requirements."
                />

                <ProcessStep
                  number="02"
                  title="Surface Preparation"
                  description="Proper preparation helps create a smooth, clean and durable finished surface."
                />

                <ProcessStep
                  number="03"
                  title="Professional Application"
                  description="Our team applies the selected coating using appropriate techniques and equipment."
                />

                <ProcessStep
                  number="04"
                  title="Final Inspection"
                  description="We review the finished work and ensure the project meets the agreed expectations."
                />

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          QUALITY SECTION
      ========================================================== */}
      <section className="bg-black py-20 text-white lg:py-24">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">

            {/* Left */}
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
                <ShieldCheck size={21} />
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
                Quality First
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
                Finishes designed
                <span className="block text-white/40">
                  to make a difference.
                </span>
              </h2>

            </div>

            {/* Right */}
            <div>

              <p
                className="
                  max-w-2xl
                  text-lg
                  leading-8
                  text-white/60
                "
              >
                The quality of a painting project depends on more
                than the colour selected. Surface preparation,
                product selection, application technique and
                attention to detail all contribute to the final result.
              </p>

              <div className="mt-10 grid gap-6 sm:grid-cols-2">

                <QualityItem
                  title="Quality Products"
                  description="Professional paint solutions selected for the requirements of each surface."
                />

                <QualityItem
                  title="Experienced Application"
                  description="Careful application focused on consistency, coverage and clean finishing."
                />

                <QualityItem
                  title="Attention to Detail"
                  description="We take care of preparation, edges, surfaces and finishing details."
                />

                <QualityItem
                  title="Professional Results"
                  description="A finished space that looks clean, refined and ready to use."
                />

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          PAINT + SERVICE
      ========================================================== */}
      <section className="py-20 lg:py-28">

        <div className="mx-auto max-w-7xl px-5 lg:px-8">

          <div
            className="
              overflow-hidden
              rounded-3xl
              bg-[#f7f7f7]
            "
          >

            <div className="grid lg:grid-cols-2">

              {/* Content */}
              <div className="p-8 sm:p-12 lg:p-16">

                <p
                  className="
                    text-xs
                    font-semibold
                    uppercase
                    tracking-[0.22em]
                    text-red-600
                  "
                >
                  CANA Paints
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
                  The paint
                  <span className="block text-gray-400">
                    and the expertise.
                  </span>
                </h2>

                <p
                  className="
                    mt-6
                    text-base
                    leading-7
                    text-gray-500
                  "
                >
                  With CANA Paints, you can combine quality paint
                  products with professional application through
                  one trusted team.
                </p>

                <ul className="mt-8 space-y-4">

                  {[
                    "Quality CANA paint products",
                    "Professional painting application",
                    "Colour and finish guidance",
                    "Residential and commercial projects",
                  ].map((item) => (
                    <li
                      key={item}
                      className="flex items-center gap-3"
                    >
                      <span
                        className="
                          flex
                          h-6
                          w-6
                          shrink-0
                          items-center
                          justify-center
                          rounded-full
                          bg-red-600
                          text-white
                        "
                      >
                        <Check size={14} />
                      </span>

                      <span className="text-sm font-medium text-gray-700">
                        {item}
                      </span>
                    </li>
                  ))}

                </ul>

                <Link
                  to="/cana-paints/products"
                  className="
                    mt-9
                    inline-flex
                    items-center
                    gap-2
                    rounded-full
                    bg-black
                    px-6
                    py-3.5
                    text-sm
                    font-semibold
                    text-white
                    transition-all
                    duration-300
                    hover:bg-red-600
                  "
                >
                  Explore Paint Products
                  <ArrowRight size={16} />
                </Link>

              </div>

              {/* Visual */}
              <div className="relative min-h-[360px] lg:min-h-full">

                <img
                  src={heroImage}
                  alt="CANA Paints professional finish"
                  className="
                    absolute
                    inset-0
                    h-full
                    w-full
                    object-cover
                  "
                />

                <div className="absolute inset-0 bg-black/20" />

                <div
                  className="
                    absolute
                    bottom-7
                    left-7
                    rounded-xl
                    border
                    border-white/20
                    bg-black/70
                    px-5
                    py-4
                    backdrop-blur-md
                  "
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
                    CANA Paints
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    Quality That Shows.
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =========================================================
          CTA
      ========================================================== */}
      <section className="py-20 lg:py-28">

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
            Start Your Project
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
            Ready to transform
            <span className="block text-gray-400">
              your space?
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
            Tell us about your project, and our team will help you
            plan the right painting solution.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">

            <a
              href={whatsappLink}
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
              Request a Quote
              <ArrowRight size={16} />
            </a>

            <Link
              to="/contact"
              className="
                inline-flex
                items-center
                justify-center
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
              Contact CANA
            </Link>

          </div>

        </div>

      </section>

    </main>
  );
}

/* =============================================================
   SERVICE CARD
============================================================= */

type ServiceCardProps = {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
};

function ServiceCard({
  number,
  icon,
  title,
  description,
}: ServiceCardProps) {
  return (
    <div
      className="
        group
        rounded-2xl
        border
        border-black/[0.06]
        bg-white
        p-7
        transition-all
        duration-300
        hover:-translate-y-1
        hover:shadow-xl
      "
    >
      <div
        className="
          flex
          h-11
          w-11
          items-center
          justify-center
          rounded-xl
          bg-black
          text-white
          transition-colors
          duration-300
          group-hover:bg-red-600
        "
      >
        {icon}
      </div>

      <p className="mt-8 text-xs font-semibold text-gray-400">
        {number}
      </p>

      <h3 className="mt-2 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-4 text-sm leading-6 text-gray-500">
        {description}
      </p>

    </div>
  );
}

/* =============================================================
   PROCESS STEP
============================================================= */

type ProcessStepProps = {
  number: string;
  title: string;
  description: string;
};

function ProcessStep({
  number,
  title,
  description,
}: ProcessStepProps) {
  return (
    <div className="flex gap-5">

      <span
        className="
          w-8
          shrink-0
          pt-0.5
          text-xs
          font-semibold
          text-gray-400
        "
      >
        {number}
      </span>

      <div>

        <h3 className="text-sm font-semibold">
          {title}
        </h3>

        <p className="mt-1.5 text-sm leading-6 text-gray-500">
          {description}
        </p>

      </div>

    </div>
  );
}

/* =============================================================
   QUALITY ITEM
============================================================= */

type QualityItemProps = {
  title: string;
  description: string;
};

function QualityItem({
  title,
  description,
}: QualityItemProps) {
  return (
    <div className="border-l border-white/15 pl-5">

      <h3 className="text-sm font-semibold text-white">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-white/45">
        {description}
      </p>

    </div>
  );
}

export default PaintingServices;
