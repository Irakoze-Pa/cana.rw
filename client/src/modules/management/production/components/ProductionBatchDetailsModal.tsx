import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, FileText, Package, Printer, X } from "lucide-react";
import type { ProductionBatch } from "../types/productionBatch.types";

interface Props { isOpen: boolean; onClose: () => void; batch: ProductionBatch | null; onPrint?: () => void | Promise<void>; onOpenRecipe?: () => void | Promise<void> }
const date = (value?: string, time = false) => { if (!value) return "—"; const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? "—" : time ? parsed.toLocaleString("en-RW") : parsed.toLocaleDateString("en-RW", { day: "2-digit", month: "short", year: "numeric" }); };
const number = (value?: number) => Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 2 });
const money = (value?: number) => `${number(value)} RWF`;
const statusClass = (status: ProductionBatch["status"]) => status === "Completed" ? "bg-emerald-50 text-emerald-700" : status === "In Progress" ? "bg-amber-50 text-amber-800" : status === "Cancelled" ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700";

export default function ProductionBatchDetailsModal({ isOpen, onClose, batch, onPrint, onOpenRecipe }: Props) {
  if (!isOpen || !batch) return null;
  const planned = Number(batch.plannedQuantity || 0), actual = Number(batch.actualQuantity || 0);
  const product = typeof batch.product === "object" ? batch.product : undefined;
  const packSizeKg = Math.max(.001, Number(product?.packSizeKg || 30));
  const packLabel = product?.unit || `${number(packSizeKg)} kg`;
  const yieldPercent = planned > 0 ? actual / planned * 100 : 0;
  const fullPacks = Math.floor(actual / packSizeKg), remainderKg = actual - fullPacks * packSizeKg;
  const totalCost = Number(batch.actualMaterialCost || 0) + Number(batch.allocatedLaborCost || 0) + Number(batch.allocatedEnergyCost || 0) + Number(batch.allocatedOtherCost || 0);
  const costPerKg = actual > 0 ? totalCost / actual : Number(batch.costPerKg || 0);
  const costPerPack = costPerKg * packSizeKg || Number(batch.costPerPack || 0);
  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/55 p-3 backdrop-blur-sm" onMouseDown={(event) => event.currentTarget === event.target && onClose()}>
      <section role="dialog" aria-modal="true" aria-label={`Production batch ${batch.batchNo}`} className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-black uppercase tracking-[.15em] text-red-700">Production batch</p><span className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${statusClass(batch.status)}`}>{batch.status}</span></div><h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950">{batch.batchNo}</h2><p className="truncate text-xs text-slate-500">{batch.productName} · {batch.productCode || "No product code"}</p></div>
          <div className="flex shrink-0 gap-1.5">{onPrint && <button type="button" onClick={() => void onPrint()} className="inline-flex h-9 items-center gap-1.5 rounded-md bg-slate-950 px-3 text-xs font-bold text-white hover:bg-black"><Printer size={14}/><span className="hidden sm:inline">Print record</span></button>}<button type="button" onClick={onClose} aria-label="Close batch details" className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100"><X size={16}/></button></div>
        </header>
        <div className="grid grid-cols-2 divide-x divide-y divide-slate-200 border-b border-slate-200 bg-slate-50 sm:grid-cols-4 sm:divide-y-0"><Metric label="Planned output" value={`${number(planned)} ${batch.unit}`}/><Metric label="Actual output" value={`${number(actual)} ${batch.unit}`}/><Metric label="Pack output" value={`${number(fullPacks)} packs${remainderKg ? ` + ${number(remainderKg)} kg` : ""}`}/><Metric label="Production yield" value={`${number(yieldPercent)}%`}/></div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1.15fr_.85fr]">
            <div className="space-y-3">
              <Section title="Production identity" icon={<Package size={15}/>}><div className="grid gap-x-5 gap-y-3 sm:grid-cols-2"><Detail label="Product" value={batch.productName} subvalue={batch.productCode}/><Detail label="Source formula" value={batch.formulaName} subvalue={`${batch.formulaCode} · Version ${batch.formulaVersion}`}/><Detail label="Production lot" value={batch.lotNumber || "—"}/><Detail label="Supervisor" value={batch.supervisorName || "Not assigned"}/></div></Section>
              {Boolean(batch.formulaSnapshot?.length) && <Section title={`Batch formula · ${batch.formulaSnapshot?.length || 0} materials`} icon={<ClipboardList size={15}/>}><div className="divide-y divide-slate-100">{batch.formulaSnapshot?.map((item, index) => <div key={`${String(typeof item.rawMaterial === "string" ? item.rawMaterial : item.rawMaterial?._id)}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 py-2 first:pt-0 last:pb-0"><span className="min-w-0"><strong className="block truncate text-xs text-slate-950">{item.rawMaterialName}</strong><small className="text-[9px] text-slate-500">{item.rawMaterialCode}</small></span><strong className="text-xs text-slate-950">{number(item.quantity)} {item.unit}</strong></div>)}</div></Section>}
              <Section title="Production schedule" icon={<CalendarDays size={15}/>}><div className="grid grid-cols-2 gap-x-5 gap-y-3 sm:grid-cols-4"><Detail label="Start date" value={date(batch.startDate)}/><Detail label="End date" value={date(batch.endDate)}/><Detail label="Created" value={date(batch.createdAt, true)}/><Detail label="Updated" value={date(batch.updatedAt, true)}/></div></Section>
              <Section title="Notes" icon={<FileText size={15}/>}><p className="text-xs leading-5 text-slate-600">{batch.notes?.trim() || "No notes recorded for this batch."}</p></Section>
            </div>
            <div className="space-y-3">
              <Section title="Production cost" icon={<ClipboardList size={15}/>}>
                {batch.costedAt || totalCost > 0 ? <><div className="grid grid-cols-2 gap-2"><Cost label="Issued materials" value={batch.actualMaterialCost}/><Cost label="Labour" value={batch.allocatedLaborCost}/><Cost label="Energy" value={batch.allocatedEnergyCost}/><Cost label="Other overhead" value={batch.allocatedOtherCost}/></div><div className="mt-3 border-t border-slate-200 pt-3"><CostLine label="Total production cost" value={money(totalCost)} strong/><CostLine label="Cost per kg" value={money(costPerKg)}/><CostLine label={`Cost per ${packLabel} pack`} value={money(costPerPack)}/>{batch.costedAt && <p className="mt-2 text-[9px] text-slate-500">Cost frozen {date(batch.costedAt, true)}</p>}</div></> : <p className="py-4 text-center text-xs text-slate-500">Cost becomes available after materials are issued and the batch is completed.</p>}
              </Section>
              {onOpenRecipe && <button type="button" onClick={() => void onOpenRecipe()} className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs font-extrabold text-slate-800 hover:border-slate-400"><span className="inline-flex items-center gap-2"><ClipboardList size={15} className="text-red-700"/>{batch.status === "Completed" ? "View saved batch formula" : "Review or edit batch formula"}</span><ArrowRight size={14}/></button>}
              {batch.status === "Completed" && <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800"><CheckCircle2 size={16} className="mt-0.5 shrink-0"/><span><strong>Stock posted.</strong> Completed output is in the Production Store.</span></div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="min-w-0 px-3 py-2.5"><p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 truncate text-sm font-black text-slate-950" title={value}>{value}</p></div>; }
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) { return <section className="overflow-hidden rounded-xl border border-slate-200 bg-white"><header className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-950">{icon}{title}</header><div className="p-3">{children}</div></section>; }
function Detail({ label, value, subvalue }: { label: string; value: string; subvalue?: string }) { return <div className="min-w-0"><p className="text-[9px] font-extrabold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-0.5 truncate text-xs font-extrabold text-slate-950" title={value}>{value}</p>{subvalue && <p className="mt-0.5 truncate text-[10px] text-slate-500">{subvalue}</p>}</div>; }
function Cost({ label, value }: { label: string; value?: number }) { return <div className="rounded-md bg-slate-50 px-2.5 py-2"><p className="text-[9px] font-bold text-slate-500">{label}</p><p className="mt-0.5 truncate text-xs font-black text-slate-950">{money(value)}</p></div>; }
function CostLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) { return <div className="mt-1 flex items-center justify-between gap-3 first:mt-0"><span className={`${strong ? "font-bold text-slate-700" : "text-slate-500"} text-xs`}>{label}</span><strong className={`${strong ? "text-sm" : "text-xs"} text-slate-950`}>{value}</strong></div>; }
