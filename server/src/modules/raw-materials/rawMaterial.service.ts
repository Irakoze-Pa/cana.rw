import RawMaterial from "./rawMaterial.model";

export interface CreateRawMaterialData {
  name: string;
  code: string;
  category: string;
  unit: string;

  quantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;

  minimumStock?: number;

  costPerUnit: number;

  supplier: string;

  status?: "Active" | "Inactive";
}

export interface UpdateRawMaterialData {
  name?: string;
  code?: string;
  category?: string;
  unit?: string;

  quantity?: number;
  reservedQuantity?: number;
  availableQuantity?: number;

  minimumStock?: number;

  costPerUnit?: number;

  supplier?: string;

  status?: "Active" | "Inactive";
}

/**
 * =========================================================
 * HELPER
 * =========================================================
 *
 * Calculates the quantity that is actually available.
 *
 * availableQuantity =
 * quantity - reservedQuantity
 *
 * Example:
 *
 * quantity         = 500
 * reservedQuantity = 100
 * available        = 400
 */
const calculateAvailableQuantity = (
  quantity: number,
  reservedQuantity: number
) => {
  if (reservedQuantity > quantity) {
    throw new Error(
      "Reserved quantity cannot be greater than current quantity"
    );
  }

  return Math.max(
    0,
    quantity - reservedQuantity
  );
};

/**
 * =========================================================
 * CREATE RAW MATERIAL
 * =========================================================
 */
export const createRawMaterial = async (
  data: CreateRawMaterialData
) => {
  const code =
    data.code.trim().toUpperCase();

  /**
   * Check duplicate material code
   */
  const existingMaterial =
    await RawMaterial.findOne({
      code,
    });

  if (existingMaterial) {
    throw new Error(
      "Raw material code already exists"
    );
  }

  /**
   * Normalize quantity
   */
  const quantity =
    Number(data.quantity ?? 0);

  /**
   * Normalize reserved quantity
   */
  const reservedQuantity =
    Number(
      data.reservedQuantity ?? 0
    );

  /**
   * Validate quantities
   */
  if (quantity < 0) {
    throw new Error(
      "Quantity cannot be negative"
    );
  }

  if (reservedQuantity < 0) {
    throw new Error(
      "Reserved quantity cannot be negative"
    );
  }

  /**
   * Calculate available quantity
   */
  const availableQuantity =
    calculateAvailableQuantity(
      quantity,
      reservedQuantity
    );

  /**
   * Create raw material
   */
  const rawMaterial =
    await RawMaterial.create({
      name: data.name.trim(),

      code,

      category:
        data.category.trim(),

      unit: data.unit.trim(),

      quantity,

      reservedQuantity,

      availableQuantity,

      minimumStock:
        Number(
          data.minimumStock ?? 0
        ),

      costPerUnit:
        Number(data.costPerUnit),

      supplier: data.supplier,

      status:
        data.status ?? "Active",
    });

  /**
   * Return populated material
   */
  return await RawMaterial.findById(
    rawMaterial._id
  ).populate(
    "supplier",
    "name code"
  );
};

/**
 * =========================================================
 * GET ALL RAW MATERIALS
 * =========================================================
 */
export const getRawMaterials =
  async () => {
    return await RawMaterial.find()
      .populate(
        "supplier",
        "name code"
      )
      .sort({
        createdAt: -1,
      });
  };

/**
 * =========================================================
 * GET RAW MATERIAL BY ID
 * =========================================================
 */
export const getRawMaterialById =
  async (id: string) => {
    return await RawMaterial.findById(
      id
    ).populate(
      "supplier",
      "name code"
    );
  };

/**
 * =========================================================
 * UPDATE RAW MATERIAL
 * =========================================================
 */
export const updateRawMaterial =
  async (
    id: string,
    data: UpdateRawMaterialData
  ) => {
    /**
     * Find existing material first.
     */
    const existingRawMaterial =
      await RawMaterial.findById(id);

    if (!existingRawMaterial) {
      throw new Error(
        "Raw material not found"
      );
    }

    /**
     * Normalize code
     */
    if (data.code) {
      data.code =
        data.code
          .trim()
          .toUpperCase();

      /**
       * Check duplicate code
       */
      const existingMaterial =
        await RawMaterial.findOne({
          code: data.code,
          _id: {
            $ne: id,
          },
        });

      if (existingMaterial) {
        throw new Error(
          "Raw material code already exists"
        );
      }
    }

    /**
     * Determine final quantity.
     *
     * If quantity is not included in update,
     * keep existing quantity.
     */
    const quantity =
      data.quantity !== undefined
        ? Number(data.quantity)
        : existingRawMaterial.quantity;

    /**
     * Determine final reserved quantity.
     */
    const reservedQuantity =
      data.reservedQuantity !==
      undefined
        ? Number(
            data.reservedQuantity
          )
        : existingRawMaterial.reservedQuantity;

    /**
     * Validate quantity
     */
    if (quantity < 0) {
      throw new Error(
        "Quantity cannot be negative"
      );
    }

    /**
     * Validate reserved quantity
     */
    if (reservedQuantity < 0) {
      throw new Error(
        "Reserved quantity cannot be negative"
      );
    }

    /**
     * Calculate available quantity
     */
    const availableQuantity =
      calculateAvailableQuantity(
        quantity,
        reservedQuantity
      );

    /**
     * Build update object.
     */
    const updateData: Record<
      string,
      unknown
    > = {
      ...data,

      quantity,

      reservedQuantity,

      availableQuantity,
    };

    /**
     * Normalize common string fields.
     */
    if (data.name !== undefined) {
      updateData.name =
        data.name.trim();
    }

    if (
      data.category !== undefined
    ) {
      updateData.category =
        data.category.trim();
    }

    if (data.unit !== undefined) {
      updateData.unit =
        data.unit.trim();
    }

    /**
     * Update material.
     */
    return await RawMaterial.findByIdAndUpdate(
      id,
      updateData,
      {
        returnDocument: "after",
        runValidators: true,
      }
    ).populate(
      "supplier",
      "name code"
    );
  };

/**
 * =========================================================
 * DELETE RAW MATERIAL
 * =========================================================
 */
export const deleteRawMaterial =
  async (id: string) => {
    const rawMaterial =
      await RawMaterial.findById(
        id
      );

    if (!rawMaterial) {
      throw new Error(
        "Raw material not found"
      );
    }

    /**
     * Do not allow deleting material
     * that currently has stock.
     *
     * This protects production/inventory
     * data from accidental deletion.
     */
    if (rawMaterial.quantity > 0) {
      throw new Error(
        "Cannot delete raw material with available stock"
      );
    }

    /**
     * Do not allow deleting material
     * that has reserved stock.
     */
    if (
      rawMaterial.reservedQuantity >
      0
    ) {
      throw new Error(
        "Cannot delete raw material with reserved stock"
      );
    }

    return await RawMaterial.findByIdAndDelete(
      id
    );
  };