import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Boxes, Building2, ChevronRight, LayoutDashboard, LogOut, Menu, Truck, Users, WalletCards, X } from "lucide-react";
import { useAuth } from "@/context/authContext";
import logo from "@/assets/logocanan.png";

const groups = [
  {
    title: "Workspace",
    links: [
      { to: "/cana-services-workspace", label: "Overview", icon: LayoutDashboard, end: true },
      { to: "/cana-services-workspace/clients", label: "Clients", icon: Users },
    ],
  },
  {
    title: "Operations",
    links: [
      { to: "/cana-services-workspace/scaffolding", label: "Scaffold operations", icon: Boxes },
      { to: "/cana-services-workspace/transport", label: "Rifan Transport", icon: Truck },
      { to: "/cana-services-workspace/staff", label: "Staff & pay", icon: Users },
    ],
  },
  {
    title: "Finance & reporting",
    links: [
      { to: "/cana-services-workspace/finance", label: "Payments & expenses", icon: WalletCards },
      { to: "/cana-services-workspace/reports", label: "Reports", icon: BarChart3 },
    ],
  },
];

const mobileLinks = groups.flatMap((group) => group.links).filter((link) =>
  ["Overview", "Scaffold operations", "Rifan Transport", "Payments & expenses", "Staff & pay"].includes(link.label),
);

export default function ServicesManagementLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const allLinks = useMemo(() => groups.flatMap((group) => group.links), []);
  const current = allLinks.find((link) => link.end
    ? location.pathname === link.to
    : location.pathname === link.to || location.pathname.startsWith(`${link.to}/`));
  const initials = (user?.fullName || "CANA").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  const signOut = () => { logout(); navigate("/", { replace: true }); };

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-slate-900">
      {menuOpen && <button aria-label="Close navigation" className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden" onClick={() => setMenuOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[278px] flex-col border-r border-slate-200 bg-white shadow-[8px_0_28px_rgba(15,23,42,.04)] transition-transform duration-200 lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-[82px] items-center gap-3 border-b border-slate-100 px-5">
          <img src={logo} alt="CANA" className="h-11 w-11 rounded-xl object-contain" />
          <div className="min-w-0">
            <strong className="block truncate text-[15px] font-extrabold tracking-tight text-slate-950">CANA Services</strong>
            <span className="mt-0.5 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[.16em] text-slate-500"><span className="h-1.5 w-1.5 rounded-full bg-red-600" /> Operations workspace</span>
          </div>
          <button aria-label="Close navigation" onClick={() => setMenuOpen(false)} className="ml-auto rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"><X size={18} /></button>
        </div>

        <nav aria-label="CANA Services navigation" className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <section key={group.title}>
              <p className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-[.16em] text-slate-400">{group.title}</p>
              <div className="space-y-1">
                {group.links.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={() => setMenuOpen(false)}
                    className={({ isActive }) => `group relative flex min-h-10 items-center gap-3 rounded-lg px-3 py-2.5 text-[12px] font-bold transition-colors ${isActive ? "bg-red-50 text-red-800" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"}`}
                  >
                    {({ isActive }) => <>
                      {isActive && <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-red-700" />}
                      <Icon size={17} strokeWidth={isActive ? 2.3 : 1.9} className={isActive ? "text-red-700" : "text-slate-400 group-hover:text-slate-600"} />
                      <span className="flex-1">{label}</span>
                      {isActive && <ChevronRight size={14} className="text-red-500" />}
                    </>}
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-extrabold text-slate-700">{initials}</span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-xs font-bold text-slate-900">{user?.fullName || "CANA user"}</strong><small className="mt-0.5 block truncate text-[10px] text-slate-500">{user?.jobTitle || user?.role || "Team member"}</small></span>
          </div>
          <button onClick={signOut} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-red-50 hover:text-red-700"><LogOut size={15} />Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 lg:ml-[278px]">
        <header className="sticky top-0 z-30 flex min-h-[70px] items-center border-b border-slate-200/90 bg-white/95 px-4 backdrop-blur-md sm:px-7">
          <button aria-label="Open navigation" onClick={() => setMenuOpen(true)} className="mr-3 rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"><Menu size={18} /></button>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-slate-400"><Building2 size={12} /><span>CANA Services</span><ChevronRight size={12} /><span className="truncate text-slate-500">{current?.label || "Workspace"}</span></div>
            <h1 className="mt-0.5 truncate text-sm font-extrabold tracking-tight text-slate-950 sm:text-base">{current?.label || "Operations workspace"}</h1>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <span className="hidden text-right sm:block"><strong className="block max-w-40 truncate text-[11px] font-bold text-slate-700">{user?.fullName}</strong><small className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{user?.jobTitle || user?.role}</small></span>
            <button onClick={() => navigate("/")} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 sm:px-3.5 sm:text-xs">Website</button>
          </div>
        </header>

        <div className="mx-auto min-h-[calc(100vh-70px)] max-w-[1680px] px-3 py-4 sm:px-6 sm:py-6 xl:px-8">
          <div className="mb-5 flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/[.02] sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="hidden h-9 w-1 shrink-0 rounded-full bg-red-700 sm:block" />
              <div className="min-w-0">
                <p className="text-[9px] font-extrabold uppercase tracking-[.16em] text-slate-400">CANA Services · Management</p>
                <p className="mt-0.5 truncate text-xs font-semibold text-slate-700">Operations, finance and asset control</p>
              </div>
            </div>
            <span className="hidden shrink-0 items-center gap-2 text-[10px] font-bold text-slate-500 sm:inline-flex"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Workspace</span>
          </div>
          <Outlet />
        </div>
      </main>

      <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-slate-200 bg-white/95 px-2 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur lg:hidden">
        {mobileLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-12 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 text-center text-[9px] font-bold leading-tight ${isActive ? "bg-red-50 text-red-800" : "text-slate-500"}`}>
            <Icon size={16} /><span className="truncate">{label.replace("Scaffold operations", "Scaffolds").replace("Payments & expenses", "Finance")}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
