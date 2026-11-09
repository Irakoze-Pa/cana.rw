export type FormulaStatus = "Active" | "Inactive";

export interface Product {
  _id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  packSizeKg?: number;
}

export interface FormulaOutput {
  product: string | Product;
  quantity: number;
  packSizeKg: number;
  packs: number;
}

export interface RawMaterial {
  _id: string;
  name: string;
  code: string;
  category: string;
  unit: string;
  quantity: number;
  minimumStock: number;
  costPerUnit: number;
  status: "Active" | "Inactive";
}

export interface FormulaItem {
  rawMaterial:
    | string
    | RawMaterial;
  quantity: number;
  appliesToProduct?: string | Product;
  unit: string;
  wastePercentage: number;
  notes?: string;
}

export interface Formula {
  _id: string;

  product:
    | string
    | Product;

  name: string;
  code: string;

  version: number;

  batchSize: number;
  batchUnit: string;

  outputs?: FormulaOutput[];

  items: FormulaItem[];

  laborCost: number;
  energyCost: number;
  otherCost: number;

  estimatedMaterialCost: number;
  estimatedTotalCost: number;
  costingBasis?: "inventory_weighted_average";
  costingComplete?: boolean;
  unpricedMaterials?: string[];

  status: FormulaStatus;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateFormulaData {
  product: string;
  name: string;
  code: string;
  version: number;

  batchSize: number;
  batchUnit: string;

  outputs?: {
    product: string;
    quantity: number;
    packSizeKg: number;
    packs: number;
  }[];

  items: {
    rawMaterial: string;
    appliesToProduct?: string;
    quantity: number;
    unit: string;
    wastePercentage: number;
    notes?: string;
  }[];

  laborCost: number;
  energyCost: number;
  otherCost: number;

  status: FormulaStatus;

  notes?: string;
}
