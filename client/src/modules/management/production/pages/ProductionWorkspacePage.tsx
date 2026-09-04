import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ClipboardCheck,
  Factory,
  History,
  RefreshCw,
  TimerReset,
} from "lucide-react";
import { Link } from "react-router-dom";
import api from "@/services/api";

type View = "overview" | "quality" | "history" | "waste";
type Batch = {
  _id: string;
  batchNo: string;
  productName: string;
  status:
    "Planned" | "Ready" | "In Progress" | "Paused" | "Completed" | "Cancelled";
  plannedQuantity: number;
  actualQuantity: number;
  unit: string;
  updatedAt: string;
  finishedGoodsPostedAt?: string;
};
const pageMeta = {
  overview: {
    title: "Production overview",
    description: "Live view of every batch and the work that needs attention.",
    icon: Factory,
  },
  quality: {
    title: "Ready & paused batches",
    description:
      "Check batches waiting to start or requiring a supervisor decision. Completed batches have already posted to finished goods.",
    icon: ClipboardCheck,
  },
  history: {
    title: "Production history",
    description: "Completed and cancelled batches with output traceability.",
    icon: History,
  },
  waste: {
    title: "Output variance",
    description:
      "Completed batches where actual output differs from the planned quantity.",
    icon: AlertTriangle,
  },
} as const;
const qty = (value: number) =>
  Number(value || 0).toLocaleString("en-RW", { maximumFractionDigits: 2 });
const statusStyle: Record<Batch["status"], string> = {
  Planned: "bg-slate-100 text-slate-700",
  Ready: "bg-slate-100 text-slate-700",
  "In Progress": "bg-slate-200 text-slate-800",
  Paused: "bg-amber-100 text-amber-700",
  Completed: "bg-slate-100 text-slate-700",
  Cancelled: "bg-red-100 text-red-700",
};

export default function ProductionWorkspacePage({ view }: { view: View }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const meta = pageMeta[view];
  const Icon = meta.icon;
  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get<{ data: Batch[] }>("/production-batches");
      setBatches(response.data.data || []);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to load production batches.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const visible = useMemo(
    () =>
      batches.filter((batch) =>
        view === "quality"
          ? ["Ready", "Paused"].includes(batch.status)
          : view === "history"
            ? ["Completed", "Cancelled"].includes(batch.status)
            : view === "waste"
              ? batch.status === "Completed" &&
                Math.abs(batch.actualQuantity - batch.plannedQuantity) > 0.0001
              : true,
      ),
    [batches, view],
  );
  const metrics = useMemo(
    () => ({
      active: batches.filter((batch) =>
        ["Ready", "In Progress", "Paused"].includes(batch.status),
      ).length,
      inProgress: batches.filter((batch) => batch.status === "In Progress")
        .length,
      paused: batches.filter((batch) => batch.status === "Paused").length,
      completed: batches.filter((batch) => batch.status === "Completed").length,
    }),
    [batches],
  );
  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Icon size={21} />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">Operations workspace</p>
            <h1 className="text-2xl font-bold text-gray-900">{meta.title}</h1>
            <p className="mt-1 text-sm text-gray-500">{meta.description}</p>
          </div>
        </div>
        <div className="flex gap-2"><Link to="/management/reports" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700">Period report</Link><button
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button></div>
      </header>
      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Active batches"
          value={metrics.active}
          icon={<Factory size={18} />}
        />
        <Metric
          label="In progress"
          value={metrics.inProgress}
          icon={<TimerReset size={18} />}
        />
        <Metric
          label="Paused / attention"
          value={metrics.paused}
          icon={<AlertTriangle size={18} />}
          warning={metrics.paused > 0}
        />
        <Metric
          label="Completed"
          value={metrics.completed}
          icon={<ClipboardCheck size={18} />}
        />
      </section>
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-5">
          <div>
            <h2 className="font-bold text-slate-900">
              {view === "waste" ? "Variance register" : "Batch register"}
            </h2>
            <p className="text-sm text-gray-500">
              {visible.length} matching batch{visible.length === 1 ? "" : "es"}
            </p>
          </div>
          {view === "waste" && (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Review causes before the next batch
            </span>
          )}
        </div>
        {loading ? (
          <p className="p-10 text-center text-sm text-gray-500">
            Loading production records…
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3">Batch</th>
                  <th className="px-5 py-3">Product</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Planned</th>
                  <th className="px-5 py-3 text-right">Actual</th>
                  {view === "waste" && (
                    <th className="px-5 py-3 text-right">Variance</th>
                  )}
                  <th className="px-5 py-3">Finished goods</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((batch) => {
                  const variance = batch.actualQuantity - batch.plannedQuantity;
                  return (
                    <tr key={batch._id}>
                      <td className="px-5 py-4 font-semibold text-gray-900">
                        {batch.batchNo}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {batch.productName}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle[batch.status]}`}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        {qty(batch.plannedQuantity)} {batch.unit}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold">
                        {qty(batch.actualQuantity)} {batch.unit}
                      </td>
                      {view === "waste" && (
                        <td
                          className={`px-5 py-4 text-right font-semibold ${variance < 0 ? "text-red-700" : "text-emerald-700"}`}
                        >
                          {variance > 0 ? "+" : ""}
                          {qty(variance)} {batch.unit}
                        </td>
                      )}
                      <td className="px-5 py-4">
                        {batch.finishedGoodsPostedAt ? (
                          <span className="text-xs font-semibold text-emerald-700">
                            Posted to Production Store
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">
                            Not posted
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-gray-500">
                        {new Date(batch.updatedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr>
                    <td
                      colSpan={view === "waste" ? 8 : 7}
                      className="px-5 py-10 text-center text-gray-500"
                    >
                      No production records match this view.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
function Metric({
  label,
  value,
  icon,
  warning,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <span
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${warning ? "bg-amber-50 text-amber-700" : "bg-gray-50 text-gray-600"}`}
      >
        {icon}
      </span>
      <p className="mt-4 text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </article>
  );
}
