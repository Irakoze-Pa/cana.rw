import type {
  CreateRawMaterialData,
  UpdateRawMaterialData,
  RawMaterial,
} from "../types/rawMaterial.types";

// =========================================================
// API CONFIG
// =========================================================

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5050/api";

// =========================================================
// RESPONSE TYPE
// =========================================================

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data?: T;
}

// =========================================================
// ERROR HELPER
// =========================================================

const getErrorMessage = (
  data: unknown,
  fallback: string
): string => {
  if (
    data &&
    typeof data === "object" &&
    "message" in data
  ) {
    const message = (
      data as {
        message?: unknown;
      }
    ).message;

    if (typeof message === "string") {
      return message;
    }
  }

  return fallback;
};

// =========================================================
// GET ALL RAW MATERIALS
// =========================================================

export const getRawMaterials =
  async (): Promise<RawMaterial[]> => {
    const response = await fetch(
      `${API_URL}/raw-materials`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Invalid response from server"
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Failed to fetch raw materials"
        )
      );
    }

    const result =
      data as ApiResponse<RawMaterial[]>;

    return result.data ?? [];
  };

// =========================================================
// GET RAW MATERIAL BY ID
// =========================================================

export const getRawMaterialById =
  async (
    id: string
  ): Promise<RawMaterial> => {
    if (!id) {
      throw new Error(
        "Raw material ID is required"
      );
    }

    const response = await fetch(
      `${API_URL}/raw-materials/${id}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      }
    );

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Invalid response from server"
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Failed to fetch raw material"
        )
      );
    }

    const result =
      data as ApiResponse<RawMaterial>;

    if (!result.data) {
      throw new Error(
        "Raw material was not returned by the server"
      );
    }

    return result.data;
  };

// =========================================================
// CREATE RAW MATERIAL
// =========================================================

export const createRawMaterial =
  async (
    payload: CreateRawMaterialData
  ): Promise<RawMaterial> => {
    const response = await fetch(
      `${API_URL}/raw-materials`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Invalid response from server"
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Failed to create raw material"
        )
      );
    }

    const result =
      data as ApiResponse<RawMaterial>;

    if (!result.data) {
      throw new Error(
        "Raw material was not returned after creation"
      );
    }

    return result.data;
  };

// =========================================================
// UPDATE RAW MATERIAL
// =========================================================

export const updateRawMaterial =
  async (
    id: string,
    payload: UpdateRawMaterialData
  ): Promise<RawMaterial> => {
    if (!id) {
      throw new Error(
        "Raw material ID is required"
      );
    }

    const response = await fetch(
      `${API_URL}/raw-materials/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    let data: unknown;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        "Invalid response from server"
      );
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Failed to update raw material"
        )
      );
    }

    const result =
      data as ApiResponse<RawMaterial>;

    if (!result.data) {
      throw new Error(
        "Raw material was not returned after update"
      );
    }

    return result.data;
  };

// =========================================================
// DELETE RAW MATERIAL
// =========================================================

export const deleteRawMaterial =
  async (
    id: string
  ): Promise<void> => {
    if (!id) {
      throw new Error(
        "Raw material ID is required"
      );
    }

    const response = await fetch(
      `${API_URL}/raw-materials/${id}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
        },
      }
    );

    let data: unknown = null;

    /**
     * DELETE may return JSON or an empty response.
     */
    try {
      const text =
        await response.text();

      if (text) {
        data = JSON.parse(text);
      }
    } catch {
      // Ignore empty/non-JSON DELETE response.
    }

    if (!response.ok) {
      throw new Error(
        getErrorMessage(
          data,
          "Failed to delete raw material"
        )
      );
    }
  };

// =========================================================
// DEFAULT EXPORT
// =========================================================

export default {
  getRawMaterials,
  getRawMaterialById,
  createRawMaterial,
  updateRawMaterial,
  deleteRawMaterial,
};