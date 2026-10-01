import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

type ConfirmationTone = "danger" | "warning" | "primary";
type ConfirmationOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ConfirmationTone;
};

type PendingConfirmation = ConfirmationOptions & { resolve: (confirmed: boolean) => void };
type ConfirmationContextValue = { confirm: (options: ConfirmationOptions) => Promise<boolean> };

const ConfirmationContext = createContext<ConfirmationContextValue | undefined>(undefined);

const appearance: Record<ConfirmationTone, { icon: string; button: string }> = {
  danger: { icon: "bg-red-50 text-red-700", button: "bg-red-700 hover:bg-red-800 focus-visible:ring-red-600" },
  warning: { icon: "bg-amber-50 text-amber-700", button: "bg-slate-950 hover:bg-slate-800 focus-visible:ring-slate-700" },
  primary: { icon: "bg-slate-100 text-slate-700", button: "bg-slate-950 hover:bg-slate-800 focus-visible:ring-slate-700" },
};

export function ConfirmationProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((options: ConfirmationOptions) => new Promise<boolean>((resolve) => {
    setPending({ ...options, resolve });
  }), []);

  const close = useCallback((confirmed: boolean) => {
    setPending((current) => {
      current?.resolve(confirmed);
      return null;
    });
  }, []);

  useEffect(() => {
    if (!pending) return;
    cancelButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [close, pending]);

  const tone = pending?.tone ?? "warning";
  const styles = appearance[tone];
  return <ConfirmationContext.Provider value={{ confirm }}>
    {children}
    {pending && <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(false); }}>
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start gap-3 px-5 pb-3 pt-5">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${styles.icon}`}>{tone === "primary" ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}</span>
          <div className="min-w-0 flex-1 pr-2"><h2 id="confirmation-title" className="text-base font-extrabold text-slate-950">{pending.title}</h2><p id="confirmation-description" className="mt-1.5 text-sm leading-6 text-slate-600">{pending.description}</p></div>
          <button type="button" aria-label="Cancel confirmation" onClick={() => close(false)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
        </div>
        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end">
          <button ref={cancelButton} type="button" onClick={() => close(false)} className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">{pending.cancelLabel ?? "Cancel"}</button>
          <button type="button" onClick={() => close(true)} className={`rounded-lg px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${styles.button}`}>{pending.confirmLabel ?? "Confirm"}</button>
        </footer>
      </section>
    </div>}
  </ConfirmationContext.Provider>;
}

export function useConfirmation() {
  const context = useContext(ConfirmationContext);
  if (!context) throw new Error("useConfirmation must be used inside ConfirmationProvider.");
  return context;
}
