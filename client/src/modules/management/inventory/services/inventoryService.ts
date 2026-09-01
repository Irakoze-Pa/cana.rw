import type {
  AddStockData,
  AdjustStockData,
  Inventory,
  InventorySummary,
  RemoveStockData,
} from "../types/inventory.types";
import api from "@/services/api";

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
    const response = await api.get("/inventory");

    return unwrapData<Inventory[]>(
      response.data,
      []
    );
  },

  async getInventorySummary(): Promise<InventorySummary> {
    const response = await api.get("/inventory/summary");

    return unwrapData<InventorySummary>(
      response.data,
      {}
    );
  },

  async addStock(
    data: AddStockData
  ): Promise<Inventory> {
    const response = await api.post("/inventory/stock/add", data);

    return unwrapData<Inventory>(
      response.data,
      response.data as Inventory
    );
  },

  async removeStock(
    data: RemoveStockData
  ): Promise<Inventory> {
    const response = await api.post("/inventory/stock/remove", data);

    return unwrapData<Inventory>(
      response.data,
      response.data as Inventory
    );
  },

  async adjustStock(
    data: AdjustStockData
  ): Promise<Inventory> {
    const response = await api.post("/inventory/stock/adjust", data);

    return unwrapData<Inventory>(
      response.data,
      response.data as Inventory
    );
  },
};

export default inventoryService;
