export type MaterialConsumptionStatus =
  | "Draft"
  | "Issued"
  | "Partially Consumed"
  | "Consumed"
  | "Cancelled";

export interface MaterialConsumptionItem {
  _id?: string;
  rawMaterial: string;
  rawMaterialName: string;
  rawMaterialCode: string;
  unit: string;

  standardQuantity: number;
  issuedQuantity: number;
  actualQuantity: number;
  wasteQuantity: number;
  returnQuantity: number;

  varianceQuantity: number;
  variancePercentage: number;

  lotNumber?: string;
  notes?: string;
}

export interface ProductionBatchReference {
  _id: string;
  batchNo?: string;
  batchNumber?: string;
  productName?: string;
  productCode?: string;
  status?: string;
}

export interface MaterialConsumption {
  _id: string;

  consumptionNo: string;

  productionOrder:
    | string
    | {
        _id: string;
        productionOrderNo?: string;
        productName?: string;
        productCode?: string;
      };

  productionBatch:
    | string
    | ProductionBatchReference;

  product?: string;
  productName?: string;
  productCode?: string;

  formula?: string;
  formulaName?: string;
  formulaVersion?: number | string;

  batchNumber?: string;

  status: MaterialConsumptionStatus;

  items: MaterialConsumptionItem[];

  totalStandardQuantity: number;
  totalIssuedQuantity: number;
  totalActualQuantity: number;
  totalWasteQuantity: number;
  totalReturnQuantity: number;
  totalVarianceQuantity: number;

  notes?: string;

  createdBy?: string;
  updatedBy?: string;
  issuedBy?: string;
  consumedBy?: string;
  completedBy?: string;

  issuedAt?: string;
  consumedAt?: string;
  cancelledAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface IssueMaterialItem {
  rawMaterial: string;
  issuedQuantity: number;
  lotNumber?: string;
  notes?: string;
}

export interface IssueMaterialPayload {
  issuedBy?: string;
  items?: IssueMaterialItem[];
  notes?: string;
}

export interface MaterialConsumptionStats {
  total: number;
  draft: number;
  issued: number;
  partiallyConsumed: number;
  consumed: number;
  cancelled: number;
}