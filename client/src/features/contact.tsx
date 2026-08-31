import {
  ArrowRight,
  Clock3,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
} from "lucide-react";

import { useState } from "react";
import type { FormEvent, ChangeEvent } from "react";
import api from "@/services/api";

interface ContactFormData {
  name: string;
  phone: string;
  email: string;
  service: string;
  message: string;
}

const initialFormData: ContactFormData = {
  name: "",
  phone: "",
  email: "",
  service: "",
  message: "",
};

export default function Contact() {
  const [formData, setFormData] =
    useState<ContactFormData>(initialFormData);

  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /*
   * =========================================================
   * CANA GROUP CONTACT DETAILS
   * =========================================================
   */

  const phoneNumber = "+250789408367";

  const whatsappUrl =
    "https://wa.me/250789408367";

  const emailAddress = "info@cbg.rw";

  /*
   * =========================================================
   * GOOGLE MAPS
   * =========================================================
   *
   * Using the exact location:
   * Remera, Kwa Rwahama, Kigali, Rwanda
   */

  const googleMapsUrl =
    "https://www.google.com/maps/search/?api=1&query=Remera%20Kwa%20Rwahama%2C%20Kigali%2C%20Rwanda";

  const googleMapsEmbed =
    "https://www.google.com/maps?q=Remera%20Kwa%20Rwahama%2C%20Kigali%2C%20Rwanda&output=embed";

  /*
   * =========================================================
   * FORM HANDLERS
   * =========================================================
   */

  const handleChange = (
    event: ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setIsSubmitting(true);
    setSubmitted(false);

    try {
      await api.post("/contact", formData);
      setSubmitted(true);
      setFormData(initialFormData);
      window.setTimeout(() => setSubmitted(false), 5000);
    } catch (error) {
      console.error("Contact enquiry error:", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "We could not send your message. Please try again or contact us directly.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="bg-white text-slate-950">

      {/* =====================================================
          HERO
      ====================================================== */}

      <section className="border-b border-slate-200">

        <div className="mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">

          <div className="max-w-4xl">

            <div className="mb-7 flex items-center gap-3">

              <span className="h-px w-10 bg-red-600" />

              <span className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                Contact
              </span>

            </div>

            <h1 className="text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Let&apos;s talk.
              <span className="block text-slate-400">
                Let&apos;s build.
              </span>
            </h1>

            <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-600">
              Have a project, business requirement, or
              question? Get in touch with the CANA team.
            </p>

          </div>

        </div>

      </section>

      {/* =====================================================
          CONTACT AREA
      ====================================================== */}

      <section className="py-20 lg:py-28">

        <div className="mx-auto grid max-w-7xl gap-16 px-6 lg:grid-cols-[0.75fr_1.25fr] lg:px-8">

          {/* =================================================
              CONTACT INFORMATION
          ================================================== */}

          <div>

            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
              Get In Touch
            </p>

            <h2 className="mt-5 text-3xl font-semibold tracking-tight">
              We&apos;re here to help.
            </h2>

            <p className="mt-5 max-w-md leading-7 text-slate-500">
              Reach out directly or send us a message.
              We&apos;ll be happy to discuss your needs.
            </p>

            <div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">

              {/* PHONE */}

              <a
                href={`tel:${phoneNumber}`}
                className="group flex items-center gap-5 py-5"
              >

                <Phone
                  size={20}
                  strokeWidth={1.7}
                  className="text-slate-950"
                />

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Phone
                  </p>

                  <p className="mt-1 text-sm font-semibold transition-colors group-hover:text-red-600">
                    +250 789 408 367
                  </p>

                </div>

              </a>

              {/* WHATSAPP */}

              <a
                href={whatsappUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex items-center gap-5 py-5"
              >

                <MessageCircle
                  size={20}
                  strokeWidth={1.7}
                  className="text-slate-950"
                />

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    WhatsApp
                  </p>

                  <p className="mt-1 text-sm font-semibold transition-colors group-hover:text-red-600">
                    Start a conversation
                  </p>

                </div>

              </a>

              {/* EMAIL */}

              <a
                href={`mailto:${emailAddress}`}
                className="group flex items-center gap-5 py-5"
              >

                <Mail
                  size={20}
                  strokeWidth={1.7}
                  className="text-slate-950"
                />

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Email
                  </p>

                  <p className="mt-1 text-sm font-semibold transition-colors group-hover:text-red-600">
                    {emailAddress}
                  </p>

                </div>

              </a>

              {/* LOCATION */}

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="group flex items-start gap-5 py-5"
              >

                <MapPin
                  size={20}
                  strokeWidth={1.7}
                  className="mt-0.5 shrink-0 text-slate-950"
                />

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Location
                  </p>

                  <p className="mt-1 text-sm font-semibold transition-colors group-hover:text-red-600">
                    Remera, Kwa Rwahama
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Kigali, Rwanda
                  </p>

                </div>

              </a>

              {/* BUSINESS HOURS */}

              <div className="flex items-start gap-5 py-5">

                <Clock3
                  size={20}
                  strokeWidth={1.7}
                  className="mt-0.5 text-slate-950"
                />

                <div>

                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Business Hours
                  </p>

                  <p className="mt-1 text-sm font-semibold">
                    Monday – saturday
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    7:00 AM – 6:00 PM
                  </p>

                </div>

              </div>

            </div>

            {/* LOCATION SHORTCUT */}

            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:text-red-600"
            >
              View our location on Google Maps
              <ArrowRight size={16} />
            </a>

          </div>

          {/* =================================================
              CONTACT FORM
          ================================================== */}

          <div className="rounded-2xl border border-slate-200 p-7 sm:p-9 lg:p-10">

            <div className="border-b border-slate-200 pb-6">

              <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Send an Inquiry
              </p>

              <h2 className="mt-3 text-2xl font-semibold">
                Tell us what you need.
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                Complete the form and our team will get back
                to you.
              </p>

            </div>

            {/* SUCCESS MESSAGE */}

            {submitted && (
              <div className="mt-6 border-l-2 border-green-600 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Thank you. Your message has been received.
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              className="mt-7 space-y-6"
            >

              {/* NAME */}

              <div>

                <label
                  htmlFor="name"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Full Name
                </label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Your full name"
                  className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-0"
                />

              </div>

              {/* PHONE + EMAIL */}

              <div className="grid gap-6 sm:grid-cols-2">

                <div>

                  <label
                    htmlFor="phone"
                    className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    Phone
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+250..."
                    className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-0"
                  />

                </div>

                <div>

                  <label
                    htmlFor="email"
                    className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                  >
                    Email
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-0"
                  />

                </div>

              </div>

              {/* SERVICE */}

              <div>

                <label
                  htmlFor="service"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Service
                </label>

                <select
                  id="service"
                  name="service"
                  required
                  value={formData.service}
                  onChange={handleChange}
                  className="w-full border-0 border-b border-slate-300 bg-white px-0 py-3 text-sm outline-none transition focus:border-slate-950 focus:ring-0"
                >

                  <option value="">
                    Select a service
                  </option>

                  <option value="CANA Paints">
                    CANA Paints
                  </option>

                  <option value="Painting & Finishing">
                    Painting & Finishing
                  </option>

                  <option value="Digital Marketing">
                    Digital Marketing
                  </option>

                  <option value="Branding & Graphic Design">
                    Branding & Graphic Design
                  </option>

                  <option value="Web & Software Development">
                    Web & Software Development
                  </option>

                  <option value="Business Services">
                    Business Services
                  </option>

                  <option value="Scaffold Rental">
                    Scaffold Rental
                  </option>

                  <option value="Transport">
                    Transport
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>

              {/* MESSAGE */}

              <div>

                <label
                  htmlFor="message"
                  className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-500"
                >
                  Message
                </label>

                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Tell us about your project..."
                  className="w-full resize-none border-0 border-b border-slate-300 bg-transparent px-0 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-950 focus:ring-0"
                />

              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {isSubmitting
                  ? "Sending..."
                  : "Send Message"}

                {!isSubmitting && (
                  <Send size={16} />
                )}

              </button>

            </form>

          </div>

        </div>

      </section>

      {/* =====================================================
          LOCATION MAP
      ====================================================== */}

      <section className="border-y border-slate-200 bg-slate-50/60 py-20 lg:py-24">

        <div className="mx-auto max-w-7xl px-6 lg:px-8">

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">

            <div className="grid md:grid-cols-[0.8fr_1.2fr]">

              {/* LOCATION CONTENT */}

              <div className="flex flex-col justify-center p-8 sm:p-10 lg:p-12">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                  <MapPin
                    size={20}
                    strokeWidth={1.7}
                  />
                </div>

                <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                  Our Location
                </p>

                <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                  Remera, Kwa Rwahama
                </h2>

                <p className="mt-2 text-sm font-medium text-slate-500">
                  Kigali, Rwanda
                </p>

                <p className="mt-5 max-w-md leading-7 text-slate-500">
                  Visit the CANA team at our location
                  in Remera, Kwa Rwahama, Kigali.
                </p>

                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-7 inline-flex w-fit items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Get Directions
                  <ArrowRight size={16} />
                </a>

              </div>

              {/* MAP */}

              <div className="relative min-h-[360px] bg-slate-100 md:min-h-[460px]">

                <iframe
                  title="CANA Group - Remera Kwa Rwahama, Kigali"
                  src={googleMapsEmbed}
                  className="absolute inset-0 h-full w-full border-0 grayscale"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />

              </div>

            </div>

          </div>

        </div>

      </section>

      {/* =====================================================
          FINAL CTA
      ====================================================== */}

      <section className="py-24 lg:py-32">

        <div className="mx-auto max-w-4xl px-6 text-center lg:px-8">

          <MessageCircle
            size={25}
            strokeWidth={1.7}
            className="mx-auto"
          />

          <h2 className="mt-6 text-4xl font-semibold tracking-tight sm:text-5xl">
            Prefer a quick conversation?
          </h2>

          <p className="mx-auto mt-5 max-w-xl leading-7 text-slate-500">
            Reach us directly on WhatsApp and speak with
            our team.
          </p>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-9 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Chat on WhatsApp
            <ArrowRight size={16} />
          </a>

        </div>

      </section>

    </main>
  );
}
