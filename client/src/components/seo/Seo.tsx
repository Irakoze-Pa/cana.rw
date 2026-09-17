import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type SeoEntry = {
  title: string;
  description: string;
};

const pages: Record<string, SeoEntry> = {
  "/": {
    title: "CANA Paints & Services | Quality Solutions in Rwanda",
    description: "CANA provides quality paint products, professional painting, scaffolding and transport services for homes, businesses and project sites in Rwanda.",
  },
  "/about": {
    title: "About CANA | CANAN Business Group Ltd",
    description: "Learn about CANAN Business Group Ltd, the team behind CANA Paints and practical services for projects across Rwanda.",
  },
  "/team": {
    title: "Our Team | CANAN Business Group Ltd",
    description: "Meet the CANAN Business Group team delivering CANA Paints and professional project services in Rwanda.",
  },
  "/projects": {
    title: "Projects | CANA Paints & Services",
    description: "Explore CANA painting, construction support and site projects delivered across Rwanda.",
  },
  "/contact": {
    title: "Contact CANA | Paints & Services in Rwanda",
    description: "Contact CANA for paint products, painting services, scaffolding or transport support in Kigali and across Rwanda.",
  },
  "/cana-paints": {
    title: "CANA Paints | Quality Paint Products in Rwanda",
    description: "Discover CANA paint solutions for interior, exterior and professional finishing projects in Rwanda.",
  },
  "/cana-paints/products": {
    title: "Paint Products | CANA Paints Rwanda",
    description: "Browse CANA paint products, available pack sizes and colours for your residential or commercial project.",
  },
  "/cana-paints/painting-services": {
    title: "Professional Painting Services | CANA Paints Rwanda",
    description: "Request professional residential, commercial and exterior painting services from CANA Paints in Rwanda.",
  },
  "/cana-paints/request-quote": {
    title: "Request a Paint Quote | CANA Paints Rwanda",
    description: "Request a quotation for CANA paint products and painting services for your project.",
  },
  "/cana-paints/estimate-cost": {
    title: "Paint Cost Estimator | CANA Paints Rwanda",
    description: "Estimate the paint quantity and budget required for your interior or exterior project with CANA.",
  },
  "/cana-services": {
    title: "CANA Services | Project Support in Rwanda",
    description: "CANA Services provides practical scaffolding and transport support for construction, painting and site work.",
  },
  "/cana-services/scaffolds": {
    title: "Scaffolding Hire & Sale | CANA Services Rwanda",
    description: "Hire or buy scaffolding from CANA Services for construction, painting, maintenance and renovation projects.",
  },
  "/cana-services/transport": {
    title: "Transport Services | CANA Services Rwanda",
    description: "Arrange dependable transport support for materials, equipment and project deliveries with CANA Services.",
  },
};

const setMeta = (selector: string, attribute: "name" | "property", value: string) => {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, selector.match(/="([^"]+)/)?.[1] || "");
    document.head.appendChild(element);
  }
  element.content = value;
};

export default function Seo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const page = pages[pathname] ?? pages["/"];
    const origin = window.location.origin;
    const canonicalUrl = `${origin}${pathname === "/" ? "/" : pathname}`;

    document.title = page.title;
    setMeta('meta[name="description"]', "name", page.description);
    setMeta('meta[property="og:title"]', "property", page.title);
    setMeta('meta[property="og:description"]', "property", page.description);
    setMeta('meta[property="og:url"]', "property", canonicalUrl);
    setMeta('meta[name="twitter:title"]', "name", page.title);
    setMeta('meta[name="twitter:description"]', "name", page.description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const existingSchema = document.getElementById("cana-local-business-schema");
    const schema = {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "CANAN Business Group Ltd",
      alternateName: "CANA",
      url: origin,
      logo: `${origin}/cana-icon.png`,
      email: "info@cana.rw",
      telephone: "+250789408367",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Kigali",
        addressCountry: "RW",
      },
      sameAs: [
        "https://www.facebook.com/canapaints.cbg",
        "https://www.instagram.com/canapaints.cbg",
        "https://www.linkedin.com/company/canapaints-cbg",
      ],
    };
    const schemaScript = (existingSchema as HTMLScriptElement | null) ?? document.createElement("script");
    schemaScript.id = "cana-local-business-schema";
    schemaScript.type = "application/ld+json";
    schemaScript.textContent = JSON.stringify(schema);
    if (!existingSchema) document.head.appendChild(schemaScript);
  }, [pathname]);

  return null;
}
