import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { FormEvent } from "react";

import {
  CalendarDays,
  Info,
  Loader2,
  Package,
  Lock,
  X,
} from "lucide-react";

import {
  getProductionOrders,
} from "../services/productionOrder.service";

import {
  getProductionBatches,
} from "../services/productionBatch.service";

import type {
  ProductionOrder,
} from "../types/productionOrder.types";

import type {
  ProductionBatch,
  CreateProductionBatchData,
  UpdateProductionBatchData,
  ProductionBatchStatus,
} from "../types/productionBatch.types";

/* -------------------------------------------------------------------------- */
/* PROPS                                                                      */
/* -------------------------------------------------------------------------- */

interface ProductionBatchModalProps {
  isOpen: boolean;
  onClose: () => void;

  onCreate: (
    data: CreateProductionBatchData,
  ) => Promise<void>;

  onUpdate: (
    data: UpdateProductionBatchData,
  ) => Promise<void>;

  editingBatch?: ProductionBatch | null;

  initialProductionOrder?: string;
}

/* -------------------------------------------------------------------------- */
/* HELPERS                                                                    */
/* -------------------------------------------------------------------------- */

function normalizeOrders(
  payload: unknown,
): ProductionOrder[] {
  if (Array.isArray(payload)) {
    return payload as ProductionOrder[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const data = payload as {
      data?: unknown;
      orders?: unknown;
      productionOrders?: unknown;
    };

    if (Array.isArray(data.data)) {
      return data.data as ProductionOrder[];
    }

    if (Array.isArray(data.orders)) {
      return data.orders as ProductionOrder[];
    }

    if (
      Array.isArray(
        data.productionOrders,
      )
    ) {
      return data.productionOrders as ProductionOrder[];
    }
  }

  return [];
}

function normalizeBatches(
  payload: unknown,
): ProductionBatch[] {
  if (Array.isArray(payload)) {
    return payload as ProductionBatch[];
  }

  if (
    payload &&
    typeof payload === "object"
  ) {
    const data = payload as {
      data?: unknown;
      batches?: unknown;
      productionBatches?: unknown;
    };

    if (Array.isArray(data.data)) {
      return data.data as ProductionBatch[];
    }

    if (Array.isArray(data.batches)) {
      return data.batches as ProductionBatch[];
    }

    if (
      Array.isArray(
        data.productionBatches,
      )
    ) {
      return data.productionBatches as ProductionBatch[];
    }
  }

  return [];
}

function getReferenceId(
  value: unknown,
): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (
    typeof value === "object" &&
    value !== null
  ) {
    const item = value as {
      _id?: string;
    };

    return item._id || "";
  }

  return "";
}

function getProductName(
  order: ProductionOrder,
): string {
  if (
    typeof order.product === "object" &&
    order.product !== null
  ) {
    return (
      order.product.name ||
      order.productName ||
      "—"
    );
  }

  return order.productName || "—";
}

function getProductCode(
  order: ProductionOrder,
): string {
  if (
    typeof order.product === "object" &&
    order.product !== null
  ) {
    return (
      order.product.code ||
      order.product.productCode ||
      order.product.sku ||
      order.productCode ||
      "—"
    );
  }

  return order.productCode || "—";
}

function formatDate(
  value?: string,
): string {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
}

function numberValue(
  value: unknown,
): number {
  const parsed = Number(value);

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

/* -------------------------------------------------------------------------- */
/* STATUS RULES                                                               */
/* -------------------------------------------------------------------------- */

function canEditPlannedQuantity(
  status: ProductionBatchStatus,
): boolean {
  return (
    status === "Planned" ||
    status === "Ready"
  );
}

function canEditActualQuantity(
  status: ProductionBatchStatus,
): boolean {
  return (
    status === "In Progress" ||
    status === "Paused"
  );
}

function canEditLotNumber(
  status: ProductionBatchStatus,
): boolean {
  return (
    status === "Planned" ||
    status === "Ready"
  );
}

function canEditSupervisor(
  status: ProductionBatchStatus,
): boolean {
  return (
    status === "Planned" ||
    status === "Ready"
  );
}

function getAllowedStatuses(
  status: ProductionBatchStatus,
): ProductionBatchStatus[] {
  switch (status) {
    case "Planned":
      return [
        "Planned",
        "Ready",
        "Cancelled",
      ];

    case "Ready":
      return [
        "Ready",
        "In Progress",
        "Cancelled",
      ];

    case "In Progress":
      return [
        "In Progress",
        "Paused",
        "Completed",
      ];

    case "Paused":
      return [
        "Paused",
        "In Progress",
        "Completed",
        "Cancelled",
      ];

    case "Completed":
      return ["Completed"];

    case "Cancelled":
      return ["Cancelled"];

    default:
      return [status];
  }
}

/* -------------------------------------------------------------------------- */
/* COMPONENT                                                                  */
/* -------------------------------------------------------------------------- */

export default function ProductionBatchModal({
  isOpen,
  onClose,
  onCreate,
  onUpdate,
  editingBatch = null,
  initialProductionOrder = "",
}: ProductionBatchModalProps) {
  const isEdit = Boolean(editingBatch);

  const [orders, setOrders] =
    useState<ProductionOrder[]>([]);

  const [
    productionOrderId,
    setProductionOrderId,
  ] = useState("");

  const [plannedQuantity, setPlannedQuantity] =
    useState("");

  const [actualQuantity, setActualQuantity] =
    useState("0");

  const [unit, setUnit] =
    useState("");

  const [status, setStatus] =
    useState<ProductionBatchStatus>(
      "Planned",
    );

  const [lotNumber, setLotNumber] =
    useState("");

  const [supervisorName, setSupervisorName] =
    useState("");

  const [notes, setNotes] =
    useState("");

  const [loadingOrders, setLoadingOrders] =
    useState(false);

  const [loadingBatches, setLoadingBatches] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [remainingQuantity, setRemainingQuantity] =
    useState<number | null>(null);

  /* ------------------------------------------------------------------------ */
  /* SELECTED ORDER                                                           */
  /* ------------------------------------------------------------------------ */

  const selectedOrder =
    useMemo(
      () =>
        orders.find(
          (order) =>
            order._id ===
            productionOrderId,
        ) || null,
      [
        orders,
        productionOrderId,
      ],
    );

  /* ------------------------------------------------------------------------ */
  /* CURRENT STATUS                                                           */
  /* ------------------------------------------------------------------------ */

  const currentStatus =
    editingBatch?.status ||
    status;

  const plannedQuantityLocked =
    isEdit &&
    !canEditPlannedQuantity(
      currentStatus,
    );

  const actualQuantityLocked =
    isEdit &&
    !canEditActualQuantity(
      currentStatus,
    );

  const lotNumberLocked =
    isEdit &&
    !canEditLotNumber(
      currentStatus,
    );

  const supervisorLocked =
    isEdit &&
    !canEditSupervisor(
      currentStatus,
    );

  const statusOptions =
    isEdit
      ? getAllowedStatuses(
          currentStatus,
        )
      : [
          "Planned" as ProductionBatchStatus,
        ];

  /* ------------------------------------------------------------------------ */
  /* LOAD ORDERS                                                              */
  /* ------------------------------------------------------------------------ */

  const loadOrders = useCallback(
    async () => {
      try {
        setLoadingOrders(true);

        const response =
          await getProductionOrders();

        const normalized =
          normalizeOrders(response);

        setOrders(normalized);

        if (
          !isEdit &&
          initialProductionOrder
        ) {
          const matchingOrder =
            normalized.find(
              (order) =>
                order._id ===
                initialProductionOrder,
            );

          if (matchingOrder) {
            setProductionOrderId(
              matchingOrder._id,
            );
          }
        }
      } catch (err) {
        console.error(
          "Load Production Orders Error:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load production orders.",
        );
      } finally {
        setLoadingOrders(false);
      }
    },
    [
      initialProductionOrder,
      isEdit,
    ],
  );

  /* ------------------------------------------------------------------------ */
  /* LOAD REMAINING QUANTITY                                                  */
  /* ------------------------------------------------------------------------ */

  const loadRemainingQuantity =
    useCallback(
      async (orderId: string) => {
        if (!orderId) {
          setRemainingQuantity(null);
          return;
        }

        try {
          setLoadingBatches(true);

          const response =
            await getProductionBatches();

          const batches =
            normalizeBatches(response);

          const allocated =
            batches
              .filter((batch) => {
                const batchOrderId =
                  getReferenceId(
                    batch.productionOrder,
                  );

                if (
                  batchOrderId !==
                  orderId
                ) {
                  return false;
                }

                if (
                  batch.status ===
                  "Cancelled"
                ) {
                  return false;
                }

                /*
                 * When editing the current batch,
                 * exclude its own planned quantity.
                 */
                if (
                  editingBatch &&
                  batch._id ===
                    editingBatch._id
                ) {
                  return false;
                }

                return true;
              })
              .reduce(
                (
                  total,
                  batch,
                ) =>
                  total +
                  numberValue(
                    batch.status === "Completed"
                      ? batch.actualQuantity
                      : batch.plannedQuantity,
                  ),
                0,
              );

          const order =
            orders.find(
              (item) =>
                item._id ===
                orderId,
            );

          if (!order) {
            setRemainingQuantity(null);
            return;
          }

          const orderQuantity =
            numberValue(
              order.quantity,
            );

          const remaining =
            Math.max(
              0,
              orderQuantity -
                allocated,
            );

          setRemainingQuantity(
            remaining,
          );
        } catch (err) {
          console.error(
            "Load Remaining Quantity Error:",
            err,
          );

          setRemainingQuantity(null);
        } finally {
          setLoadingBatches(false);
        }
      },
      [
        orders,
        editingBatch,
      ],
    );

  /* ------------------------------------------------------------------------ */
  /* RESET MODAL                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setError("");

    if (editingBatch) {
      const orderId =
        getReferenceId(
          editingBatch.productionOrder,
        );

      setProductionOrderId(
        orderId,
      );

      setPlannedQuantity(
        String(
          numberValue(
            editingBatch.plannedQuantity,
          ),
        ),
      );

      setActualQuantity(
        String(
          numberValue(
            editingBatch.actualQuantity,
          ),
        ),
      );

      setUnit(
        editingBatch.unit || "",
      );

      setStatus(
        editingBatch.status ||
          "Planned",
      );

      setLotNumber(
        editingBatch.lotNumber ||
          "",
      );

      setSupervisorName(
        editingBatch.supervisorName ||
          "",
      );

      setNotes(
        editingBatch.notes ||
          "",
      );

      setRemainingQuantity(
        null,
      );
    } else {
      setProductionOrderId(
        initialProductionOrder ||
          "",
      );

      setPlannedQuantity("");
      setActualQuantity("0");
      setUnit("");
      setStatus("Planned");
      setLotNumber("");
      setSupervisorName("");
      setNotes("");
      setRemainingQuantity(
        null,
      );
    }

    void loadOrders();
  }, [
    isOpen,
    editingBatch,
    initialProductionOrder,
    loadOrders,
  ]);

  /* ------------------------------------------------------------------------ */
  /* ORDER / UNIT                                                              */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!selectedOrder) {
      return;
    }

    setUnit(
      selectedOrder.unit || "",
    );

  }, [
    selectedOrder,
  ]);

  /* ------------------------------------------------------------------------ */
  /* LOAD REMAINING                                                            */
  /* ------------------------------------------------------------------------ */

  useEffect(() => {
    if (!productionOrderId) {
      return;
    }

    void loadRemainingQuantity(
      productionOrderId,
    );
  }, [
    productionOrderId,
    loadRemainingQuantity,
  ]);

  /* ------------------------------------------------------------------------ */
  /* VALIDATION                                                               */
  /* ------------------------------------------------------------------------ */

  const validate = (): string => {
    if (!productionOrderId) {
      return "Please select a production order.";
    }

    if (!selectedOrder) {
      return "Selected production order could not be found.";
    }

    /* CREATE ORDER STATUS */
    if (
      !isEdit &&
      selectedOrder.status !==
        "Draft" &&
      selectedOrder.status !==
        "Planned" &&
      selectedOrder.status !==
        "Released" &&
      selectedOrder.status !==
        "In Production"
    ) {
      return (
        "A production batch can only be created for a Draft, Planned, Released or In Production production order."
      );
    }

    const planned =
      numberValue(
        plannedQuantity,
      );

    const actual =
      numberValue(
        actualQuantity,
      );

    /* PLANNED QUANTITY */
    if (planned <= 0) {
      return "Batch quantity must be greater than 0.";
    }

    /* PLANNED QUANTITY LOCK */
    if (
      isEdit &&
      plannedQuantityLocked &&
      planned !==
        numberValue(
          editingBatch?.plannedQuantity,
        )
    ) {
      return "Planned batch quantity cannot be changed after production starts.";
    }

    /*
     * Planned/Ready:
     * new planned quantity must fit within
     * the remaining production order quantity.
     */
    if (
      (!isEdit ||
        canEditPlannedQuantity(
          currentStatus,
        )) &&
      remainingQuantity !== null &&
      planned >
        remainingQuantity
    ) {
      return `Batch quantity cannot exceed the remaining production order quantity of ${remainingQuantity} ${unit}.`;
    }

    /* ACTUAL QUANTITY */
    if (actual < 0) {
      return "Actual quantity cannot be negative.";
    }

    /*
     * Actual can only be changed while
     * In Progress or Paused.
     */
    if (
      isEdit &&
      !canEditActualQuantity(
        currentStatus,
      ) &&
      actual !==
        numberValue(
          editingBatch?.actualQuantity,
        )
    ) {
      return "Actual quantity cannot be changed in the current batch status.";
    }

    /* ACTUAL <= PLANNED */
    if (
      actual > planned
    ) {
      return "Actual quantity cannot exceed planned quantity.";
    }

    /* UNIT */
    if (!unit.trim()) {
      return "Unit is required.";
    }

    /*
     * Completion requires output, but output may be below plan. The remaining
     * production-order balance can then be scheduled as a make-up batch.
     */
    if (
      isEdit &&
      status === "Completed"
    ) {
      if (actual <= 0) {
        return "A completed production batch must have an actual produced quantity greater than 0.";
      }

    }

    return "";
  };

  /* ------------------------------------------------------------------------ */
  /* SUBMIT                                                                   */
  /* ------------------------------------------------------------------------ */

  const handleSubmit = async (
    event: FormEvent,
  ) => {
    event.preventDefault();

    const validation =
      validate();

    if (validation) {
      setError(validation);
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      /* ================================================================ */
      /* UPDATE                                                           */
      /* ================================================================ */

      if (isEdit) {
        const updateData: UpdateProductionBatchData =
          {
            status,
            notes:
              notes.trim() ||
              undefined,
          };

        /*
         * Planned/Ready:
         * planned quantity can be changed.
         */
        if (
          canEditPlannedQuantity(
            currentStatus,
          )
        ) {
          updateData.plannedQuantity =
            numberValue(
              plannedQuantity,
            );
        }

        /*
         * In Progress/Paused:
         * actual quantity can be changed.
         */
        if (
          canEditActualQuantity(
            currentStatus,
          )
        ) {
          updateData.actualQuantity =
            numberValue(
              actualQuantity,
            );
        }

        /*
         * IMPORTANT:
         *
         * Lot number is ONLY sent before
         * production starts.
         *
         * This prevents:
         * "Lot number cannot be changed after production starts."
         */
        if (
          canEditLotNumber(
            currentStatus,
          )
        ) {
          updateData.lotNumber =
            lotNumber.trim() ||
            undefined;
        }

        /*
         * Supervisor can only be changed
         * before production starts.
         */
        if (
          canEditSupervisor(
            currentStatus,
          )
        ) {
          updateData.supervisorName =
            supervisorName.trim() ||
            undefined;
        }

        await onUpdate(
          updateData,
        );
      }

      /* ================================================================ */
      /* CREATE                                                           */
      /* ================================================================ */

      else {
        const createData: CreateProductionBatchData =
          {
            productionOrder:
              productionOrderId,

            plannedQuantity:
              numberValue(
                plannedQuantity,
              ),

            unit: unit.trim(),

            /*
             * Every new batch starts as Planned.
             */
            status: "Planned",

            lotNumber:
              lotNumber.trim() ||
              undefined,

            supervisorName:
              supervisorName.trim() ||
              undefined,

            notes:
              notes.trim() ||
              undefined,
          };

        await onCreate(
          createData,
        );
      }

      onClose();
    } catch (err) {
      console.error(
        "Production Batch Submit Error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save production batch.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* ------------------------------------------------------------------------ */
  /* RENDER                                                                   */
  /* ------------------------------------------------------------------------ */

  if (!isOpen) {
    return null;
  }

  const isOrderLocked =
    Boolean(
      initialProductionOrder,
    ) || isEdit;

  const isProductionStarted =
    isEdit &&
    (
      currentStatus ===
        "In Progress" ||
      currentStatus ===
        "Paused" ||
      currentStatus ===
        "Completed"
    );

  const isTerminal =
    isEdit &&
    (
      currentStatus ===
        "Completed" ||
      currentStatus ===
        "Cancelled"
    );

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (
          event.currentTarget ===
            event.target &&
          !submitting
        ) {
          onClose();
        }
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* ================================================================ */}
        {/* HEADER                                                           */}
        {/* ================================================================ */}

        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {isEdit
                ? "Edit Production Batch"
                : "Create Production Batch"}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {isEdit
                ? "Update the batch according to its current production status."
                : "Create a production run from a released production order."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 disabled:opacity-40"
          >
            <X size={21} />
          </button>
        </div>

        {/* ================================================================ */}
        {/* FORM                                                             */}
        {/* ================================================================ */}

        <form
          onSubmit={handleSubmit}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="overflow-y-auto px-6 py-6">

            {/* ERROR */}
            {error && (
              <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* ============================================================ */}
            {/* PRODUCTION STARTED NOTICE                                     */}
            {/* ============================================================ */}

            {isProductionStarted && (
              <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <Info
                  size={19}
                  className="mt-0.5 shrink-0 text-amber-600"
                />

                <div>
                  <p className="text-sm font-semibold text-amber-900">
                    Production has started
                  </p>

                  <p className="mt-1 text-xs leading-5 text-amber-800">
                    Lot number, supervisor,
                    planned quantity and other
                    production-start fields are locked.
                    Actual quantity can be updated while
                    the batch is In Progress or Paused.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* TERMINAL NOTICE                                               */}
            {/* ============================================================ */}

            {isTerminal && (
              <div className="mb-5 flex gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Lock
                  size={18}
                  className="mt-0.5 shrink-0 text-gray-500"
                />

                <div>
                  <p className="text-sm font-semibold text-gray-800">
                    Batch is locked
                  </p>

                  <p className="mt-1 text-xs leading-5 text-gray-500">
                    Completed and Cancelled batches
                    cannot be modified.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* PRODUCTION ORDER                                              */}
            {/* ============================================================ */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Production Order
                <span className="ml-1 text-red-600">
                  *
                </span>
              </label>

              {isOrderLocked ? (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                  {selectedOrder ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-600 shadow-sm">
                        <Package size={19} />
                      </div>

                      <div>
                        <p className="font-semibold text-gray-900">
                          {
                            selectedOrder.productionOrderNo
                          }
                        </p>

                        <p className="mt-0.5 text-xs text-gray-500">
                          {getProductName(
                            selectedOrder,
                          )}

                          {getProductCode(
                            selectedOrder,
                          ) !== "—"
                            ? ` · ${getProductCode(
                                selectedOrder,
                              )}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2
                        size={16}
                        className="animate-spin"
                      />

                      Loading production order...
                    </div>
                  )}
                </div>
              ) : (
                <select
                  value={
                    productionOrderId
                  }
                  onChange={(event) =>
                    setProductionOrderId(
                      event.target.value,
                    )
                  }
                  disabled={
                    loadingOrders ||
                    submitting
                  }
                  className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:bg-gray-50"
                >
                  <option value="">
                    {loadingOrders
                      ? "Loading production orders..."
                      : "Select production order"}
                  </option>

                  {orders
                    .filter(
                      (order) =>
                        order.status ===
                          "Draft" ||
                        order.status ===
                          "Planned" ||
                        order.status ===
                          "Released" ||
                        order.status ===
                          "In Production",
                    )
                    .map(
                      (order) => (
                        <option
                          key={
                            order._id
                          }
                          value={
                            order._id
                          }
                        >
                          {
                            order.productionOrderNo
                          }{" "}
                          —{" "}
                          {getProductName(
                            order,
                          )} · {order.status}
                        </option>
                      ),
                    )}
                </select>
              )}
            </div>

            {/* ============================================================ */}
            {/* ORDER SUMMARY                                                  */}
            {/* ============================================================ */}

            {selectedOrder && (
              <div className="mt-5 rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Product
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {getProductName(
                        selectedOrder,
                      )}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {getProductCode(
                        selectedOrder,
                      )}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Order Quantity
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {numberValue(
                        selectedOrder.quantity,
                      ).toLocaleString()}{" "}
                      {
                        selectedOrder.unit
                      }
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Remaining
                    </p>

                    {loadingBatches ? (
                      <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />

                        Calculating...
                      </div>
                    ) : (
                      <p className="mt-1 font-semibold text-red-600">
                        {remainingQuantity !==
                        null
                          ? `${remainingQuantity.toLocaleString()} ${selectedOrder.unit}`
                          : "Calculating..."}
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500">
                      Planned Date
                    </p>

                    <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                      <CalendarDays
                        size={15}
                      />

                      {formatDate(
                        selectedOrder.plannedDate,
                      )}
                    </div>
                  </div>

                </div>

                {!isEdit &&
                  remainingQuantity !== null && (
                  <div className="mt-4 border-t border-gray-200 pt-4 text-xs leading-5 text-gray-600">
                    Other active batches have allocated{" "}
                    <span className="font-semibold text-gray-900">
                      {Math.max(
                        0,
                        numberValue(
                          selectedOrder.quantity,
                        ) - remainingQuantity,
                      ).toLocaleString()} {selectedOrder.unit}
                    </span>
                    . This new batch can use up to the remaining quantity shown above.
                  </div>
                )}
              </div>
            )}

            {/* ============================================================ */}
            {/* PLANNED QUANTITY                                               */}
            {/* ============================================================ */}

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between gap-4">
                <label className="block text-sm font-semibold text-gray-800">
                  Planned Batch Quantity
                  <span className="ml-1 text-red-600">
                    *
                  </span>
                </label>

                {!isEdit &&
                  remainingQuantity !==
                    null && (
                    <span className="text-xs font-medium text-gray-500">
                      Remaining:{" "}
                      {remainingQuantity.toLocaleString()}{" "}
                      {unit}
                    </span>
                  )}
              </div>

              <div className="flex gap-3">
                <input
                  type="number"
                  min="0.01"
                  max={
                    !isEdit ||
                    canEditPlannedQuantity(
                      currentStatus,
                    )
                      ? remainingQuantity ??
                        undefined
                      : undefined
                  }
                  step="0.01"
                  value={
                    plannedQuantity
                  }
                  onChange={(event) =>
                    setPlannedQuantity(
                      event.target.value,
                    )
                  }
                  disabled={
                    submitting ||
                    loadingBatches ||
                    plannedQuantityLocked
                  }
                  className="h-12 min-w-0 flex-1 rounded-xl border border-gray-200 px-4 text-sm text-gray-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Enter batch quantity"
                />

                <div className="flex h-12 min-w-[90px] items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-700">
                  {plannedQuantityLocked && (
                    <Lock size={14} />
                  )}

                  {unit || "Unit"}
                </div>

                {!isEdit &&
                  remainingQuantity !== null &&
                  remainingQuantity > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPlannedQuantity(
                          String(
                            remainingQuantity,
                          ),
                        )
                      }
                      disabled={
                        submitting ||
                        loadingBatches
                      }
                      className="shrink-0 rounded-xl border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      Use remaining
                    </button>
                  )}
              </div>

              <p className="mt-1.5 text-xs text-gray-500">
                {plannedQuantityLocked
                  ? "Locked because production has already started."
                  : "This is the planned output for this specific production batch."}
              </p>
            </div>

            {/* ============================================================ */}
            {/* CREATE INFO                                                    */}
            {/* ============================================================ */}

            {!isEdit && (
              <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <p className="text-sm font-semibold text-blue-900">
                  Automatic batch values
                </p>

                <div className="mt-4 grid gap-4 sm:grid-cols-3">

                  <div>
                    <p className="text-xs text-blue-700">
                      Batch Number
                    </p>

                    <p className="mt-1 text-sm font-semibold text-blue-950">
                      Generated automatically
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-blue-700">
                      Status
                    </p>

                    <p className="mt-1 text-sm font-semibold text-blue-950">
                      Planned
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-blue-700">
                      Actual Quantity
                    </p>

                    <p className="mt-1 text-sm font-semibold text-blue-950">
                      0 {unit}
                    </p>
                  </div>

                </div>

                <p className="mt-4 border-t border-blue-200 pt-4 text-xs leading-5 text-blue-800">
                  The batch stays <span className="font-semibold">Planned</span> until the production team marks it Ready and then In Progress. Finished-product stock is posted only when a batch is completed with an actual output quantity.
                </p>

                {selectedOrder &&
                  (selectedOrder.status === "Draft" ||
                    selectedOrder.status === "Planned") && (
                    <p className="mt-3 text-xs leading-5 text-blue-800">
                      Creating this first batch will release the production order after its material requirements are verified.
                    </p>
                  )}
              </div>
            )}

            {/* ============================================================ */}
            {/* EDIT VALUES                                                    */}
            {/* ============================================================ */}

            {isEdit && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">

                {/* ACTUAL */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Actual Quantity
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={
                        numberValue(
                          plannedQuantity,
                        )
                      }
                      step="0.01"
                      value={
                        actualQuantity
                      }
                      onChange={(
                        event,
                      ) =>
                        setActualQuantity(
                          event.target
                            .value,
                        )
                      }
                      disabled={
                        submitting ||
                        actualQuantityLocked
                      }
                      className="h-12 w-full rounded-xl border border-gray-200 px-4 pr-10 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                    />

                    {actualQuantityLocked && (
                      <Lock
                        size={15}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    )}
                  </div>

                  <p className="mt-1.5 text-xs text-gray-500">
                    {actualQuantityLocked
                      ? currentStatus ===
                        "Completed"
                        ? "Completed batches are locked."
                        : "Actual quantity can be entered only while production is In Progress or Paused."
                      : "Enter finished output. A short yield can be completed and scheduled later as a make-up batch."}
                  </p>
                </div>

                {/* STATUS */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-800">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target
                          .value as ProductionBatchStatus,
                      )
                    }
                    disabled={
                      submitting ||
                      currentStatus ===
                        "Completed" ||
                      currentStatus ===
                        "Cancelled"
                    }
                    className="h-12 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-gray-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    {statusOptions.map(
                      (option) => (
                        <option
                          key={
                            option
                          }
                          value={
                            option
                          }
                        >
                          {option}
                        </option>
                      ),
                    )}
                  </select>

                  <p className="mt-1.5 text-xs text-gray-500">
                    Only valid production status
                    transitions are available.
                  </p>
                </div>
              </div>
            )}

            {/* ============================================================ */}
            {/* LOT NUMBER                                                     */}
            {/* ============================================================ */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Lot Number
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(event) =>
                    setLotNumber(
                      event.target.value,
                    )
                  }
                  disabled={
                    submitting ||
                    lotNumberLocked
                  }
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 pr-10 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Optional — for traceability"
                />

                {lotNumberLocked && (
                  <Lock
                    size={15}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                )}
              </div>

              <p className="mt-1.5 text-xs text-gray-500">
                {lotNumberLocked
                  ? "Lot number is locked after production starts."
                  : "Lot number can be assigned or changed before production starts."}
              </p>
            </div>

            {/* ============================================================ */}
            {/* SUPERVISOR                                                     */}
            {/* ============================================================ */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Supervisor
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={
                    supervisorName
                  }
                  onChange={(event) =>
                    setSupervisorName(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    submitting ||
                    supervisorLocked
                  }
                  className="h-12 w-full rounded-xl border border-gray-200 px-4 pr-10 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="Optional"
                />

                {supervisorLocked && (
                  <Lock
                    size={15}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                )}
              </div>

              <p className="mt-1.5 text-xs text-gray-500">
                {supervisorLocked
                  ? "Supervisor cannot be changed after production starts."
                  : "Supervisor can be assigned before production starts."}
              </p>
            </div>

            {/* ============================================================ */}
            {/* NOTES                                                          */}
            {/* ============================================================ */}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-gray-800">
                Notes
              </label>

              <textarea
                rows={4}
                value={notes}
                onChange={(event) =>
                  setNotes(
                    event.target
                      .value,
                  )
                }
                disabled={
                  submitting ||
                  isTerminal
                }
                className="w-full resize-none rounded-2xl border border-gray-200 px-4 py-3 text-sm text-gray-900 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 disabled:cursor-not-allowed disabled:bg-gray-100"
                placeholder="Batch notes..."
              />
            </div>
          </div>

          {/* ================================================================ */}
          {/* FOOTER                                                           */}
          {/* ================================================================ */}

          <div className="flex justify-end gap-3 border-t border-gray-200 bg-white px-6 py-4">

            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingOrders ||
                loadingBatches ||
                !productionOrderId ||
                isTerminal
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <Loader2
                  size={17}
                  className="animate-spin"
                />
              )}

              {submitting
                ? "Saving..."
                : isEdit
                  ? "Update Batch"
                  : "Create Batch"}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}
