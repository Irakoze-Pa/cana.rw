import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";

type MenuType = "paints" | "services" | null;

function NavLinks() {
  const [open, setOpen] = useState<MenuType>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const openMenu = (menu: Exclude<MenuType, null>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setOpen(menu);
  };

  const closeMenu = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setOpen(null);
    }, 180);
  };

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(null);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <nav
      className="flex items-center gap-5 xl:gap-7"
      aria-label="Main navigation"
    >

      {/* =====================================================
          HOME
      ====================================================== */}
      <NavItem to="/">
        Home
      </NavItem>

      {/* =====================================================
          CANA PAINTS
      ====================================================== */}
      <div
        className="relative"
        onMouseEnter={() => openMenu("paints")}
        onMouseLeave={closeMenu}
      >
        <button
          type="button"
          onClick={() =>
            setOpen((current) =>
              current === "paints" ? null : "paints",
            )
          }
          className={`group relative flex items-center gap-1.5 py-6 text-[13px] font-bold transition-colors duration-300 ${
            open === "paints"
              ? "text-red-600"
              : "text-gray-700 hover:text-red-600"
          }`}
          aria-expanded={open === "paints"}
        >
          CANA Paints

          <NavUnderline active={open === "paints"} />
        </button>

        {open === "paints" && (
          <Dropdown
            onMouseEnter={() => openMenu("paints")}
            onMouseLeave={closeMenu}
          >
            <DropdownHeader
              eyebrow="CANA PAINTS"
              title="Paint solutions"
              description="Quality finishes for modern spaces."
            />

            <DropdownItem
              title="Paint Products"
              description="Interior & exterior paints"
              link="/cana-paints/products"
              onClick={() => setOpen(null)}
            />

            <DropdownItem
              title="Painting Services"
              description="Residential & commercial"
              link="/cana-paints/painting-services"
              onClick={() => setOpen(null)}
            />

            <DropdownItem
              title="Request a Quote"
              description="Tell us about your project"
              link="/cana-paints/request-quote"
              onClick={() => setOpen(null)}
            />
            <DropdownItem title="Estimated Cost Calculator" description="Plan paint quantity and cost" link="/cana-paints/estimate-cost" onClick={() => setOpen(null)} />
          </Dropdown>
        )}
      </div>

      {/* =====================================================
          CANA SERVICES
      ====================================================== */}
      <div
        className="relative"
        onMouseEnter={() => openMenu("services")}
        onMouseLeave={closeMenu}
      >
        <button
          type="button"
          onClick={() =>
            setOpen((current) =>
              current === "services" ? null : "services",
            )
          }
          className={`group relative flex items-center gap-1.5 py-6 text-[13px] font-bold transition-colors duration-300 ${
            open === "services"
              ? "text-red-600"
              : "text-gray-700 hover:text-red-600"
          }`}
          aria-expanded={open === "services"}
        >
          CANA Services

          <NavUnderline active={open === "services"} />
        </button>

        {open === "services" && (
          <Dropdown
            onMouseEnter={() => openMenu("services")}
            onMouseLeave={closeMenu}
          >
            <DropdownHeader
              eyebrow="CANA SERVICES"
              title="Professional solutions"
              description="Practical support for your projects."
            />

            <DropdownItem
              title="Scaffold Rental"
              description="Safe access solutions"
              link="/cana-services/scaffolds"
              onClick={() => setOpen(null)}
            />

            <DropdownItem
              title="Transport"
              description="Reliable logistics"
              link="/cana-services/transport"
              onClick={() => setOpen(null)}
            />
          </Dropdown>
        )}
      </div>

      {/* =====================================================
          ABOUT
      ====================================================== */}
      <NavItem to="/about">
        About
      </NavItem>

      <NavItem to="/team">
        Our Team
      </NavItem>

      {/* =====================================================
          PROJECTS
      ====================================================== */}
      <NavItem to="/projects">
        Projects
      </NavItem>

      {/* =====================================================
          CONTACT
      ====================================================== */}
      <NavItem to="/contact">
        Contact
      </NavItem>

    </nav>
  );
}

/* =========================================================
   NAV ITEM
========================================================= */

type NavItemProps = {
  to: string;
  children: React.ReactNode;
};

function NavItem({
  to,
  children,
}: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `group relative flex items-center py-6 text-[13px] font-bold transition-colors duration-300 ${
          isActive
            ? "text-red-600"
            : "text-gray-700 hover:text-red-600"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {children}

          <NavUnderline active={isActive} />
        </>
      )}
    </NavLink>
  );
}

/* =========================================================
   NAV UNDERLINE
========================================================= */

function NavUnderline({
  active,
}: {
  active: boolean;
}) {
  return (
    <span
      className={`absolute bottom-[14px] left-0 h-[2px] bg-red-600 transition-all duration-300 ${
        active
          ? "w-full"
          : "w-0 group-hover:w-full"
      }`}
    />
  );
}

/* =========================================================
   DROPDOWN
========================================================= */

type DropdownProps = {
  children: React.ReactNode;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

function Dropdown({
  children,
  onMouseEnter,
  onMouseLeave,
}: DropdownProps) {
  return (
    <div
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="absolute left-1/2 top-[60px] z-[100] w-[310px] -translate-x-1/2 pt-3"
    >
      <div className="overflow-hidden rounded-xl border border-black/[0.08] bg-white p-2 shadow-[0_20px_50px_rgba(0,0,0,0.12)]">

        {children}

      </div>
    </div>
  );
}

/* =========================================================
   DROPDOWN HEADER
========================================================= */

type DropdownHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function DropdownHeader({
  eyebrow,
  title,
  description,
}: DropdownHeaderProps) {
  return (
    <div className="px-4 pb-3 pt-4">

      <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-red-600">
        {eyebrow}
      </p>

      <h3 className="mt-1.5 text-base font-semibold tracking-tight text-black">
        {title}
      </h3>

    </div>
  );
}

/* =========================================================
   DROPDOWN ITEM
========================================================= */

type DropdownItemProps = {
  title: string;
  description: string;
  link: string;
  onClick: () => void;
};

function DropdownItem({
  title,
  description,
  link,
  onClick,
}: DropdownItemProps) {
  return (
    <NavLink
      to={link}
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-300 hover:bg-neutral-50"
    >
      <div className="min-w-0 flex-1">

        <h4 className="text-sm font-semibold text-gray-900 transition-colors duration-300 group-hover:text-red-600">
          {title}
        </h4>

      </div>
    </NavLink>
  );
}

export default NavLinks;
