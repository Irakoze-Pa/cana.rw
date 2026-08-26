import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  Loader2,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import inventoryService from "../services/inventoryService";

import type {
  AddStockData,
  AdjustStockData,
  Inventory,
  RemoveStockData,
} from "../types/inventory.types";

type TransactionMode =
  | "add"
  | "adjust"
  | "remove";

interface StockTransactionModalProps {
  open: boolean;
  mode: TransactionMode;
  inventory: Inventory | null;
  onClose: () => void;
  onSuccess: (inventory: Inventory) => void;
}

const formatNumber = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
  }).format(value || 0);
};

const getRawMaterialId = (
  rawMaterial: Inventory["rawMaterial"]
): string => {
  if (typeof rawMaterial === "string") {
    return rawMaterial;
  }

  return rawMaterial?._id || "";
};

const StockTransactionModal = ({
  open,
  mode,
  inventory,
  onClose,
  onSuccess,
}: StockTransactionModalProps) => {
  const [quantity, setQuantity] = useState("");
  const [unitCost, setUnitCost] = useState("");

  const [transactionType, setTransactionType] =
    useState<
      "Purchase" |
      "Production Return" |
      "Opening Balance"
    >("Purchase");

  const [newQuantity, setNewQuantity] =
    useState("");

  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuantity("");

    setUnitCost(
      inventory?.averageCostPerUnit
        ? String(inventory.averageCostPerUnit)
        : ""
    );

    setTransactionType("Purchase");

    setNewQuantity(
      inventory
        ? String(inventory.quantity)
        : ""
    );

    setReason("");
    setNotes("");
    setError("");
  }, [open, inventory, mode]);

  const rawMaterialId = useMemo(() => {
    if (!inventory) {
      return "";
    }

    return getRawMaterialId(
      inventory.rawMaterial
    );
  }, [inventory]);

  if (!open || !inventory) {
    return null;
  }

  const currentQuantity =
    inventory.quantity || 0;

  const reservedQuantity =
    inventory.reservedQuantity || 0;

  const availableQuantity =
    inventory.availableQuantity ??
    Math.max(
      0,
      currentQuantity - reservedQuantity
    );

  const isAdd = mode === "add";
  const isRemove = mode === "remove";
  const isAdjust = mode === "adjust";

  const title = isAdd
    ? "Add Stock"
    : isRemove
      ? "Remove Stock"
      : "Adjust Stock";

  const description = isAdd
    ? "Record stock received into inventory."
    : isRemove
      ? "Remove raw material stock from inventory."
      : "Correct the current inventory quantity.";

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!rawMaterialId) {
      setError(
        "Raw material information is missing."
      );
      return;
    }

    try {
      setLoading(true);

      // =================================================
      // ADD STOCK
      // =================================================

      if (isAdd) {
        const parsedQuantity =
          Number(quantity);

        const parsedUnitCost =
          unitCost.trim() === ""
            ? undefined
            : Number(unitCost);

        if (
          !Number.isFinite(parsedQuantity) ||
          parsedQuantity <= 0
        ) {
          throw new Error(
            "Quantity must be greater than 0."
          );
        }

        if (
          parsedUnitCost !== undefined &&
          (!Number.isFinite(parsedUnitCost) ||
            parsedUnitCost < 0)
        ) {
          throw new Error(
            "Unit cost cannot be negative."
          );
        }

        const payload: AddStockData = {
          rawMaterial: rawMaterialId,
          quantity: parsedQuantity,
          type: transactionType,
          unitCost: parsedUnitCost,
          notes:
            notes.trim() || undefined,
        };

        const updatedInventory =
          await inventoryService.addStock(
            payload
          );

        onSuccess(updatedInventory);
        onClose();

        return;
      }

      // =================================================
      // REMOVE STOCK
      // =================================================

      if (isRemove) {
        const parsedQuantity =
          Number(quantity);

        if (
          !Number.isFinite(parsedQuantity) ||
          parsedQuantity <= 0
        ) {
          throw new Error(
            "Quantity must be greater than 0."
          );
        }

        if (
          parsedQuantity >
          availableQuantity
        ) {
          throw new Error(
            `Only ${formatNumber(
              availableQuantity
            )} ${inventory.unit} is available.`
          );
        }

        const payload: RemoveStockData = {
          rawMaterial: rawMaterialId,
          quantity: parsedQuantity,
          type: "Production Issue",
          notes:
            notes.trim() || undefined,
          reason:
            reason.trim() || undefined,
        };

        const updatedInventory =
          await inventoryService.removeStock(
            payload
          );

        onSuccess(updatedInventory);
        onClose();

        return;
      }

      // =================================================
      // ADJUST STOCK
      // =================================================

      if (isAdjust) {
        const parsedNewQuantity =
          Number(newQuantity);

        const parsedUnitCost =
          unitCost.trim() === ""
            ? undefined
            : Number(unitCost);

        if (
          !Number.isFinite(
            parsedNewQuantity
          ) ||
          parsedNewQuantity < 0
        ) {
          throw new Error(
            "New quantity cannot be negative."
          );
        }

        if (
          parsedNewQuantity <
          reservedQuantity
        ) {
          throw new Error(
            `New quantity cannot be less than reserved quantity (${formatNumber(
              reservedQuantity
            )} ${inventory.unit}).`
          );
        }

        if (!reason.trim()) {
          throw new Error(
            "Adjustment reason is required."
          );
        }

        if (
          parsedUnitCost !== undefined &&
          (!Number.isFinite(parsedUnitCost) ||
            parsedUnitCost < 0)
        ) {
          throw new Error(
            "Unit cost cannot be negative."
          );
        }

        const payload: AdjustStockData = {
          rawMaterial: rawMaterialId,
          newQuantity: parsedNewQuantity,
          unitCost: parsedUnitCost,
          reason: reason.trim(),
          notes:
            notes.trim() || undefined,
        };

        const updatedInventory =
          await inventoryService.adjustStock(
            payload
          );

        onSuccess(updatedInventory);
        onClose();
      }
    } catch (error) {
      console.error(
        "Stock Transaction Error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Stock operation failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-50">
              {isAdd ? (
                <ArrowDownToLine className="h-5 w-5 text-red-600" />
              ) : isRemove ? (
                <ArrowUpFromLine className="h-5 w-5 text-red-600" />
              ) : (
                <Boxes className="h-5 w-5 text-red-600" />
              )}
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {title}
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* =================================================
            MATERIAL INFORMATION
        ================================================= */}

        <div className="border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {inventory.rawMaterialName}
              </p>

              <p className="mt-0.5 text-xs text-gray-500">
                {inventory.rawMaterialCode}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-gray-500">
                Current Stock
              </p>

              <p className="text-sm font-bold text-gray-900">
                {formatNumber(
                  currentQuantity
                )}{" "}
                {inventory.unit}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Total
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatNumber(
                  currentQuantity
                )}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Reserved
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatNumber(
                  reservedQuantity
                )}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-3">
              <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Available
              </p>

              <p className="mt-1 text-sm font-semibold text-gray-900">
                {formatNumber(
                  availableQuantity
                )}
              </p>
            </div>
          </div>
        </div>

        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit}
          className="space-y-5 p-6"
        >
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

              <p className="text-sm font-medium text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* =================================================
              ADD STOCK
          ================================================= */}

          {isAdd && (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Transaction Type
                </label>

                <select
                  value={transactionType}
                  onChange={(event) =>
                    setTransactionType(
                      event.target.value as
                        | "Purchase"
                        | "Production Return"
                        | "Opening Balance"
                    )
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                >
                  <option value="Purchase">
                    Purchase
                  </option>

                  <option value="Production Return">
                    Production Return
                  </option>

                  <option value="Opening Balance">
                    Opening Balance
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Quantity
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={quantity}
                      onChange={(event) =>
                        setQuantity(
                          event.target.value
                        )
                      }
                      placeholder="0.00"
                      required
                      className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-14 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                    />

                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                      {inventory.unit}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Unit Cost
                  </label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={unitCost}
                    onChange={(event) =>
                      setUnitCost(
                        event.target.value
                      )
                    }
                    placeholder="0"
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                  />
                </div>
              </div>
            </>
          )}

          {/* =================================================
              REMOVE STOCK
          ================================================= */}

          {isRemove && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Quantity to Remove
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  max={availableQuantity}
                  value={quantity}
                  onChange={(event) =>
                    setQuantity(
                      event.target.value
                    )
                  }
                  placeholder="0.00"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-14 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />

                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                  {inventory.unit}
                </span>
              </div>

              <p className="mt-2 text-xs text-gray-500">
                Maximum available:{" "}
                <span className="font-semibold text-gray-700">
                  {formatNumber(
                    availableQuantity
                  )}{" "}
                  {inventory.unit}
                </span>
              </p>
            </div>
          )}

          {/* =================================================
              ADJUST STOCK
          ================================================= */}

          {isAdjust && (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  New Quantity
                </label>

                <div className="relative">
                  <input
                    type="number"
                    min={reservedQuantity}
                    step="0.01"
                    value={newQuantity}
                    onChange={(event) =>
                      setNewQuantity(
                        event.target.value
                      )
                    }
                    placeholder="0.00"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-14 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                  />

                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                    {inventory.unit}
                  </span>
                </div>

                <p className="mt-2 text-xs text-gray-500">
                  Reserved quantity is{" "}
                  <span className="font-semibold text-gray-700">
                    {formatNumber(
                      reservedQuantity
                    )}{" "}
                    {inventory.unit}
                  </span>
                  .
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Unit Cost
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitCost}
                  onChange={(event) =>
                    setUnitCost(
                      event.target.value
                    )
                  }
                  placeholder="0"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Reason
                </label>

                <input
                  type="text"
                  value={reason}
                  onChange={(event) =>
                    setReason(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Physical stock count correction"
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-100"
                />
              </div>
            </>
          )}

          {/* =================================================
              NOTES
          ================================================= */}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              Notes
            </label>

            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Additional notes..."
              className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-red-300 focus:ring-2 focus:ring-red-100"
            />
          </div>

          {/* =================================================
              ACTIONS
          ================================================= */}

          <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}

              {loading
                ? "Processing..."
                : isAdd
                  ? "Add Stock"
                  : isRemove
                    ? "Remove Stock"
                    : "Adjust Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default StockTransactionModal;