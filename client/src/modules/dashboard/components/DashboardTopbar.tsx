import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock3,
  ChevronDown,
  UserCircle,
} from "lucide-react";

import { useAuth } from "@/context/authContext";

function DashboardTopbar() {
  const { user } = useAuth();

  const [currentDate, setCurrentDate] = useState(
    new Date()
  );

  // =====================================================
  // LIVE DATE & TIME
  // =====================================================

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  // =====================================================
  // DATE
  // =====================================================

  const date = currentDate.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // =====================================================
  // TIME
  // =====================================================

  const time = currentDate.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  // =====================================================
  // REAL USER DATA
  // =====================================================

  const fullName = user?.fullName || "User";

  const email = user?.email || "";

  const role = user?.role || "customer";

  const company = user?.company || "";

  // =====================================================
  // USER INITIALS
  // =====================================================

  const initials = fullName
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((name) => name.charAt(0).toUpperCase())
    .join("");

  // =====================================================
  // FORMAT ROLE
  // =====================================================

  const formattedRole =
    role.charAt(0).toUpperCase() +
    role.slice(1);

  // =====================================================
  // FORMAT COMPANY
  // =====================================================

  const formattedCompany = company
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );

  return (
    <header
      className="
        sticky
        top-0
        z-30
        flex
        min-h-16
        items-center
        justify-between
        border-b
        border-gray-200
        bg-white/95
        px-4
        backdrop-blur
        sm:px-6
        lg:px-8
      "
    >
      {/* =================================================
          LEFT
      ================================================= */}

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-gray-900">
          Here We
        </p>

        <p className="hidden text-xs text-gray-500 sm:block">
          welcome you, {fullName.split(" ")[0]}
        </p>
      </div>

      {/* =================================================
          RIGHT
      ================================================= */}

      <div className="flex items-center gap-3 sm:gap-5">

        {/* =================================================
            DATE
        ================================================= */}

        <div
          className="
            hidden
            items-center
            gap-2
            lg:flex
          "
        >
          <CalendarDays
            size={16}
            strokeWidth={2}
            className="text-gray-400"
          />

          <span className="text-sm font-medium text-gray-600">
            {date}
          </span>
        </div>

        {/* =================================================
            TIME
        ================================================= */}

        <div className="flex items-center gap-2">
          <Clock3
            size={16}
            strokeWidth={2}
            className="text-red-600"
          />

          <span
            className="
              font-mono
              text-sm
              font-semibold
              tracking-tight
              text-gray-900
            "
          >
            {time}
          </span>
        </div>

        {/* =================================================
            DIVIDER
        ================================================= */}

        <div
          className="
            hidden
            h-8
            w-px
            bg-gray-200
            sm:block
          "
        />

        {/* =================================================
            USER
        ================================================= */}

        <div className="group relative">

          {/* USER BUTTON */}

          <button
            type="button"
            className="
              flex
              items-center
              gap-2.5
              rounded-xl
              px-2
              py-1.5
              transition
              hover:bg-gray-50
            "
          >

            {/* AVATAR */}

            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-red-50
                text-xs
                font-bold
                text-red-600
              "
            >
              {initials || (
                <UserCircle
                  size={21}
                  strokeWidth={1.8}
                />
              )}
            </div>

            {/* USER INFO */}

            <div className="hidden min-w-0 text-left md:block">

              <p
                className="
                  max-w-40
                  truncate
                  text-sm
                  font-semibold
                  text-gray-900
                "
              >
                {fullName}
              </p>

              <p
                className="
                  max-w-40
                  truncate
                  text-xs
                  text-gray-500
                "
              >
                {formattedRole}
              </p>

            </div>

            <ChevronDown
              size={15}
              strokeWidth={2}
              className="
                hidden
                text-gray-400
                transition
                md:block
              "
            />

          </button>

          {/* =================================================
              USER DROPDOWN
          ================================================= */}

          <div
            className="
              invisible
              absolute
              right-0
              top-full
              mt-2
              w-64
              translate-y-1
              rounded-xl
              border
              border-gray-200
              bg-white
              p-2
              opacity-0
              shadow-lg
              transition-all
              duration-150
              group-hover:visible
              group-hover:translate-y-0
              group-hover:opacity-100
            "
          >

            {/* USER HEADER */}

            <div className="border-b border-gray-100 px-3 py-3">

              <p className="truncate text-sm font-semibold text-gray-900">
                {fullName}
              </p>

              {email && (
                <p className="mt-1 truncate text-xs text-gray-500">
                  {email}
                </p>
              )}

            </div>

            {/* USER DETAILS */}

            <div className="space-y-2 px-3 py-3">

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Role
                </span>

                <span className="text-xs font-semibold capitalize text-gray-900">
                  {formattedRole}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-gray-500">
                  Company
                </span>

                <span className="truncate text-xs font-semibold text-gray-900">
                  {formattedCompany}
                </span>
              </div>

              {user?.phone && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-500">
                    Phone
                  </span>

                  <span className="truncate text-xs font-semibold text-gray-900">
                    {user.phone}
                  </span>
                </div>
              )}

            </div>

          </div>

        </div>
      </div>
    </header>
  );
}

export default DashboardTopbar;