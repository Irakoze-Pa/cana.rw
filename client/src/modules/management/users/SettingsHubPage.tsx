import { Building2, ChevronRight, ShieldCheck, UserCog, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/authContext";

export default function SettingsHubPage() {
  const { user } = useAuth();
  const canManageUsers = user?.role === "superadmin";
  const cards = [
    { title: "My profile", text: "Name, phone, email and job title.", to: "/management/profile", icon: UserRound },
    ...(canManageUsers ? [{ title: "Users & access", text: "Create staff accounts and assign workspaces.", to: "/management/staff", icon: UserCog }] : []),
    { title: "Company documents", text: "Use official company details in printable records.", to: "/management/profile", icon: Building2 },
  ];
  return <main className="mx-auto max-w-5xl space-y-5"><header className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="cana-section-kicker">Workspace</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Settings</h1></div><p className="flex items-center gap-2 text-sm font-semibold text-slate-600"><ShieldCheck size={17} className="text-red-700" />Only controls relevant to your account are shown.</p></header><section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{cards.map(({ title, text, to, icon: Icon }) => <Link key={title} to={to} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700"><Icon size={17} /></span><h2 className="mt-4 font-extrabold text-slate-950">{title}</h2><p className="mt-1 text-sm leading-5 text-slate-500">{text}</p><span className="mt-4 flex items-center gap-1 text-sm font-bold text-slate-700">Open <ChevronRight size={16} className="transition group-hover:translate-x-0.5" /></span></Link>)}</section></main>;
}
