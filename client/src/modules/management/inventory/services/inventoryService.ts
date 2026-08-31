import type {
  AddStockData,
  AdjustStockData,
  Inventory,
  InventorySummary,
  RemoveStockData,
} from "../types/inventory.types";

const API_URL =
  import.meta.env.VITE_API_URL || "/api/v1";

const getErrorMessage = (
  result: unknown,
  fallback: string
): string => {
  if (
    typeof result === "object" &&
    result !== null
  ) {
    const data = result as {
      message?: string;
      error?: string;
    };

    if (data.message) return data.message;
    if (data.error) return data.error;
  }

  return fallback;
};

const unwrapData = <T>(
  result: unknown,
  fallback: T
): T => {
  if (
    typeof result === "object" &&
    result !== null &&
    "data" in result
  ) {
    return (
      (result as { data?: T }).data ?? fallback
    );
  }

  return (result as T) ?? fallback;
};

const inventoryService = {
  async getInventory(): Promise<Inventory[]> {
    const response = await fetch(
      `${API_URL}/inventory`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          result,
          "Failed to fetch inventory"
        )
      );
    }

    return unwrapData<Inventory[]>(
      result,
      []
    );
  },

  async getInventorySummary(): Promise<InventorySummary> {
    const response = await fetch(
      `${API_URL}/inventory/summary`
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          result,
          "Failed to fetch inventory summary"
        )
      );
    }

    return unwrapData<InventorySummary>(
      result,
      {}
    );
  },

  async addStock(
    data: AddStockData
  ): Promise<Inventory> {
    const response = await fetch(
      `${API_URL}/inventory/stock/add`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          result,
          "Failed to add stock"
        )
      );
    }

    return unwrapData<Inventory>(
      result,
      result as Inventory
    );
  },

  async removeStock(
    data: RemoveStockData
  ): Promise<Inventory> {
    const response = await fetch(
      `${API_URL}/inventory/stock/remove`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          result,
          "Failed to remove stock"
        )
      );
    }

    return unwrapData<Inventory>(
      result,
      result as Inventory
    );
  },

  async adjustStock(
    data: AdjustStockData
  ): Promise<Inventory> {
    const response = await fetch(
      `${API_URL}/inventory/stock/adjust`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          result,
          "Failed to adjust stock"
        )
      );
    }

    return unwrapData<Inventory>(
      result,
      result as Inventory
    );
  },
};

export default inventoryService;
