import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Info, X } from "lucide-react";

type Tone = "success" | "error" | "warning" | "info";
type Toast = { id: number; message: string; tone: Tone };
type ToastContextValue = { toast: (message: string, tone?: Tone) => void };
const ToastContext = createContext<ToastContextValue | undefined>(undefined);
const style = { success: "border-emerald-200 bg-emerald-50 text-emerald-800", error: "border-red-200 bg-red-50 text-red-800", warning: "border-amber-200 bg-amber-50 text-amber-800", info: "border-blue-200 bg-blue-50 text-blue-800" };
const Icon = ({ tone }: { tone: Tone }) => tone === "success" ? <CheckCircle2 size={18} /> : tone === "error" ? <CircleAlert size={18} /> : tone === "warning" ? <CircleAlert size={18} /> : <Info size={18} />;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]); const id = useRef(0);
  const toast = useCallback((message: string, tone: Tone = "info") => { const next = ++id.current; setToasts((current) => [...current.slice(-4), { id: next, message, tone }]); window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== next)), 5000); }, []);
  useEffect(() => { const originalAlert = window.alert; window.alert = (message?: string) => toast(String(message || ""), /fail|error|invalid|unable|cannot|required/i.test(String(message)) ? "error" : "info"); return () => { window.alert = originalAlert; }; }, [toast]);
  return <ToastContext.Provider value={{ toast }}>{children}<div className="pointer-events-none fixed right-4 top-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">{toasts.map((item) => <div key={item.id} role="status" className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3 shadow-lg ${style[item.tone]}`}><Icon tone={item.tone} /><p className="flex-1 text-sm font-medium leading-5">{item.message}</p><button type="button" aria-label="Dismiss notification" onClick={() => setToasts((current) => current.filter((toast) => toast.id !== item.id))} className="rounded p-0.5 opacity-70 hover:bg-white/50"><X size={16} /></button></div>)}</div></ToastContext.Provider>;
}
export function useToast() { const context = useContext(ToastContext); if (!context) throw new Error("useToast must be used inside ToastProvider."); return context; }
