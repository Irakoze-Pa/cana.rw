// =========================================================
// SUPPLIER SUMMARY
// =========================================================

export interface SupplierSummary {
  _id: string;
  name: string;
  code?: string;
}

// =========================================================
// RAW MATERIAL
// =========================================================

export interface RawMaterial {
  _id: string;

  name: string;
  code: string;
  category: string;

  unit: string;

  /**
   * Current physical stock.
   */
  quantity: number;

  /**
   * Quantity reserved for production/orders.
   */
  reservedQuantity: number;

  /**
   * Quantity available for use.
   *
   * availableQuantity =
   * quantity - reservedQuantity
   */
  availableQuantity: number;

  /**
   * Minimum stock level.
   */
  minimumStock: number;

  /**
   * Cost per unit.
   */
  costPerUnit: number;

  /**
   * Populated supplier.
   */
  supplier?: SupplierSummary;

  status: "Active" | "Inactive";

  /**
   * Virtual fields from backend.
   */
  isLowStock?: boolean;

  isOutOfStock?: boolean;

  createdAt?: string;

  updatedAt?: string;
}

// =========================================================
// CREATE RAW MATERIAL
// =========================================================

export interface CreateRawMaterialData {
  name: string;

  code?: string;

  category: string;

  unit: string;

  /**
   * Initial stock.
   */
  quantity?: number;

  /**
   * Initial reserved quantity.
   *
   * Usually this should remain 0 when creating
   * a new raw material.
   */
  reservedQuantity?: number;

  /**
   * Normally calculated by backend.
   *
   * Frontend does not need to send this.
   */
  availableQuantity?: number;

  minimumStock?: number;

  /** Set from supplier offers or a goods-received note, not material setup. */
  costPerUnit?: number;

  status?: "Active" | "Inactive";
}

// =========================================================
// UPDATE RAW MATERIAL
// =========================================================

export interface UpdateRawMaterialData {
  name?: string;

  code?: string;

  category?: string;

  unit?: string;

  /**
   * Current physical stock.
   *
   * Later Inventory will control this value.
   */
  quantity?: number;

  /**
   * Reserved stock.
   */
  reservedQuantity?: number;

  /**
   * Normally calculated by backend.
   */
  availableQuantity?: number;

  minimumStock?: number;

  /** Set from supplier offers or a goods-received note, not material setup. */
  costPerUnit?: number;

  status?: "Active" | "Inactive";
}
