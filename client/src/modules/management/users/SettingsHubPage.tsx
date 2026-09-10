import { Building2, ChevronRight, ShieldCheck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";

const settings = [
  { title: "My profile", text: "Update your name, contact details and role information.", to: "/management/profile", icon: UserRound },
  { title: "Factory controls", text: "Maintain facility, safety and inspection preferences.", to: "/management/compliance/settings", icon: ShieldCheck },
  { title: "Organisation details", text: "Company identity, documents and bank details are managed through approved administration workflows.", to: "/management/profile", icon: Building2 },
];

export default function SettingsHubPage() {
  return <div className="mx-auto max-w-5xl space-y-6"><header className="border-b border-slate-200 pb-6"><p className="cana-section-kicker">Administration</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">Settings</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage your workspace details and operational controls from one clear place.</p></header><section className="grid gap-4 md:grid-cols-3">{settings.map(({ title, text, to, icon: Icon }) => <Link key={title} to={to} className="cana-panel group flex min-h-48 flex-col p-5 transition hover:border-slate-300 hover:shadow-md"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><Icon size={19}/></span><h2 className="mt-5 text-base font-extrabold text-slate-950">{title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-slate-500">{text}</p><span className="mt-4 flex items-center gap-1 text-sm font-bold text-slate-700">Open settings <ChevronRight size={16} className="transition group-hover:translate-x-0.5"/></span></Link>)}</section></div>;
}
