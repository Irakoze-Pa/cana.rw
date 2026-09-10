import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  UserRound,
  X,
} from "lucide-react";

import {
  Link,
  useLocation,
} from "react-router-dom";

import logo from "@/assets/logocanan.png";

import NavLinks from "./NavLinks";
import MobileMenu from "./MobileMenu";

import LoginModal from "@/components/auth/loginModal";
import RegisterModal from "@/components/auth/registerModal";

import { useAuth } from "@/context/authContext";

function Navbar() {
  const { user, logout } = useAuth();

  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  /*
   * ============================================================
   * USER INITIALS
   * ============================================================
   */

  const userInitials = useMemo(() => {
    const name = user?.fullName?.trim();

    if (!name) {
      return "U";
    }

    const parts = name
      .split(/\s+/)
      .filter(Boolean);

    if (parts.length === 1) {
      return parts[0]
        .charAt(0)
        .toUpperCase();
    }

    return (
      parts[0].charAt(0) +
      parts[parts.length - 1].charAt(0)
    ).toUpperCase();
  }, [user?.fullName]);

  const dashboardPath =
    user?.role === "admin" || user?.role === "superadmin" || user?.role === "staff"
      ? "/management"
      : "/dashboard";

  /*
   * ============================================================
   * SCROLL EFFECT
   * ============================================================
   */

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll,
      { passive: true },
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll,
      );
    };
  }, []);

  /*
   * ============================================================
   * CLOSE MOBILE ON DESKTOP
   * ============================================================
   */

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setMobileOpen(false);
      }
    };

    window.addEventListener(
      "resize",
      handleResize,
    );

    return () => {
      window.removeEventListener(
        "resize",
        handleResize,
      );
    };
  }, []);

  /*
   * ============================================================
   * CLOSE MENUS ON ROUTE CHANGE
   * ============================================================
   */

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [location.pathname]);

  /*
   * ============================================================
   * ESCAPE KEY
   * ============================================================
   */

  useEffect(() => {
    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        setAccountOpen(false);
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, []);

  /*
   * ============================================================
   * PREVENT BACKGROUND SCROLL
   * ============================================================
   */

  useEffect(() => {
    document.body.style.overflow = mobileOpen
      ? "hidden"
      : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  /*
   * ============================================================
   * CLOSE MOBILE
   * ============================================================
   */

  const closeMobileMenu = () => {
    setMobileOpen(false);
  };

  /*
   * ============================================================
   * LOGOUT
   * ============================================================
   */

  const handleLogout = () => {
    setAccountOpen(false);
    setMobileOpen(false);
    logout();
  };

  /*
   * ============================================================
   * MOBILE LOGIN
   * ============================================================
   */

  const handleMobileLogin = () => {
    setMobileOpen(false);
    setLoginOpen(true);
  };

  /*
   * ============================================================
   * LOGIN
   * ============================================================
   */

  const handleLoginOpen = () => {
    setAccountOpen(false);
    setLoginOpen(true);
  };

  /*
   * ============================================================
   * REGISTER
   * ============================================================
   */

  const handleRegisterOpen = () => {
    setLoginOpen(false);
    setRegisterOpen(true);
  };

  return (
    <>
      {/* ========================================================
          NAVBAR
      ========================================================= */}

      <header
        className={`
          sticky
          top-0
          z-[100]
          border-b
          bg-white/95
          backdrop-blur-xl
          transition-all
          duration-300
          ${
            scrolled
              ? "border-neutral-200 shadow-[0_6px_25px_rgba(0,0,0,0.05)]"
              : "border-neutral-100"
          }
        `}
      >
        {/* ======================================================
            CONTAINER
        ======================================================= */}

        <div
          className="
            mx-auto
            max-w-[1500px]
            px-5
            sm:px-8
            lg:px-10
            xl:px-14
          "
        >
          <div
            className="
              flex
              h-[72px]
              items-center
              justify-between
              lg:h-[80px]
            "
          >
            {/* ==================================================
                BRAND
            =================================================== */}

            <Link
              to="/"
              onClick={closeMobileMenu}
              aria-label="CANA home"
              className="
                group
                flex
                shrink-0
                items-center
                gap-3
                sm:gap-3.5
              "
            >
              {/* LOGO */}

              <img
                src={logo}
                alt="CANA"
                className="
                  h-[44px]
                  w-auto
                  object-contain
                  transition-transform
                  duration-300
                  group-hover:scale-[1.025]
                  sm:h-[50px]
                  lg:h-[56px]
                  xl:h-[60px]
                "
              />

              {/* BRAND */}

              <div
                className="
                  flex
                  flex-col
                  justify-center
                "
              >
                <span
                  className="
                    text-[24px]
                    font-extrabold
                    leading-none
                    tracking-[-0.065em]
                    text-neutral-950
                    sm:text-[26px]
                    lg:text-[28px]
                  "
                >
                  CANA
                </span>

                <span
                  className="
                    mt-1.5
                    whitespace-nowrap
                    text-[7px]
                    font-bold
                    uppercase
                    tracking-[0.22em]
                    text-neutral-500
                    sm:text-[8px]
                  "
                >
                  Paints • Services
                </span>
              </div>
            </Link>

            {/* ==================================================
                DESKTOP NAVIGATION
            =================================================== */}

            <div
              className="
                hidden
                flex-1
                items-center
                justify-center
                lg:flex
              "
            >
              <NavLinks />
            </div>

            {/* ==================================================
                ACCOUNT AREA
            =================================================== */}

            <div className="hidden lg:flex lg:items-center">
              {user ? (
                <div className="relative">
                  {/* USER BUTTON */}

                  <button
                    type="button"
                    onClick={() =>
                      setAccountOpen(
                        (current) => !current,
                      )
                    }
                    aria-expanded={accountOpen}
                    aria-haspopup="menu"
                    className="
                      group
                      flex
                      items-center
                      gap-3
                      rounded-xl
                      px-2
                      py-1.5
                      transition-colors
                      duration-200
                      hover:bg-neutral-50
                    "
                  >
                    {/* AVATAR */}

                    <div
                      className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-full
                        bg-neutral-100
                        text-[11px]
                        font-bold
                        text-neutral-700
                        transition-colors
                        duration-200
                        group-hover:bg-neutral-200
                        group-hover:text-neutral-800
                      "
                    >
                      {userInitials}
                    </div>

                    {/* NAME */}

                    <div className="max-w-[130px] text-left">
                      <p
                        className="
                          truncate
                          text-xs
                          font-bold
                          text-neutral-900
                        "
                      >
                        {user.fullName}
                      </p>

                      <p
                        className="
                          mt-0.5
                          truncate
                          text-[9px]
                          font-medium
                          uppercase
                          tracking-[0.08em]
                          text-neutral-400
                        "
                      >
                        {user.role}
                      </p>
                    </div>

                    <ChevronDown
                      size={14}
                      strokeWidth={1.8}
                      className={`
                        text-neutral-400
                        transition-transform
                        duration-300
                        ${
                          accountOpen
                            ? "rotate-180 text-neutral-700"
                            : ""
                        }
                      `}
                    />
                  </button>

                  {/* ACCOUNT DROPDOWN */}

                  {accountOpen && (
                    <div
                      className="
                        absolute
                        right-0
                        top-[calc(100%+12px)]
                        w-[240px]
                        rounded-2xl
                        border
                        border-neutral-200
                        bg-white
                        p-2
                        shadow-[0_20px_60px_rgba(0,0,0,0.10)]
                      "
                      role="menu"
                    >
                      <div
                        className="
                          rounded-xl
                          bg-neutral-50
                          px-4
                          py-3
                        "
                      >
                        <p
                          className="
                            text-[9px]
                            font-bold
                            uppercase
                            tracking-[0.18em]
                            text-neutral-500
                          "
                        >
                          Account
                        </p>

                        <p
                          className="
                            mt-1
                            truncate
                            text-sm
                            font-bold
                            text-neutral-950
                          "
                        >
                          {user.fullName}
                        </p>

                        <p
                          className="
                            mt-0.5
                            truncate
                            text-[10px]
                            text-neutral-400
                          "
                        >
                          {user.role}
                        </p>
                      </div>

                      {/* DASHBOARD */}

                      <Link
                        to={dashboardPath}
                        onClick={() =>
                          setAccountOpen(false)
                        }
                        className="
                          group
                          mt-2
                          flex
                          items-center
                          gap-3
                          rounded-xl
                          px-3
                          py-3
                          hover:bg-neutral-50
                        "
                      >
                        <div
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-lg
                            bg-neutral-100
                            text-neutral-600
                            group-hover:bg-slate-950
                            group-hover:text-white
                          "
                        >
                          <LayoutDashboard
                            size={16}
                            strokeWidth={1.8}
                          />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-neutral-900">
                            Dashboard
                          </p>

                          <p className="mt-0.5 text-[9px] text-neutral-400">
                            {user.role === "customer"
                              ? "Manage your account"
                              : "Manage operations"}
                          </p>
                        </div>
                      </Link>

                      <div className="my-1 h-px bg-neutral-100" />

                      {/* LOGOUT */}

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="
                          group
                          flex
                          w-full
                          items-center
                          gap-3
                          rounded-xl
                          px-3
                          py-3
                          text-left
                          hover:bg-slate-50
                        "
                      >
                        <div
                          className="
                            flex
                            h-9
                            w-9
                            items-center
                            justify-center
                            rounded-lg
                            bg-neutral-100
                            text-neutral-600
                            group-hover:bg-slate-950
                            group-hover:text-white
                          "
                        >
                          <LogOut
                            size={16}
                            strokeWidth={1.8}
                          />
                        </div>

                        <div>
                          <p className="text-xs font-bold text-neutral-800">
                            Logout
                          </p>

                          <p className="mt-0.5 text-[9px] text-neutral-400">
                            Sign out securely
                          </p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* LOGIN */

                <button
                  type="button"
                  onClick={handleLoginOpen}
                  className="
                    group
                    inline-flex
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-neutral-200
                    bg-white
                    px-5
                    py-2.5
                    text-xs
                    font-semibold
                    text-neutral-800
                    transition-all
                    duration-200
                    hover:border-red-500
                    hover:bg-red-50
                    hover:text-red-600
                    active:scale-[0.98]
                  "
                >
                  <UserRound
                    size={15}
                    strokeWidth={1.8}
                    className="
                      text-neutral-500
                      transition-colors
                      duration-200
                      group-hover:text-red-600
                    "
                  />

                  <span>Login</span>
                </button>
              )}
            </div>

            {/* ==================================================
                MOBILE BUTTON
            =================================================== */}

            <button
              type="button"
              onClick={() =>
                setMobileOpen(
                  (current) => !current,
                )
              }
              aria-label={
                mobileOpen
                  ? "Close navigation menu"
                  : "Open navigation menu"
              }
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-xl
                border
                border-neutral-200
                bg-white
                text-neutral-900
                transition-all
                duration-200
                hover:border-red-300
                hover:bg-red-50
                hover:text-red-600
                lg:hidden
              "
            >
              {mobileOpen ? (
                <X
                  size={21}
                  strokeWidth={1.8}
                />
              ) : (
                <Menu
                  size={21}
                  strokeWidth={1.8}
                />
              )}
            </button>
          </div>
        </div>

        {/* ======================================================
            MOBILE NAVIGATION
        ======================================================= */}

        <div
          id="mobile-navigation"
          className={`
            overflow-hidden
            border-t
            border-neutral-100
            bg-white
            transition-all
            duration-300
            lg:hidden
            ${
              mobileOpen
                ? "max-h-[calc(100vh-84px)] opacity-100"
                : "max-h-0 opacity-0"
            }
          `}
        >
          <div
            className="
              max-h-[calc(100vh-84px)]
              overflow-y-auto
              overscroll-contain
            "
          >
            <MobileMenu
              onLogin={handleMobileLogin}
              onClose={closeMobileMenu}
              dashboardPath={user ? dashboardPath : undefined}
              onLogout={user ? handleLogout : undefined}
            />
          </div>
        </div>
      </header>

      {/* ========================================================
          LOGIN MODAL
      ========================================================= */}

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onRegister={handleRegisterOpen}
        onForgotPassword={() => {
          console.log("Forgot password");
        }}
      />

      {/* ========================================================
          REGISTER MODAL
      ========================================================= */}

      <RegisterModal
        isOpen={registerOpen}
        onClose={() =>
          setRegisterOpen(false)
        }
        onLogin={() => {
          setRegisterOpen(false);
          setLoginOpen(true);
        }}
      />
    </>
  );
}

export default Navbar;
