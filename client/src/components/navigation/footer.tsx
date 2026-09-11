import {
  ArrowUpRight,
  Mail,
  MapPin,
  Phone,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";

import { Link } from "react-router-dom";

import logo from "@/assets/logocanan.png";

function Footer() {
  const year = new Date().getFullYear();

  const whatsappNumber = "250789408367";

  const whatsappMessage =
    "Hello CANA Group, I would like to know more about your products and services.";

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    whatsappMessage,
  )}`;

  // Replace these values with CANA's verified profile URLs when available.
  // Environment variables keep the deployed links configurable without a code change.
  const socialLinks = [
    {
      label: "Facebook",
      href:
        import.meta.env.VITE_CANA_FACEBOOK_URL ||
        "https://www.facebook.com/Cana-paints",
      icon: FaFacebookF,
      hoverClass: "hover:border-white/60 hover:bg-white/10 hover:text-white",
    },
    {
      label: "Instagram",
      href:
        import.meta.env.VITE_CANA_INSTAGRAM_URL ||
        "https://www.instagram.com/Cana_paints/",
      icon: FaInstagram,
      hoverClass: "hover:border-[#E4405F]/60 hover:bg-[#E4405F]/15 hover:text-[#ff6d87]",
    },
    {
      label: "X",
      href:
        import.meta.env.VITE_CANA_X_URL ||
        "https://x.com/Cana_paints",
      icon: FaXTwitter,
      hoverClass: "hover:border-white/60 hover:bg-white/10 hover:text-white",
    },
    {
      label: "LinkedIn",
      href:
        import.meta.env.VITE_CANA_LINKEDIN_URL ||
        "https://www.linkedin.com/company/cana-paints/",
      icon: FaLinkedinIn,
      hoverClass: "hover:border-white/60 hover:bg-white/10 hover:text-white",
    },
    {
      label: "YouTube",
      href:
        import.meta.env.VITE_CANA_YOUTUBE_URL ||
        "https://www.youtube.com/@Cana_paints",
      icon: FaYoutube,
      hoverClass: "hover:border-[#FF0000]/60 hover:bg-[#FF0000]/15 hover:text-[#ff6b6b]",
    },
    {
      label: "WhatsApp",
      href: whatsappUrl,
      icon: FaWhatsapp,
      hoverClass: "hover:border-[#25D366]/60 hover:bg-[#25D366]/15 hover:text-[#25D366]",
    },
  ];

  return (
    <footer className="border-t border-neutral-900 bg-neutral-950 text-white">

      {/* =====================================================
          MAIN FOOTER
      ====================================================== */}

      <div className="mx-auto max-w-7xl px-6 py-12 sm:py-14 lg:px-8 lg:py-16">

        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_0.8fr_0.9fr_1.1fr] lg:gap-12">

          {/* =================================================
              BRAND
          ================================================== */}

          <div className="max-w-md">

            <Link
              to="/"
              className="group inline-flex items-center"
            >
              <img
                src={logo}
                alt="CANAN Business Group"
                className="h-14 w-auto object-contain transition-transform duration-300 group-hover:scale-[1.02] sm:h-16"
              />
            </Link>

            <div className="mt-6">

              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                CANAN BUSINESS GROUP
              </p>

              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Driven by Excellence.
              </h2>

            </div>

            <p className="mt-5 max-w-sm text-sm leading-7 text-neutral-400">
              Building lasting value through quality products,
              professional services and reliable solutions.
            </p>

            {/* Brand divisions */}

            <div className="mt-7 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium uppercase tracking-[0.14em] text-neutral-500">

              <Link
                to="/cana-paints"
                className="transition-colors hover:text-white"
              >
                CANA Paints
              </Link>

              <span className="h-3 w-px bg-neutral-800" />

              <Link
                to="/cana-services"
                className="transition-colors hover:text-white"
              >
                CANA Services
              </Link>

            </div>

          </div>

          {/* =================================================
              COMPANY
          ================================================== */}

          <FooterColumn title="Company">

            <FooterLink to="/">
              Home
            </FooterLink>

            <FooterLink to="/about">
              About Us
            </FooterLink>

            <FooterLink to="/team">
              Meet Our Team
            </FooterLink>

            <FooterLink to="/projects">
              Projects
            </FooterLink>

            <FooterLink to="/contact">
              Contact
            </FooterLink>

          </FooterColumn>

          {/* =================================================
              SOLUTIONS
          ================================================== */}

          <FooterColumn title="Solutions">

            <FooterLink to="/cana-paints">
              CANA Paints
            </FooterLink>

            <FooterLink to="/cana-paints/products">
              Paint Products
            </FooterLink>

            <FooterLink to="/cana-paints/painting-services">
              Painting Services
            </FooterLink>

            <FooterLink to="/cana-paints/estimate-cost">
              Cost Calculator
            </FooterLink>

            <FooterLink to="/cana-paints/request-quote">
              Request a Quote
            </FooterLink>

            <FooterLink to="/cana-services">
              CANA Services
            </FooterLink>

            <FooterLink to="/cana-services/scaffolds">
              Scaffold Solutions
            </FooterLink>

            <FooterLink to="/cana-services/transport">
              Transport
            </FooterLink>

          </FooterColumn>

          {/* =================================================
              CONTACT
          ================================================== */}

          <div>

            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
              Contact
            </p>

            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
              Let&apos;s work together.
            </h3>

            <p className="mt-3 max-w-xs text-sm leading-6 text-neutral-400">
              Have a project, business need or question?
              Our team is ready to help.
            </p>

            <div className="mt-7 space-y-4">

              <ContactItem
                icon={<MapPin size={17} />}
                text="Kigali, Rwanda"
              />

              <a
                href="tel:+250789408367"
                className="group flex items-start gap-4"
              >
                <span className="mt-0.5 text-neutral-400">
                  <Phone size={17} />
                </span>

                <span className="text-sm leading-6 text-neutral-400 transition-colors group-hover:text-white">
                  +250 789 408 367
            
                </span>
              </a>

              <a
                href="mailto:info@cana.rw"
                className="group flex items-start gap-4"
              >
                <span className="mt-0.5 text-neutral-400">
                  <Mail size={17} />
                </span>

                <span className="text-sm leading-6 text-neutral-400 transition-colors group-hover:text-white">
                  info@cana.rw
                </span>
              </a>

            </div>

            {/* =================================================
                SOCIAL
            ================================================== */}

            <div className="mt-7 border-t border-white/10 pt-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                Follow CANA
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-2.5">
                {socialLinks.map((social) => {
                  const Icon = social.icon;

                  return (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit CANA on ${social.label}`}
                      title={social.label}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-neutral-300 transition duration-200 ${social.hoverClass}`}
                    >
                      <Icon size={17} />
                    </a>
                  );
                })}
              </div>

              <p className="mt-3 text-xs leading-5 text-neutral-500">
                Follow product launches, project updates, and company news.
              </p>
            </div>

          </div>

        </div>

      </div>

      {/* =====================================================
          BOTTOM BAR
      ====================================================== */}

      <div className="border-t border-white/10">

        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-6 sm:flex-row sm:items-center sm:justify-between lg:px-8">

          <p className="text-xs text-neutral-500 sm:text-sm">
            © {year} CANAN Business Group Ltd. All rights reserved.
          </p>

          <p className="text-xs text-neutral-500 sm:text-sm">
            Kigali, Rwanda
          </p>

        </div>

      </div>

    </footer>
  );
}

/* =========================================================
   FOOTER COLUMN
========================================================= */

type FooterColumnProps = {
  title: string;
  children: React.ReactNode;
};

function FooterColumn({
  title,
  children,
}: FooterColumnProps) {
  return (
    <div>

      <h3 className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
        {title}
      </h3>

      <ul className="mt-6 space-y-3.5">
        {children}
      </ul>

    </div>
  );
}

/* =========================================================
   FOOTER LINK
========================================================= */

type FooterLinkProps = {
  to: string;
  children: React.ReactNode;
};

function FooterLink({
  to,
  children,
}: FooterLinkProps) {
  return (
    <li>

      <Link
        to={to}
        className="group inline-flex items-center gap-2 text-sm text-neutral-400 transition-all duration-300 hover:text-white"
      >

        <span
          className="
            h-px w-0
            bg-neutral-400
            transition-all duration-300
            group-hover:w-3
          "
        />

        <span>
          {children}
        </span>

      </Link>

    </li>
  );
}

/* =========================================================
   CONTACT ITEM
========================================================= */

type ContactItemProps = {
  icon: React.ReactNode;
  text: string;
};

function ContactItem({
  icon,
  text,
}: ContactItemProps) {
  return (
    <div className="flex items-start gap-4">

      <span className="mt-0.5 shrink-0 text-neutral-400">
        {icon}
      </span>

      <span className="text-sm leading-6 text-neutral-400">
        {text}
      </span>

    </div>
  );
}

export default Footer;
