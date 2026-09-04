import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  issueMaterialConsumption,
} from "../services/materialConsumption.service";
import api from "@/services/api";

import type {
  MaterialConsumption,
  IssueMaterialItem,
} from "../types/materialConsumption.types";

interface Props {
  open: boolean;
  consumption: MaterialConsumption | null;
  onClose: () => void;
  onSuccess: (
    consumption: MaterialConsumption,
  ) => void;
}

interface FormItem extends IssueMaterialItem {
  rawMaterialName: string;
  rawMaterialCode: string;
  unit: string;
  standardQuantity: number;
}

interface LotOption {
  lotNumber: string;
  availableQuantity: number;
  unit: string;
  status: string;
}

function getRawMaterialId(
  rawMaterial: unknown,
): string {
  if (typeof rawMaterial === "string") {
    return rawMaterial;
  }

  if (
    rawMaterial &&
    typeof rawMaterial === "object" &&
    "_id" in rawMaterial &&
    typeof rawMaterial._id === "string"
  ) {
    return rawMaterial._id;
  }

  return "";
}

export default function IssueMaterialsModal({
  open,
  consumption,
  onClose,
  onSuccess,
}: Props) {
  const [items, setItems] = useState<FormItem[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lotsByMaterial, setLotsByMaterial] = useState<Record<string, LotOption[]>>({});

  useEffect(() => {
    if (!open || !consumption) {
      return;
    }

    setItems(
      consumption.items.map((item) => ({
        rawMaterial: getRawMaterialId(
          item.rawMaterial,
        ),
        rawMaterialName: item.rawMaterialName,
        rawMaterialCode: item.rawMaterialCode,
        unit: item.unit,
        standardQuantity: item.standardQuantity,
        issuedQuantity: item.standardQuantity,
        lotNumber: item.lotNumber || "",
        notes: item.notes || "",
      })),
    );

    setNotes(consumption.notes || "");
    setError("");

    void Promise.all(
      consumption.items.map(async (item) => {
        const rawMaterialId = getRawMaterialId(
          item.rawMaterial,
        );

        if (!rawMaterialId) {
          return ["", []] as const;
        }

        const response = await api.get<{ data: LotOption[] }>(
          `/raw-materials/${rawMaterialId}/lots`,
        );

        return [rawMaterialId, response.data.data || []] as const;
      }),
    )
      .then((entries) =>
        setLotsByMaterial(
          Object.fromEntries(
            entries.filter(([id]) => Boolean(id)),
          ),
        ),
      )
      .catch(() => setLotsByMaterial({}));
  }, [open, consumption]);

  if (!open || !consumption) {
    return null;
  }

  const updateItem = (
    index: number,
    field: keyof FormItem,
    value: string | number,
  ) => {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item,
      ),
    );
  };

  const handleSubmit = async () => {
    setError("");

    for (const item of items) {
      if (!item.rawMaterial) {
        setError(
          `The material reference for ${item.rawMaterialName} is missing. Refresh the consumption record and try again.`,
        );
        return;
      }

      if (
        !Number.isFinite(item.issuedQuantity) ||
        item.issuedQuantity <= 0
      ) {
        setError(
          `Enter a valid issued quantity for ${item.rawMaterialName}.`,
        );
        return;
      }

      const availableLots = (lotsByMaterial[item.rawMaterial] || []).filter(
        (lot) => lot.status === "available" && lot.availableQuantity > 0,
      );
      if (availableLots.length > 0 && !item.lotNumber?.trim()) {
        setError(`Select the receipt lot for ${item.rawMaterialName} before issuing stock.`);
        return;
      }
    }

    try {
      setLoading(true);

      const result =
        await issueMaterialConsumption(
          consumption._id,
          {
            items: items.map((item) => ({
              rawMaterial: item.rawMaterial,
              issuedQuantity: Number(
                item.issuedQuantity,
              ),
              lotNumber:
                item.lotNumber?.trim() || undefined,
              notes:
                item.notes?.trim() || undefined,
            })),
            notes: notes.trim() || undefined,
          },
        );

      window.dispatchEvent(
        new Event("cana:stock-updated"),
      );

      onSuccess(result);
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to issue materials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Issue Materials
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {consumption.consumptionNo}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        <div className="max-h-[calc(90vh-150px)] overflow-y-auto px-6 py-5">
          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                size={18}
                className="mt-0.5 shrink-0"
              />

              <div>{error}</div>
            </div>
          )}

          <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
            <div className="flex gap-3">
              <CheckCircle2
                size={18}
                className="mt-0.5 text-blue-600"
              />

              <div>
                <p className="text-sm font-semibold text-blue-900">
                  Material Issue
                </p>

                <p className="mt-1 text-sm text-blue-700">
                  Enter the quantity physically issued
                  from inventory to this production batch.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Raw Material
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Standard
                  </th>

                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Issue Qty
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lot Number
                  </th>

                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {items.map((item, index) => (
                  <tr key={item.rawMaterial}>
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {item.rawMaterialName}
                      </div>

                      <div className="mt-0.5 text-xs text-slate-500">
                        {item.rawMaterialCode}
                      </div>

                      <div className="mt-1 text-xs font-medium text-slate-500">
                        Unit: {item.unit}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-right font-medium text-slate-700">
                      {item.standardQuantity.toLocaleString()}
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={item.issuedQuantity}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "issuedQuantity",
                            Number(e.target.value),
                          )
                        }
                        className="w-32 rounded-lg border border-slate-300 px-3 py-2 text-right text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="text"
                        list={`lot-options-${item.rawMaterial}`}
                        value={item.lotNumber || ""}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "lotNumber",
                            e.target.value,
                          )
                        }
                        placeholder="LOT-001"
                        className="w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      />
                      <datalist id={`lot-options-${item.rawMaterial}`}>
                        {(lotsByMaterial[item.rawMaterial] || [])
                          .filter((lot) => lot.status === "available" && lot.availableQuantity > 0)
                          .map((lot) => (
                            <option key={lot.lotNumber} value={lot.lotNumber}>
                              {lot.availableQuantity} {lot.unit} available
                            </option>
                          ))}
                      </datalist>
                    </td>

                    <td className="px-4 py-4">
                      <input
                        type="text"
                        value={item.notes || ""}
                        onChange={(e) =>
                          updateItem(
                            index,
                            "notes",
                            e.target.value,
                          )
                        }
                        placeholder="Optional"
                        className="w-44 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-5">
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Issue Notes
            </label>

            <textarea
              value={notes}
              onChange={(e) =>
                setNotes(e.target.value)
              }
              rows={3}
              placeholder="Optional notes about this material issue..."
              className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading && (
              <Loader2
                size={16}
                className="animate-spin"
              />
            )}

            {loading
              ? "Issuing..."
              : "Issue Materials"}
          </button>
        </div>
      </div>
    </div>
  );
}
