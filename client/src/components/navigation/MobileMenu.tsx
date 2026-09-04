import { useState } from "react";
import {
  ChevronDown,
  Calculator,
  Construction,
  FileText,
  Palette,
  Paintbrush,
  Truck,
  UserRound,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { NavLink } from "react-router-dom";

type MobileMenuProps = {
  onLogin: () => void;
  onClose?: () => void;
  dashboardPath?: string;
  onLogout?: () => void;
};

type MenuType = "paints" | "services" | null;

function MobileMenu({
  onLogin,
  onClose,
  dashboardPath,
  onLogout,
}: MobileMenuProps) {
  const [open, setOpen] = useState<MenuType>(null);

  // ============================================================
  // TOGGLE DROPDOWN
  // ============================================================

  const toggleMenu = (
    menu: Exclude<MenuType, null>,
  ) => {
    setOpen((current) =>
      current === menu ? null : menu,
    );
  };

  // ============================================================
  // CLOSE MENU
  // ============================================================

  const closeMenu = () => {
    setOpen(null);
    onClose?.();
  };

  // ============================================================
  // NORMAL MOBILE LINK
  // ============================================================

  const normalLinkClass = ({
    isActive,
  }: {
    isActive: boolean;
  }) =>
    `
      flex
      min-h-[58px]
      items-center
      border-b
      border-neutral-100
      text-[15px]
      font-semibold
      tracking-[-0.015em]
      transition-colors
      duration-200
      ${
        isActive
          ? "text-red-600"
          : "text-neutral-900 hover:text-red-600"
      }
    `;

  return (
    <div className="bg-white lg:hidden">
      <div className="px-5 pb-6 pt-2 sm:px-8">

        {/* ======================================================
            NAVIGATION
        ======================================================= */}

        <nav
          className="flex flex-col"
          aria-label="Mobile navigation"
        >

          {/* ==================================================
              HOME
          =================================================== */}

          <NavLink
            to="/"
            end
            onClick={closeMenu}
            className={normalLinkClass}
          >
            Home
          </NavLink>

          {/* ==================================================
              CANA PAINTS
          =================================================== */}

          <div className="border-b border-neutral-100">

            {/* DROPDOWN TRIGGER */}

            <button
              type="button"
              onClick={() => toggleMenu("paints")}
              aria-expanded={open === "paints"}
              aria-controls="mobile-paints-menu"
              className={`
                group
                flex
                min-h-[58px]
                w-full
                items-center
                justify-between
                text-left
                text-[15px]
                font-semibold
                tracking-[-0.015em]
                transition-colors
                duration-200
                ${
                  open === "paints"
                    ? "text-red-600"
                    : "text-neutral-900 hover:text-red-600"
                }
              `}
            >
              <span>CANA Paints</span>

              <ChevronDown
                size={18}
                strokeWidth={1.8}
                className={`
                  transition-transform
                  duration-300
                  ${
                    open === "paints"
                      ? "rotate-180 text-red-600"
                      : "text-neutral-400"
                  }
                `}
              />
            </button>

            {/* DROPDOWN */}

            <div
              id="mobile-paints-menu"
              className={`
                grid
                transition-all
                duration-300
                ease-in-out
                ${
                  open === "paints"
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }
              `}
            >
              <div className="overflow-hidden">

                <div className="mb-4 rounded-2xl bg-neutral-50 p-2">

                  {/* DROPDOWN HEADER */}

                  <div className="px-3 pb-3 pt-3">

                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-red-600">
                      CANA PAINTS
                    </p>

                    <h3 className="mt-1.5 text-base font-bold tracking-tight text-neutral-950">
                      Paint solutions
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      Quality finishes for modern spaces.
                    </p>

                  </div>

                  {/* PRODUCTS */}

                  <MobileDropdownItem
                    icon={
                      <Palette
                        size={18}
                        strokeWidth={1.8}
                      />
                    }
                    title="Paint Products"
                    description="Interior & exterior paints"
                    to="/cana-paints/products"
                    onClick={closeMenu}
                  />

                  {/* PAINTING SERVICES */}

                  <MobileDropdownItem
                    icon={
                      <Paintbrush
                        size={18}
                        strokeWidth={1.8}
                      />
                    }
                    title="Painting Services"
                    description="Residential & commercial"
                    to="/cana-paints/painting-services"
                    onClick={closeMenu}
                  />

                  {/* REQUEST QUOTE */}

                  <MobileDropdownItem
                    icon={
                      <FileText
                        size={18}
                        strokeWidth={1.8}
                      />
                    }
                    title="Request a Quote"
                    description="Tell us about your project"
                    to="/cana-paints/request-quote"
                    onClick={closeMenu}
                  />
                  <MobileDropdownItem icon={<Calculator size={18} strokeWidth={1.8} />} title="Estimated Cost Calculator" description="Plan paint quantity and cost" to="/cana-paints/estimate-cost" onClick={closeMenu} />

                </div>

              </div>
            </div>
          </div>

          {/* ==================================================
              CANA SERVICES
          =================================================== */}

          <div className="border-b border-neutral-100">

            {/* DROPDOWN TRIGGER */}

            <button
              type="button"
              onClick={() => toggleMenu("services")}
              aria-expanded={open === "services"}
              aria-controls="mobile-services-menu"
              className={`
                group
                flex
                min-h-[58px]
                w-full
                items-center
                justify-between
                text-left
                text-[15px]
                font-semibold
                tracking-[-0.015em]
                transition-colors
                duration-200
                ${
                  open === "services"
                    ? "text-red-600"
                    : "text-neutral-900 hover:text-red-600"
                }
              `}
            >
              <span>CANA Services</span>

              <ChevronDown
                size={18}
                strokeWidth={1.8}
                className={`
                  transition-transform
                  duration-300
                  ${
                    open === "services"
                      ? "rotate-180 text-red-600"
                      : "text-neutral-400"
                  }
                `}
              />
            </button>

            {/* DROPDOWN */}

            <div
              id="mobile-services-menu"
              className={`
                grid
                transition-all
                duration-300
                ease-in-out
                ${
                  open === "services"
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }
              `}
            >
              <div className="overflow-hidden">

                <div className="mb-4 rounded-2xl bg-neutral-50 p-2">

                  {/* DROPDOWN HEADER */}

                  <div className="px-3 pb-3 pt-3">

                    <p className="text-[9px] font-bold uppercase tracking-[0.22em] text-red-600">
                      CANA SERVICES
                    </p>

                    <h3 className="mt-1.5 text-base font-bold tracking-tight text-neutral-950">
                      Professional solutions
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-neutral-500">
                      Practical support for your projects.
                    </p>

                  </div>

                  {/* SCAFFOLD RENTAL */}

                  <MobileDropdownItem
                    icon={
                      <Construction
                        size={18}
                        strokeWidth={1.8}
                      />
                    }
                    title="Scaffold Rental"
                    description="Safe access solutions"
                    to="/cana-services/scaffolds"
                    onClick={closeMenu}
                  />

                  {/* TRANSPORT */}

                  <MobileDropdownItem
                    icon={
                      <Truck
                        size={18}
                        strokeWidth={1.8}
                      />
                    }
                    title="Transport"
                    description="Reliable logistics"
                    to="/cana-services/transport"
                    onClick={closeMenu}
                  />

                </div>

              </div>
            </div>
          </div>

          {/* ==================================================
              ABOUT
          =================================================== */}

          <NavLink
            to="/about"
            onClick={closeMenu}
            className={normalLinkClass}
          >
            About
          </NavLink>

          <NavLink
            to="/team"
            onClick={closeMenu}
            className={normalLinkClass}
          >
            Our Team
          </NavLink>

          {/* ==================================================
              PROJECTS
          =================================================== */}

          <NavLink
            to="/projects"
            onClick={closeMenu}
            className={normalLinkClass}
          >
            Projects
          </NavLink>

          {/* ==================================================
              CONTACT
          =================================================== */}

          <NavLink
            to="/contact"
            onClick={closeMenu}
            className={normalLinkClass}
          >
            Contact
          </NavLink>

        </nav>

        {/* ====================================================
            LOGIN
        ===================================================== */}

        <div className="mt-6 border-t border-neutral-100 pt-5">

          {dashboardPath ? <><NavLink
            to={dashboardPath}
            onClick={closeMenu}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-neutral-950 py-3.5 text-sm font-bold text-white transition-all duration-300 hover:bg-red-600 active:scale-[0.98]"
          >
            <LayoutDashboard size={17} strokeWidth={2} />
            <span>Go to Dashboard</span>
          </NavLink>
          <button
            type="button"
            onClick={() => { closeMenu(); onLogout?.(); }}
            className="mt-2 flex w-full items-center justify-center gap-2.5 rounded-xl border border-neutral-200 py-3 text-sm font-bold text-neutral-700 transition hover:bg-neutral-50"
          >
            <LogOut size={17} strokeWidth={2} />
            <span>Sign out</span>
          </button></> : <button
            type="button"
            onClick={() => {
              closeMenu();
              onLogin();
            }}
            className="
              flex
              w-full
              items-center
              justify-center
              gap-2.5
              rounded-xl
              bg-neutral-950
              py-3.5
              text-sm
              font-bold
              text-white
              transition-all
              duration-300
              hover:bg-red-600
              active:scale-[0.98]
            "
          >
            <UserRound
              size={17}
              strokeWidth={2}
            />

            <span>Login</span>
          </button>}

        </div>

      </div>
    </div>
  );
}

/* ============================================================
   MOBILE DROPDOWN ITEM
============================================================ */

type MobileDropdownItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  onClick: () => void;
};

function MobileDropdownItem({
  icon,
  title,
  description,
  to,
  onClick,
}: MobileDropdownItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `
          group
          flex
          items-center
          gap-3
          rounded-xl
          p-3
          transition-all
          duration-200
          ${
            isActive
              ? "bg-white shadow-sm"
              : "hover:bg-white"
          }
        `
      }
    >
      {({ isActive }) => (
        <>
          {/* ICON */}

          <div
            className={`
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              transition-all
              duration-200
              ${
                isActive
                  ? "bg-red-600 text-white"
                  : "bg-red-50 text-red-600 group-hover:bg-red-600 group-hover:text-white"
              }
            `}
          >
            {icon}
          </div>

          {/* TEXT */}

          <div className="min-w-0 flex-1">

            <h4
              className={`
                text-[13px]
                font-semibold
                transition-colors
                duration-200
                ${
                  isActive
                    ? "text-red-600"
                    : "text-neutral-900 group-hover:text-red-600"
                }
              `}
            >
              {title}
            </h4>

            <p className="mt-0.5 text-[10px] leading-4 text-neutral-400">
              {description}
            </p>

          </div>

          {/* ARROW */}

          <span
            className={`
              text-sm
              transition-all
              duration-200
              ${
                isActive
                  ? "translate-x-1 text-red-600"
                  : "text-neutral-300 group-hover:translate-x-1 group-hover:text-red-600"
              }
            `}
          >
            →
          </span>
        </>
      )}
    </NavLink>
  );
}

export default MobileMenu;
