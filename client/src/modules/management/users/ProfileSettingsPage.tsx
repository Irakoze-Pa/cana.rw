import { BriefcaseBusiness, Building2, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/authContext";
import { useToast } from "@/context/toastContext";

const readable = (value?: string) => value ? value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Not assigned";

export default function ProfileSettingsPage() {
  const { user, token, login } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: user?.fullName || "", phone: user?.phone || "", email: user?.email || "", jobTitle: user?.jobTitle || "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user || !token) return;
    setSaving(true); setError("");
    try {
      const response = await api.patch<{ data: typeof user }>("/users/me", form);
      login(response.data.data, token);
      toast("Profile saved.", "success");
    } catch (error) { setError(error instanceof Error ? error.message : "Unable to save your profile."); }
    finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-5xl space-y-5">
    <header className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div><p className="cana-section-kicker">Account</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">My profile</h1></div>
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-600"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-700"><ShieldCheck size={16} /></span>Your work access is managed centrally</div>
    </header>
    {error && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm font-medium text-red-700">{error}</p>}
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <form onSubmit={save} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700"><UserRound size={19} /></span><div><h2 className="font-extrabold text-slate-950">Personal details</h2><p className="mt-0.5 text-sm text-slate-500">Keep your contact information current.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2"><Field label="Full name" value={form.fullName} onChange={(value) => setForm({ ...form, fullName: value })} required /><Field label="Phone number" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} required /><Field label="Email address" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} /><Field label="Job title" value={form.jobTitle} onChange={(value) => setForm({ ...form, jobTitle: value })} /></div>
        <div className="mt-5 flex justify-end border-t border-slate-100 pt-4"><button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-lg bg-red-700 px-4 text-sm font-bold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"><Save size={16} />{saving ? "Saving…" : "Save changes"}</button></div>
      </form>
      <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-extrabold uppercase tracking-[.14em] text-slate-500">Workspace access</p><div className="mt-4 space-y-3"><AccessRow icon={BriefcaseBusiness} label="Role" value={readable(user?.role)} /><AccessRow icon={Building2} label="Business unit" value={readable(user?.company)} /><AccessRow icon={ShieldCheck} label="Department" value={readable(user?.department)} /><AccessRow icon={Mail} label="Account email" value={user?.email || "Not provided"} /></div></aside>
    </section>
  </main>;
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) {
  return <label className="text-xs font-bold text-slate-600">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100" /></label>;
}

function AccessRow({ icon: Icon, label, value }: { icon: typeof ShieldCheck; label: string; value: string }) {
  return <div className="flex gap-2.5"><span className="mt-0.5 text-slate-400"><Icon size={16} /></span><div className="min-w-0"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-0.5 truncate text-sm font-bold text-slate-800">{value}</p></div></div>;
}
