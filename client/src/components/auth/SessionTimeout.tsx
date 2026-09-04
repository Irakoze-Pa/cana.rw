import { useCallback, useEffect, useRef, useState } from "react";
import { Clock3, LogOut, ShieldCheck } from "lucide-react";

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;
const LAST_ACTIVITY_KEY = "cana:last-session-activity";

/** Enforces an inactivity timeout across browser tabs without extending the JWT lifetime. */
export default function SessionTimeout({ children, token, logout }: { children: React.ReactNode; token: string | null; logout: () => void }) {
  const [warning, setWarning] = useState(false);
  const [expired, setExpired] = useState(false);
  const warningTimer = useRef<number | undefined>(undefined);
  const expiryTimer = useRef<number | undefined>(undefined);
  const lastUpdate = useRef(0);

  const clearTimers = () => { window.clearTimeout(warningTimer.current); window.clearTimeout(expiryTimer.current); };
  const endSession = useCallback(() => { clearTimers(); setWarning(false); logout(); setExpired(true); }, [logout]);
  const schedule = useCallback((activityAt: number) => {
    clearTimers();
    const elapsed = Date.now() - activityAt;
    const remaining = INACTIVITY_TIMEOUT_MS - elapsed;
    if (remaining <= 0) { endSession(); return; }
    warningTimer.current = window.setTimeout(() => setWarning(true), Math.max(0, remaining - WARNING_BEFORE_MS));
    expiryTimer.current = window.setTimeout(endSession, remaining);
  }, [endSession]);
  const renew = useCallback(() => {
    if (!token || expired) return;
    const now = Date.now();
    if (now - lastUpdate.current < 10_000) return;
    lastUpdate.current = now;
    localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    setWarning(false);
    schedule(now);
  }, [expired, schedule, token]);

  useEffect(() => {
    if (!token) { clearTimers(); setWarning(false); return; }
    setExpired(false);
    const saved = Number(localStorage.getItem(LAST_ACTIVITY_KEY));
    const activityAt = Number.isFinite(saved) && saved > 0 ? saved : Date.now();
    if (!saved) localStorage.setItem(LAST_ACTIVITY_KEY, String(activityAt));
    lastUpdate.current = activityAt;
    schedule(activityAt);
    const activityEvents: Array<keyof WindowEventMap> = ["mousedown", "keydown", "scroll", "touchstart", "pointerdown"];
    activityEvents.forEach((event) => window.addEventListener(event, renew, { passive: true }));
    const onVisibility = () => { if (document.visibilityState === "visible") { const recent = Number(localStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now(); schedule(recent); } };
    const onStorage = (event: StorageEvent) => { if (event.key === LAST_ACTIVITY_KEY && event.newValue) schedule(Number(event.newValue)); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    return () => { clearTimers(); activityEvents.forEach((event) => window.removeEventListener(event, renew)); document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("storage", onStorage); };
  }, [renew, schedule, token]);

  return <>{children}{warning && token && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><span className="inline-flex rounded-2xl bg-amber-50 p-3 text-amber-700"><Clock3 size={24}/></span><h2 className="mt-4 text-xl font-extrabold text-slate-950">Your session is about to end</h2><p className="mt-2 text-sm leading-6 text-slate-600">For security, CANA signs out inactive users after 30 minutes. Continue working to keep your session active.</p><div className="mt-6 flex gap-3"><button onClick={renew} className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700">Continue session</button><button onClick={endSession} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Sign out</button></div></div></div>}{expired && <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/55 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl"><span className="mx-auto inline-flex rounded-2xl bg-red-50 p-3 text-red-700"><ShieldCheck size={25}/></span><h2 className="mt-4 text-xl font-extrabold text-slate-950">Session signed out</h2><p className="mt-2 text-sm leading-6 text-slate-600">You were signed out after 30 minutes without activity. Sign in again to continue securely.</p><button onClick={() => { setExpired(false); window.location.assign("/"); }} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"><LogOut size={16}/>Return to sign in</button></div></div>}</>;
}
