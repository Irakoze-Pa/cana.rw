import {
  AlertCircle,
  ClipboardList,
  FileText,
  PackageCheck,
  RefreshCw,
  CheckCircle2,
  Search,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import ConsumptionTable from "../components/ConsumptionTable";

import {
  getMaterialConsumptionStats,
  getMaterialConsumptions,
} from "../services/materialConsumption.service";

import type {
  MaterialConsumption,
  MaterialConsumptionStats,
} from "../types/materialConsumption.types";

/* ========================================================================== */
/* HELPERS                                                                    */
/* ========================================================================== */

const safeNumber = (value: unknown): number => {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
};

const formatNumber = (value: unknown): string => {
  return safeNumber(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
};

/* ========================================================================== */
/* PAGE                                                                       */
/* ========================================================================== */

export default function RawMaterialConsumptionPage() {
  const [consumptions, setConsumptions] = useState<
    MaterialConsumption[]
  >([]);

  const [stats, setStats] =
    useState<MaterialConsumptionStats | null>(null);

  const [loading, setLoading] =
    useState<boolean>(true);

  const [error, setError] =
    useState<string>("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");

  /* ------------------------------------------------------------------------ */
  /* LOAD DATA                                                                */
  /* ------------------------------------------------------------------------ */

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [
        consumptionResponse,
        statsResponse,
      ] = await Promise.all([
        getMaterialConsumptions(),
        getMaterialConsumptionStats(),
      ]);

      /* -------------------------------------------------------------------- */
      /* CONSUMPTIONS                                                         */
      /* -------------------------------------------------------------------- */

      const consumptionData =
        Array.isArray(consumptionResponse)
          ? consumptionResponse
          : Array.isArray(
                (
                  consumptionResponse as {
                    data?: MaterialConsumption[];
                  }
                )?.data,
              )
            ? (
                consumptionResponse as {
                  data: MaterialConsumption[];
                }
              ).data
            : [];

      /* -------------------------------------------------------------------- */
      /* STATS                                                                */
      /* -------------------------------------------------------------------- */

      let statsData: MaterialConsumptionStats | null =
        null;

      if (
        statsResponse &&
        typeof statsResponse === "object" &&
        "data" in statsResponse
      ) {
        statsData =
          (
            statsResponse as {
              data?: MaterialConsumptionStats;
            }
          ).data ?? null;
      } else if (
        statsResponse &&
        typeof statsResponse === "object"
      ) {
        statsData =
          statsResponse as MaterialConsumptionStats;
      }

      /* -------------------------------------------------------------------- */
      /* NORMALIZE CONSUMPTIONS                                               */
      /* -------------------------------------------------------------------- */

      const normalizedConsumptions =
        consumptionData.map(
          (consumption) => ({
            ...consumption,

            totalStandardQuantity:
              safeNumber(
                consumption.totalStandardQuantity,
              ),

            totalIssuedQuantity:
              safeNumber(
                consumption.totalIssuedQuantity,
              ),

            totalActualQuantity:
              safeNumber(
                consumption.totalActualQuantity,
              ),

            totalWasteQuantity:
              safeNumber(
                consumption.totalWasteQuantity,
              ),

            totalReturnQuantity:
              safeNumber(
                consumption.totalReturnQuantity,
              ),

            totalVarianceQuantity:
              safeNumber(
                consumption.totalVarianceQuantity,
              ),

            items: Array.isArray(
              consumption.items,
            )
              ? consumption.items.map(
                  (item) => ({
                    ...item,

                    standardQuantity:
                      safeNumber(
                        item.standardQuantity,
                      ),

                    issuedQuantity:
                      safeNumber(
                        item.issuedQuantity,
                      ),

                    actualQuantity:
                      safeNumber(
                        item.actualQuantity,
                      ),

                    wasteQuantity:
                      safeNumber(
                        item.wasteQuantity,
                      ),

                    returnQuantity:
                      safeNumber(
                        item.returnQuantity,
                      ),

                    varianceQuantity:
                      safeNumber(
                        item.varianceQuantity,
                      ),

                    variancePercentage:
                      safeNumber(
                        item.variancePercentage,
                      ),
                  }),
                )
              : [],
          }),
        );

      setConsumptions(
        normalizedConsumptions,
      );

      setStats(statsData);
    } catch (err) {
      console.error(
        "Failed to load material consumptions:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load material consumptions.",
      );

      setConsumptions([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /* ------------------------------------------------------------------------ */
  /* INITIAL LOAD                                                             */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    void loadData();
  }, [loadData]);

  /* ------------------------------------------------------------------------ */
  /* STATISTICS                                                               */
  /* ------------------------------------------------------------------------ */

  const cards = useMemo(
    () => [
      {
        label: "Total",
        value: safeNumber(stats?.total),
        icon: ClipboardList,
      },

      {
        label: "Draft",
        value: safeNumber(stats?.draft),
        icon: FileText,
      },

      {
        label: "Issued",
        value: safeNumber(stats?.issued),
        icon: PackageCheck,
      },

      {
        label: "Consumed",
        value: safeNumber(stats?.consumed),
        icon: CheckCircle2,
      },
    ],
    [stats],
  );

  const visibleConsumptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return consumptions.filter((item) => {
      const matchesStatus = status === "All" || item.status === status;
      const matchesSearch = !query || [item.consumptionNo, item.productName, item.productCode, typeof item.productionBatch === "string" ? item.productionBatch : item.productionBatch?.batchNo].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
      return matchesStatus && matchesSearch;
    });
  }, [consumptions, search, status]);

  /* ======================================================================== */
  /* RENDER                                                                   */
  /* ======================================================================== */

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-7xl space-y-4">

        {/* ================================================================== */}
        {/* HEADER                                                             */}
        {/* ================================================================== */}

        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                <PackageCheck
                  size={21}
                  className="text-red-600"
                />
              </div>

              <div>
                <p className="cana-section-kicker">Production control</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
                  Raw Material Consumption
                </h1>

              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={
                loading
                  ? "animate-spin"
                  : ""
              }
            />

            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* ================================================================== */}
        {/* ERROR                                                             */}
        {/* ================================================================== */}

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
              <AlertCircle
                size={18}
                className="text-red-600"
              />
            </div>

            <div className="min-w-0">
              <p className="break-words text-sm text-red-700">{error}</p>

              <button
                type="button"
                onClick={() =>
                  void loadData()
                }
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ================================================================== */}
        {/* STATISTICS                                                         */}
        {/* ================================================================== */}

        <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;

            return (
              <div
                key={card.label}
                className="cana-panel p-3.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      {card.label}
                    </p>

                    <p className="mt-1 text-xl font-extrabold tracking-tight text-slate-950">
                      {formatNumber(
                        card.value,
                      )}
                    </p>

                  </div>

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                    <Icon
                      size={18}
                      className="text-slate-600"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ================================================================== */}
        {/* TABLE                                                              */}
        {/* ================================================================== */}

        <div className="cana-panel overflow-hidden">
          <div className="border-b border-slate-200 px-5 py-4 md:px-6">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <h2 className="font-bold text-slate-900">Consumption records</h2>

              {!loading && (
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <span className="text-sm font-semibold text-slate-600">
                    {formatNumber(
                      consumptions.length,
                    )}{" "}
                    {consumptions.length ===
                    1
                      ? "record"
                      : "records"}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-b border-slate-100 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-md"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search record, batch, product" className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-9 pr-3 text-sm outline-none focus:border-red-400 focus:bg-white" /></div>
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700"><option value="All">All status</option><option value="Draft">Draft</option><option value="Issued">Issued</option><option value="Partially Consumed">Partially consumed</option><option value="Consumed">Consumed</option><option value="Cancelled">Cancelled</option></select>
          </div>

          <ConsumptionTable
            consumptions={visibleConsumptions}
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
}
