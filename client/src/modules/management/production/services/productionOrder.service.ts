import type {
  CreateProductionOrderData,
  ProductionOrder,
  ProductionOrderStats,
  UpdateProductionOrderData,
} from "../types/productionOrder.types";

// =====================================================
// API URL
// =====================================================

const API_URL =
  "http://localhost:5050/api/production-orders";

// =====================================================
// PARSE RESPONSE
// =====================================================

async function parseResponse<T>(
  response: Response
): Promise<T> {
  const contentType =
    response.headers.get(
      "content-type"
    ) || "";

  let result: unknown;

  if (
    contentType.includes(
      "application/json"
    )
  ) {
    result =
      await response.json();
  } else {
    result =
      await response.text();
  }

  if (!response.ok) {
    if (
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof (
        result as {
          message?: unknown;
        }
      ).message === "string"
    ) {
      throw new Error(
        String(
          (
            result as {
              message: string;
            }
          ).message
        )
      );
    }

    if (
      typeof result === "string" &&
      result.trim()
    ) {
      throw new Error(result);
    }

    throw new Error(
      `Request failed with status ${response.status}.`
    );
  }

  return result as T;
}

// =====================================================
// GET ALL
// =====================================================

export async function getProductionOrders(): Promise<
  ProductionOrder[]
> {
  const response =
    await fetch(API_URL);

  const result = await parseResponse<{
    success: boolean;
    data?: ProductionOrder[];
  }>(response);

  return Array.isArray(
    result.data
  )
    ? result.data
    : [];
}

// =====================================================
// GET BY ID
// =====================================================

export async function getProductionOrderById(
  id: string
): Promise<ProductionOrder> {
  if (!id) {
    throw new Error(
      "Production order ID is required."
    );
  }

  const response =
    await fetch(
      `${API_URL}/${id}`
    );

  const result =
    await parseResponse<{
      success: boolean;
      data: ProductionOrder;
    }>(response);

  return result.data;
}

// =====================================================
// GET STATS
// =====================================================

export async function getProductionOrderStats(): Promise<
  ProductionOrderStats
> {
  const response =
    await fetch(
      `${API_URL}/stats`
    );

  const result =
    await parseResponse<{
      success: boolean;
      data?: ProductionOrderStats;
    }>(response);

  return (
    result.data ?? {
      total: 0,
      draft: 0,
      planned: 0,
      released: 0,
      inProduction: 0,
      completed: 0,
      cancelled: 0,
      onHold: 0,
    }
  );
}

// =====================================================
// CREATE
// =====================================================

export async function createProductionOrder(
  data: CreateProductionOrderData
): Promise<ProductionOrder> {
  const response =
    await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(data),
    });

  const result =
    await parseResponse<{
      success: boolean;
      data: ProductionOrder;
    }>(response);

  return result.data;
}

// =====================================================
// UPDATE
// =====================================================

export async function updateProductionOrder(
  id: string,
  data: UpdateProductionOrderData
): Promise<ProductionOrder> {
  if (!id) {
    throw new Error(
      "Production order ID is required."
    );
  }

  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(data),
      }
    );

  const result =
    await parseResponse<{
      success: boolean;
      data: ProductionOrder;
    }>(response);

  return result.data;
}

// =====================================================
// DELETE
// =====================================================

export async function deleteProductionOrder(
  id: string
): Promise<void> {
  if (!id) {
    throw new Error(
      "Production order ID is required."
    );
  }

  const response =
    await fetch(
      `${API_URL}/${id}`,
      {
        method: "DELETE",
      }
    );

  await parseResponse<{
    success: boolean;
    message: string;
  }>(response);
}