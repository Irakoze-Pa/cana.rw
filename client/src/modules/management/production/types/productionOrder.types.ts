export type ProductionOrderStatus =
  | "Draft"
  | "Planned"
  | "Released"
  | "In Production"
  | "Completed"
  | "Cancelled"
  | "On Hold";

export type ProductionOrderPriority =
  | "Low"
  | "Normal"
  | "High"
  | "Urgent";

export interface ProductionOrderProduct {
  _id: string;
  name: string;
  code?: string;
  productCode?: string;
  sku?: string;
  category?: string;
  unit?: string;
}

export interface ProductionOrderFormula {
  _id: string;
  name: string;
  code?: string;
  formulaCode?: string;
  version?: number;
  batchSize?: number;
  batchUnit?: string;
  status?: "Active" | "Inactive";
}

export interface ProductionOrder {
  _id: string;
  productionOrderNo: string;

  product:
    | string
    | ProductionOrderProduct
    | null;

  productName?: string;
  productCode?: string;

  formula:
    | string
    | ProductionOrderFormula
    | null;

  formulaName?: string;
  formulaCode?: string;
  formulaVersion?: number;

  quantity: number;
  unit: string;

  status: ProductionOrderStatus;
  priority: ProductionOrderPriority;

  plannedDate?: string;
  expectedCompletionDate?: string;

  notes?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductionOrderData {
  product: string;
  formula: string;
  quantity: number;
  unit: string;
  priority: ProductionOrderPriority;
  plannedDate?: string;
  expectedCompletionDate?: string;
  notes?: string;
}

export interface UpdateProductionOrderData {
  quantity?: number;
  unit?: string;
  priority?: ProductionOrderPriority;
  status?: ProductionOrderStatus;
  plannedDate?: string;
  expectedCompletionDate?: string;
  notes?: string;
}

export interface ProductionOrderStats {
  total: number;
  draft: number;
  planned: number;
  released: number;
  inProduction: number;
  completed: number;
  cancelled: number;
  onHold: number;
}