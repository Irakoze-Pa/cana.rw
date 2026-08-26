import type {
  IssueMaterialPayload,
  MaterialConsumption,
  MaterialConsumptionStats,
} from "../types/materialConsumption.types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5050/api";

const BASE_URL = `${API_BASE_URL}/material-consumptions`;

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
  result?: T;
}

async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();

  let body: ApiResponse<T> | null = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `Server returned invalid JSON (${response.status}).`,
    );
  }

  if (!response.ok) {
    throw new Error(
      body?.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return (
    body?.data ??
    body?.result ??
    (body as T)
  );
}

export async function getMaterialConsumptions(params?: {
  status?: string;
  productionOrder?: string;
  productionBatch?: string;
}) {
  const searchParams = new URLSearchParams();

  if (params?.status) {
    searchParams.set("status", params.status);
  }

  if (params?.productionOrder) {
    searchParams.set(
      "productionOrder",
      params.productionOrder,
    );
  }

  if (params?.productionBatch) {
    searchParams.set(
      "productionBatch",
      params.productionBatch,
    );
  }

  const query = searchParams.toString();

  return request<MaterialConsumption[]>(
    `${BASE_URL}${query ? `?${query}` : ""}`,
  );
}

export async function getMaterialConsumptionById(
  id: string,
) {
  return request<MaterialConsumption>(
    `${BASE_URL}/${id}`,
  );
}

export async function getMaterialConsumptionStats() {
  return request<MaterialConsumptionStats>(
    `${BASE_URL}/stats`,
  );
}

export async function issueMaterialConsumption(
  id: string,
  payload: IssueMaterialPayload,
) {
  return request<MaterialConsumption>(
    `${BASE_URL}/${id}/issue`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}