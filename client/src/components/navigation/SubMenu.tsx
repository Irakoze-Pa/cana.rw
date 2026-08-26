import { ChevronRight } from "lucide-react";
import { NavLink } from "react-router-dom";

type SubMenuItem = {
  name: string;
  path: string;
  description?: string;
};

type Props = {
  items: SubMenuItem[];
};

function SubMenu({ items }: Props) {
  return (
    <div
      className="
        absolute
        left-0
        top-full
        z-50
        mt-3
        w-[320px]
        overflow-hidden
        rounded-2xl
        border
        border-black/[0.06]
        bg-white
        p-2
        shadow-[0_20px_60px_rgba(0,0,0,0.10)]
        ring-1
        ring-black/[0.02]
        animate-in
        fade-in
        slide-in-from-top-2
        duration-200
      "
    >
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `
            group
            relative
            flex
            items-center
            justify-between
            rounded-xl
            px-4
            py-3.5
            transition-all
            duration-200
            ${
              isActive
                ? "bg-black text-white"
                : "text-gray-700 hover:bg-gray-50 hover:text-black"
            }
            `
          }
        >
          {({ isActive }) => (
            <>
              {/* Left Content */}
              <div className="min-w-0 pr-4">

                <p
                  className={`
                    text-sm
                    font-semibold
                    leading-tight
                    ${
                      isActive
                        ? "text-white"
                        : "text-gray-900 group-hover:text-black"
                    }
                  `}
                >
                  {item.name}
                </p>

                {item.description && (
                  <p
                    className={`
                      mt-1
                      line-clamp-2
                      text-[11px]
                      leading-relaxed
                      ${
                        isActive
                          ? "text-white/60"
                          : "text-gray-400"
                      }
                    `}
                  >
                    {item.description}
                  </p>
                )}

              </div>

              {/* Arrow */}
              <span
                className={`
                  flex
                  h-7
                  w-7
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  transition-all
                  duration-200
                  ${
                    isActive
                      ? "bg-white/10 text-white"
                      : "bg-gray-50 text-gray-400 group-hover:bg-black group-hover:text-white"
                  }
                `}
              >
                <ChevronRight
                  size={14}
                  strokeWidth={2}
                  className="transition-transform duration-200 group-hover:translate-x-0.5"
                />
              </span>

              {/* Active indicator */}
              {isActive && (
                <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-red-600" />
              )}
            </>
          )}
        </NavLink>
      ))}
    </div>
  );
}

export default SubMenu;