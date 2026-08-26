import type {
  MaterialConsumptionStatus,
} from "../types/materialConsumption.types";

interface ConsumptionStatusBadgeProps {
  status: MaterialConsumptionStatus;
  className?: string;
}

const statusConfig: Record<
  MaterialConsumptionStatus,
  {
    label: string;
    className: string;
  }
> = {
  Draft: {
    label: "Draft",
    className:
      "border-slate-200 bg-slate-50 text-slate-700",
  },

  Issued: {
    label: "Issued",
    className:
      "border-blue-200 bg-blue-50 text-blue-700",
  },

  "Partially Consumed": {
    label: "Partially Consumed",
    className:
      "border-amber-200 bg-amber-50 text-amber-700",
  },

  Consumed: {
    label: "Consumed",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700",
  },

  Cancelled: {
    label: "Cancelled",
    className:
      "border-red-200 bg-red-50 text-red-700",
  },
};

export default function ConsumptionStatusBadge({
  status,
  className = "",
}: ConsumptionStatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status || "Unknown",
    className:
      "border-slate-200 bg-slate-50 text-slate-600",
  };

  return (
    <span
      className={[
        "inline-flex items-center",
        "whitespace-nowrap",
        "rounded-full",
        "border",
        "px-2.5 py-1",
        "text-xs font-semibold",
        "leading-none",
        config.className,
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <span
        className="mr-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current"
        aria-hidden="true"
      />

      <span>{config.label}</span>
    </span>
  );
}