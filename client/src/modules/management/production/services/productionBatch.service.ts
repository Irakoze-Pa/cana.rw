import type {
  CreateProductionBatchData,
  ProductionBatch,
  ProductionBatchStats,
  UpdateProductionBatchData,
} from "../types/productionBatch.types";

// =====================================================
// API URL
// =====================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5050/api";

const API_URL = `${API_BASE_URL}/production-batches`;

// =====================================================
// PARSE RESPONSE
// =====================================================

async function parseResponse<T>(
  response: Response,
): Promise<T> {
  const contentType =
    response.headers.get("content-type") || "";

  let result: unknown;

  try {
    if (contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }
  } catch {
    result = null;
  }

  if (!response.ok) {
    if (
      typeof result === "object" &&
      result !== null
    ) {
      const body = result as {
        message?: unknown;
        error?: unknown;
      };

      if (typeof body.message === "string") {
        throw new Error(body.message);
      }

      if (typeof body.error === "string") {
        throw new Error(body.error);
      }
    }

    if (
      typeof result === "string" &&
      result.trim()
    ) {
      throw new Error(result);
    }

    throw new Error(
      `Request failed with status ${response.status}.`,
    );
  }

  return result as T;
}

// =====================================================
// GET ALL
// =====================================================

export async function getProductionBatches(): Promise<
  ProductionBatch[]
> {
  const response = await fetch(API_URL);

  const result = await parseResponse<{
    success: boolean;
    data?: ProductionBatch[];
  }>(response);

  return Array.isArray(result.data)
    ? result.data
    : [];
}

// =====================================================
// GET BY ID
// =====================================================

export async function getProductionBatchById(
  id: string,
): Promise<ProductionBatch> {
  if (!id.trim()) {
    throw new Error(
      "Production batch ID is required.",
    );
  }

  const response = await fetch(
    `${API_URL}/${id}`,
  );

  const result = await parseResponse<{
    success: boolean;
    data: ProductionBatch;
  }>(response);

  return result.data;
}

// =====================================================
// GET STATS
// =====================================================

export async function getProductionBatchStats(): Promise<
  ProductionBatchStats
> {
  const response = await fetch(
    `${API_URL}/stats`,
  );

  const result = await parseResponse<{
    success: boolean;
    data?: ProductionBatchStats;
  }>(response);

  return (
    result.data ?? {
      total: 0,
      planned: 0,
      ready: 0,
      inProgress: 0,
      paused: 0,
      completed: 0,
      cancelled: 0,
    }
  );
}

// =====================================================
// CREATE
// =====================================================

export async function createProductionBatch(
  data: CreateProductionBatchData,
): Promise<ProductionBatch> {
  const response = await fetch(API_URL, {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(data),
  });

  const result = await parseResponse<{
    success: boolean;
    data: ProductionBatch;
  }>(response);

  return result.data;
}

// =====================================================
// UPDATE
// =====================================================

export async function updateProductionBatch(
  id: string,
  data: UpdateProductionBatchData,
): Promise<ProductionBatch> {
  if (!id.trim()) {
    throw new Error(
      "Production batch ID is required.",
    );
  }

  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(data),
    },
  );

  const result = await parseResponse<{
    success: boolean;
    data: ProductionBatch;
  }>(response);

  return result.data;
}

// =====================================================
// DELETE
// =====================================================

export async function deleteProductionBatch(
  id: string,
): Promise<void> {
  if (!id.trim()) {
    throw new Error(
      "Production batch ID is required.",
    );
  }

  const response = await fetch(
    `${API_URL}/${id}`,
    {
      method: "DELETE",
    },
  );

  await parseResponse<{
    success: boolean;
    message?: string;
  }>(response);
}