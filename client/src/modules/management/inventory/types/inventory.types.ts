export interface InventoryRawMaterialSummary {
  _id: string;
  name?: string;
  code?: string;
}

export interface Inventory {
  _id: string;

  rawMaterial:
    | string
    | InventoryRawMaterialSummary;

  rawMaterialName: string;
  rawMaterialCode: string;

  unit: string;

  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;

  minimumStock: number;

  averageCostPerUnit: number;

  status:
    | "Available"
    | "Low Stock"
    | "Out of Stock"
    | "Inactive";

  lastTransactionAt?: string;

  createdAt?: string;
  updatedAt?: string;

  isLowStock?: boolean;
  isOutOfStock?: boolean;
}

export interface InventorySummary {
  totalItems?: number;
  totalQuantity?: number;

  totalReservedQuantity?: number;
  totalAvailableQuantity?: number;

  totalValue?: number;
  totalInventoryValue?: number;

  lowStockCount?: number;
  lowStockItems?: number;

  outOfStockCount?: number;
  outOfStockItems?: number;

  [key: string]: unknown;
}

export type InventoryTransactionType =
  | "Purchase"
  | "Production Issue"
  | "Production Return"
  | "Adjustment"
  | "Opening Balance";

export interface AddStockData {
  rawMaterial: string;
  quantity: number;

  unitCost?: number;

  type?:
    | "Purchase"
    | "Production Return"
    | "Opening Balance";

  referenceType?:
    | "PurchaseOrder"
    | "MaterialConsumption"
    | "ProductionBatch"
    | "Manual"
    | "OpeningBalance";

  referenceId?: string;

  productionBatch?: string;
  productionOrder?: string;
  materialConsumption?: string;
  purchaseOrder?: string;

  reason?: string;
  notes?: string;
  performedBy?: string;
}

export interface RemoveStockData {
  rawMaterial: string;
  quantity: number;

  unitCost?: number;

  type?: "Production Issue";

  referenceType?:
    | "PurchaseOrder"
    | "MaterialConsumption"
    | "ProductionBatch"
    | "Manual"
    | "OpeningBalance";

  referenceId?: string;

  productionBatch?: string;
  productionOrder?: string;
  materialConsumption?: string;

  reason?: string;
  notes?: string;
  performedBy?: string;
}

export interface AdjustStockData {
  rawMaterial: string;
  newQuantity: number;

  unitCost?: number;

  reason: string;

  notes?: string;
  performedBy?: string;
}