import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Factory,
  Package,
  PackageCheck,
  RefreshCw,
  Send,
  XCircle,
} from "lucide-react";

import type {
  MaterialConsumption,
  MaterialConsumptionItem,
} from "../types/materialConsumption.types";

import {
  getMaterialConsumptionById,
  updateBatchRecipe,
} from "../services/materialConsumption.service";

import IssueMaterialsModal from "../components/IssueMaterialsModal";
import { updateProductionBatch } from "../../production/services/productionBatch.service";
import { useConfirmation } from "@/context/confirmationContext";
import { useToast } from "@/context/toastContext";

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

const safeNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value: unknown, maximumFractionDigits = 2): string => {
  return safeNumber(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits,
  });
};

const formatDate = (value?: string | Date | null): string => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatDateTime = (value?: string | Date | null): string => {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getBatchName = (
  batch: MaterialConsumption["productionBatch"],
): string => {
  if (!batch) return "-";

  if (typeof batch === "string") {
    return batch;
  }

  return batch.batchNo || batch.batchNumber || batch._id || "-";
};

const getProductionOrderName = (
  order: MaterialConsumption["productionOrder"],
): string => {
  if (!order) return "-";

  if (typeof order === "string") {
    return order;
  }

  return order.productionOrderNo || order._id || "-";
};

const getStatusClasses = (status: MaterialConsumption["status"]): string => {
  switch (status) {
    case "Draft":
      return "border-slate-200 bg-slate-100 text-slate-700";

    case "Issued":
      return "border-slate-200 bg-slate-50 text-slate-700";

    case "Partially Consumed":
      return "border-amber-200 bg-amber-50 text-amber-700";

    case "Consumed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";

    case "Cancelled":
      return "border-red-200 bg-red-50 text-red-700";

    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
};

/* ========================================================================== */
/* COMPONENT                                                                  */
/* ========================================================================== */

export default function RawMaterialConsumptionDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { confirm } = useConfirmation();
  const { toast } = useToast();

  const [consumption, setConsumption] = useState<MaterialConsumption | null>(
    null,
  );

  const [loading, setLoading] = useState<boolean>(true);

  const [error, setError] = useState<string | null>(null);

  const [issueModalOpen, setIssueModalOpen] = useState<boolean>(false);
  const [postingBatch, setPostingBatch] = useState<boolean>(false);

  const [recipeEditorOpen, setRecipeEditorOpen] = useState<boolean>(false);

  const [recipeQuantities, setRecipeQuantities] = useState<string[]>([]);

  const [savingRecipe, setSavingRecipe] = useState<boolean>(false);

  const [recipeError, setRecipeError] = useState<string>("");

  const [finishedOutput, setFinishedOutput] = useState<string>("");

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  const loadConsumption = useCallback(async () => {
    if (!id) {
      setError("Material consumption ID is missing.");

      setLoading(false);

      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await getMaterialConsumptionById(id);

      /*
       * Supports:
       *
       * 1. MaterialConsumption
       *
       * 2. { data: MaterialConsumption }
       */

      const data = (response as any)?.data ?? response;

      if (!data) {
        throw new Error("Material consumption was not found.");
      }

      setConsumption(data);
    } catch (err: any) {
      console.error("Load material consumption error:", err);

      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to load material consumption.",
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadConsumption();
  }, [loadConsumption]);

  useEffect(() => {
    if (!consumption || finishedOutput) return;
    const requestedOutput = safeNumber(searchParams.get("actualQuantity"));
    const savedOutput =
      typeof consumption.productionBatch === "object"
        ? safeNumber(consumption.productionBatch.actualQuantity)
        : 0;
    if (requestedOutput > 0 || savedOutput > 0) {
      setFinishedOutput(String(requestedOutput || savedOutput));
    }
  }, [consumption, finishedOutput, searchParams]);

  /* ------------------------------------------------------------------------ */
  /* NORMALIZE ITEMS                                                          */
  /* ------------------------------------------------------------------------ */

  const items = useMemo<MaterialConsumptionItem[]>(() => {
    if (!consumption || !Array.isArray(consumption.items)) {
      return [];
    }

    return consumption.items.map((item) => ({
      ...item,

      standardQuantity: safeNumber(item.standardQuantity),

      issuedQuantity: safeNumber(item.issuedQuantity),

      actualQuantity: safeNumber(item.actualQuantity),

      wasteQuantity: safeNumber(item.wasteQuantity),

      returnQuantity: safeNumber(item.returnQuantity),

      varianceQuantity: safeNumber(item.varianceQuantity),

      variancePercentage: safeNumber(item.variancePercentage),
    }));
  }, [consumption]);

  /* ------------------------------------------------------------------------ */
  /* LOADING                                                                  */
  /* ------------------------------------------------------------------------ */

  if (loading) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex min-h-[500px] items-center justify-center">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-slate-200 border-t-red-600" />

              <p className="mt-4 text-sm font-medium text-slate-500">
                Loading material consumption...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* ERROR                                                                    */
  /* ------------------------------------------------------------------------ */

  if (error || !consumption) {
    return (
      <div className="min-h-full bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-100 bg-white p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
                <XCircle size={28} className="text-red-600" />
              </div>

              <h2 className="mt-4 text-lg font-bold text-slate-900">
                Unable to load material consumption
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {error || "Material consumption was not found."}
              </p>

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate("/management/production/consumption")}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  <ArrowLeft size={16} />
                  Back
                </button>

                <button
                  type="button"
                  onClick={() => void loadConsumption()}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <RefreshCw size={16} />
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------------------------ */
  /* SUMMARY VALUES                                                           */
  /* ------------------------------------------------------------------------ */

  const totalIssued = safeNumber(consumption.totalIssuedQuantity);

  const totalActual = safeNumber(consumption.totalActualQuantity);

  const totalWaste = safeNumber(consumption.totalWasteQuantity);

  const totalReturn = safeNumber(consumption.totalReturnQuantity);

  const accountedQuantity = totalActual + totalWaste + totalReturn;

  const reconciliationPercentage =
    totalIssued > 0
      ? Math.min(100, (accountedQuantity / totalIssued) * 100)
      : 0;

  const isDraft = consumption.status === "Draft";

  const completionRequested = searchParams.get("completeBatch") === "1";
  const completionQuantity = safeNumber(finishedOutput);
  const completionUnit =
    searchParams.get("unit") ||
    (typeof consumption.productionBatch === "object"
      ? consumption.productionBatch.unit
      : undefined) ||
    "kg";
  const batchStatus =
    typeof consumption.productionBatch === "object"
      ? consumption.productionBatch.status
      : undefined;
  const canIssue = isDraft && batchStatus === "In Progress";
  const showCompletion =
    consumption.status !== "Cancelled" &&
    consumption.status !== "Consumed" &&
    (completionRequested ||
      ["In Progress", "Paused"].includes(batchStatus || ""));
  const productionBatchId =
    typeof consumption.productionBatch === "string"
      ? consumption.productionBatch
      : consumption.productionBatch?._id;

  const completeAndPostBatch = async () => {
    if (!productionBatchId) {
      toast("The production batch reference is missing.", "error");
      return;
    }
    if (completionQuantity <= 0) {
      toast("The finished output quantity must be greater than zero.", "error");
      return;
    }
    if (batchStatus !== "In Progress") {
      toast("Resume the production batch before completing it.", "error");
      return;
    }
    if (isDraft) {
      toast("Issue the reviewed raw materials before completing the batch.", "error");
      setIssueModalOpen(true);
      return;
    }
    if (consumption.status === "Cancelled") {
      toast("A cancelled material consumption cannot complete a batch.", "error");
      return;
    }

    const approved = await confirm({
      title: "Post completed production",
      description: `Confirm ${getBatchName(consumption.productionBatch)} with ${formatNumber(completionQuantity)} ${completionUnit} finished output. Issued materials will be locked as consumed and finished goods will be posted to the Production Store.`,
      confirmLabel: "Confirm & post stock",
      tone: "warning",
    });
    if (!approved) return;

    try {
      setPostingBatch(true);
      await updateProductionBatch(productionBatchId, {
        status: "Completed",
        actualQuantity: completionQuantity,
      });
      window.dispatchEvent(new Event("cana:stock-updated"));
      toast("Production batch completed and stock posted.", "success");
      navigate("/management/production/batches");
    } catch (cause) {
      toast(
        cause instanceof Error
          ? cause.message
          : "Failed to complete and post the production batch.",
        "error",
      );
    } finally {
      setPostingBatch(false);
    }
  };

  const openRecipeEditor = () => {
    setRecipeError("");
    setRecipeQuantities(items.map((item) => String(item.standardQuantity)));
    setRecipeEditorOpen(true);
  };

  const saveBatchRecipe = async () => {
    const quantities = recipeQuantities.map((quantity) => Number(quantity));
    if (
      quantities.some((quantity) => !Number.isFinite(quantity) || quantity < 0)
    ) {
      setRecipeError("Each recipe quantity must be zero or greater.");
      return;
    }
    if (!quantities.some((quantity) => quantity > 0)) {
      setRecipeError("Enter a quantity for at least one raw material.");
      return;
    }
    try {
      setSavingRecipe(true);
      setRecipeError("");
      const recipeItems = quantities.map((standardQuantity) => ({
        standardQuantity,
      }));
      const updated = await updateBatchRecipe(consumption._id, recipeItems);
      setConsumption((updated as any)?.data ?? updated);
      setRecipeEditorOpen(false);
      toast("Batch recipe saved for this production only.", "success");
    } catch (err) {
      setRecipeError(
        err instanceof Error
          ? err.message
          : "Could not update the batch recipe.",
      );
    } finally {
      setSavingRecipe(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl space-y-4">
        {/* ================================================================ */}
        {/* HEADER                                                            */}
        {/* ================================================================ */}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-3">
            <Link
              to="/management/production/consumption"
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
            >
              <ArrowLeft size={18} />
            </Link>

            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {consumption.consumptionNo || "Material Consumption"}
                </h1>

                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                    consumption.status,
                  )}`}
                >
                  {consumption.status}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void loadConsumption()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>

            {canIssue && (
              <button
                type="button"
                onClick={openRecipeEditor}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <ClipboardCheck size={17} />
                Edit batch recipe
              </button>
            )}

          </div>
        </div>

        {showCompletion && (
          <section className="rounded-2xl border border-red-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
                    Completion review
                  </span>
                  <span className="text-sm font-semibold text-slate-600">
                    {getBatchName(consumption.productionBatch)}
                  </span>
                </div>
                <p className="mt-2 text-lg font-extrabold text-slate-950">
                  Confirm finished production
                </p>
                <div className="mt-3 flex max-w-sm items-center overflow-hidden rounded-xl border border-slate-300 bg-white focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100">
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={finishedOutput}
                    onChange={(event) => setFinishedOutput(event.target.value)}
                    placeholder="Finished quantity"
                    className="h-11 min-w-0 flex-1 px-3 text-sm font-bold text-slate-950 outline-none"
                  />
                  <span className="border-l border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-600">
                    {completionUnit}
                  </span>
                </div>
                {batchStatus === "Paused" ? (
                  <p className="mt-2 text-sm font-semibold text-amber-700">
                    Resume the batch before issuing materials or completing production.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-600">
                    {isDraft
                      ? "Review the batch recipe, then issue materials from the correct lots."
                      : "Materials are issued. Confirm the real finished output to post stock."}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  isDraft
                    ? setIssueModalOpen(true)
                    : void completeAndPostBatch()
                }
                disabled={
                  postingBatch ||
                  consumption.status === "Cancelled" ||
                  batchStatus === "Paused"
                }
                className="inline-flex min-w-52 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {postingBatch ? (
                  <RefreshCw size={17} className="animate-spin" />
                ) : isDraft ? (
                  <PackageCheck size={17} />
                ) : (
                  <Send size={17} />
                )}
                {postingBatch
                  ? "Posting stock..."
                  : isDraft
                    ? "Issue materials first"
                    : "Complete & post batch"}
              </button>
            </div>
          </section>
        )}

        {/* ================================================================ */}
        {/* INFORMATION CARDS                                                */}
        {/* ================================================================ */}

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {/* PRODUCT */}

          <InfoCard
            icon={<Package size={19} className="text-red-600" />}
            iconClass="bg-red-50"
            label="Product"
            title={consumption.productName || "-"}
            subtitle={consumption.productCode || "-"}
          />

          {/* BATCH */}

          <InfoCard
            icon={<Factory size={19} className="text-slate-600" />}
            iconClass="bg-slate-50"
            label="Production Batch"
            title={getBatchName(consumption.productionBatch)}
            subtitle={consumption.batchNumber || "-"}
          />

          {/* ORDER */}

          <InfoCard
            icon={<ClipboardList size={19} className="text-amber-600" />}
            iconClass="bg-amber-50"
            label="Production Order"
            title={getProductionOrderName(consumption.productionOrder)}
            subtitle={consumption.formulaName || "Formula not specified"}
          />

          {/* CREATED */}

          <InfoCard
            icon={<CalendarDays size={19} className="text-slate-600" />}
            iconClass="bg-slate-100"
            label="Created"
            title={formatDate(consumption.createdAt)}
            subtitle={formatDateTime(consumption.createdAt)}
          />
        </div>

        {/* ================================================================ */}
        {/* RECONCILIATION                                                    */}
        {/* ================================================================ */}

        {totalIssued > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-2 gap-x-7 gap-y-2 sm:grid-cols-4">
                <CompactQuantity label="Issued" value={totalIssued} />
                <CompactQuantity label="Used" value={totalActual} />
                <CompactQuantity label="Waste" value={totalWaste} />
                <CompactQuantity label="Returned" value={totalReturn} />
              </div>
              <div className="min-w-64 lg:w-80">
                <div className="flex justify-between text-xs font-semibold text-slate-600">
                  <span>Material reconciliation</span>
                  <span>{formatNumber(reconciliationPercentage)}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-red-600 transition-all"
                    style={{ width: `${reconciliationPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* MATERIAL ITEMS                                                    */}
        {/* ================================================================ */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Batch recipe
              </h2>
              {isDraft && (
                <p className="mt-0.5 text-xs text-slate-500">
                  Review and adjust the quantities for this batch before issuing
                  stock.
                </p>
              )}
            </div>

            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              {items.length} {items.length === 1 ? "material" : "materials"}
            </div>
          </div>

          {items.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center px-6 text-center">
              <div>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <Package size={21} className="text-slate-500" />
                </div>

                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  No material items
                </h3>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`w-full ${isDraft ? "min-w-[560px]" : "min-w-[900px]"}`}>
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <TableHeader align="left">Raw Material</TableHeader>

                    <TableHeader>Standard</TableHeader>

                    {!isDraft && <TableHeader>Issued</TableHeader>}

                    {!isDraft && <TableHeader>Used</TableHeader>}

                    {!isDraft && <TableHeader>Waste</TableHeader>}

                    {!isDraft && <TableHeader>Returned</TableHeader>}

                    {!isDraft && <TableHeader>Variance</TableHeader>}

                    {!isDraft && <TableHeader align="left">Lot</TableHeader>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => {
                    const standard = safeNumber(item.standardQuantity);

                    const issued = safeNumber(item.issuedQuantity);

                    const actual = safeNumber(item.actualQuantity);

                    const waste = safeNumber(item.wasteQuantity);

                    const returned = safeNumber(item.returnQuantity);

                    const variance = safeNumber(item.varianceQuantity);

                    return (
                      <tr
                        key={item._id || `${item.rawMaterial}-${index}`}
                        className="transition hover:bg-slate-50"
                      >
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">
                            {item.rawMaterialName || "-"}
                          </div>

                          <div className="mt-0.5 text-xs text-slate-500">
                            {item.rawMaterialCode || "-"}
                          </div>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <QuantityCell value={standard} unit={item.unit} />
                        </td>

                        {!isDraft && (
                          <>
                            <td className="px-5 py-4 text-right">
                              <QuantityCell value={issued} unit={item.unit} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <QuantityCell value={actual} unit={item.unit} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <QuantityCell value={waste} unit={item.unit} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <QuantityCell value={returned} unit={item.unit} />
                            </td>
                            <td className="px-5 py-4 text-right">
                              <span
                                className={
                                  variance > 0
                                    ? "font-semibold text-red-600"
                                    : variance < 0
                                      ? "font-semibold text-emerald-600"
                                      : "font-medium text-slate-700"
                                }
                              >
                                {formatNumber(variance)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-sm font-medium text-slate-700">
                                {item.lotNumber || "-"}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ================================================================ */}
        {/* NOTES                                                             */}
        {/* ================================================================ */}

        {consumption.notes && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">Notes</h2>

            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
              {consumption.notes}
            </p>
          </div>
        )}

        {/* ================================================================ */}
        {/* ACTIVITY                                                          */}
        {/* ================================================================ */}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-bold text-slate-900">Activity</h2>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-3">
            <ActivityItem
              icon={<CalendarDays size={17} />}
              label="Created"
              value={formatDateTime(consumption.createdAt)}
            />

            <ActivityItem
              icon={<PackageCheck size={17} />}
              label="Issued At"
              value={formatDateTime(consumption.issuedAt)}
            />

            <ActivityItem
              icon={<CheckCircle2 size={17} />}
              label="Consumed At"
              value={formatDateTime(consumption.consumedAt)}
            />
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* ISSUE MATERIALS MODAL                                               */}
      {/* ================================================================== */}

      <IssueMaterialsModal
        open={issueModalOpen}
        consumption={consumption}
        onClose={() => setIssueModalOpen(false)}
        onSuccess={(updatedConsumption) => {
          setConsumption(updatedConsumption);

          setIssueModalOpen(false);
        }}
      />

      {recipeEditorOpen && (
        <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Edit batch recipe"
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
          >
            <header className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-500">
                  This production batch only
                </p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-950">
                  Edit this batch recipe
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Changes apply only to this production batch. The approved
                  formula remains unchanged.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRecipeEditorOpen(false)}
                disabled={savingRecipe}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <XCircle size={18} />
              </button>
            </header>
            <div className="space-y-3 p-5">
              {recipeError && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {recipeError}
                </p>
              )}
              {items.map((item, index) => (
                <label
                  key={`${item.rawMaterial}-${index}`}
                  className="grid gap-2 rounded-xl border border-slate-200 p-3 sm:grid-cols-[1fr_10rem] sm:items-center"
                >
                  <span>
                    <strong className="block text-sm text-slate-950">
                      {item.rawMaterialName}
                    </strong>
                    <small className="text-slate-500">
                      {item.rawMaterialCode}
                    </small>
                  </span>
                  <span className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.0001"
                      value={recipeQuantities[index] ?? ""}
                      onChange={(event) =>
                        setRecipeQuantities((current) =>
                          current.map((quantity, quantityIndex) =>
                            quantityIndex === index
                              ? event.target.value
                              : quantity,
                          ),
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 pr-10 text-sm font-semibold"
                    />
                    <small className="pointer-events-none absolute right-3 top-2.5 text-slate-500">
                      {item.unit}
                    </small>
                  </span>
                </label>
              ))}
            </div>
            <footer className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setRecipeEditorOpen(false)}
                disabled={savingRecipe}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveBatchRecipe()}
                disabled={savingRecipe}
                className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
              >
                {savingRecipe ? "Saving…" : "Save batch recipe"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}

/* ========================================================================== */
/* INFO CARD                                                                  */
/* ========================================================================== */

function InfoCard({
  icon,
  iconClass,
  label,
  title,
  subtitle,
}: {
  icon: ReactNode;
  iconClass: string;
  label: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="cana-panel p-4">
      <div className="flex items-start gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p className="mt-1 truncate text-sm font-bold text-slate-900">
            {title}
          </p>

          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* COMPACT QUANTITY                                                           */
/* ========================================================================== */

function CompactQuantity({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm font-extrabold text-slate-900">{formatNumber(value)}</p>
    </div>
  );
}

/* ========================================================================== */
/* QUANTITY CELL                                                              */
/* ========================================================================== */

function QuantityCell({ value, unit }: { value: number; unit?: string }) {
  return (
    <div>
      <span className="font-semibold text-slate-800">
        {formatNumber(value)}
      </span>

      {unit && <span className="ml-1 text-xs text-slate-400">{unit}</span>}
    </div>
  );
}

/* ========================================================================== */
/* TABLE HEADER                                                               */
/* ========================================================================== */

function TableHeader({
  children,
  align = "right",
}: {
  children: ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-5 py-3 text-${align} text-xs font-semibold uppercase tracking-wide text-slate-500`}
    >
      {children}
    </th>
  );
}

/* ========================================================================== */
/* ACTIVITY ITEM                                                              */
/* ========================================================================== */

function ActivityItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}
