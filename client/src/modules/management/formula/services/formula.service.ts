import axios from "axios";

import type {
  Formula,
  CreateFormulaData,
} from "../types/formula.types";

const API_URL =
  "http://localhost:5050/api/formulas";

// =====================================================
// GET ALL
// =====================================================

export async function getFormulas(): Promise<Formula[]> {
  const response = await axios.get(API_URL);

  return Array.isArray(response.data?.data)
    ? response.data.data
    : [];
}

// =====================================================
// GET ONE
// =====================================================

export async function getFormulaById(
  id: string
): Promise<Formula> {
  const response = await axios.get(
    `${API_URL}/${id}`
  );

  return response.data.data;
}

// =====================================================
// GET BY PRODUCT
// =====================================================

export async function getFormulasByProduct(
  productId: string
): Promise<Formula[]> {
  const response = await axios.get(
    `${API_URL}/product/${productId}`
  );

  return Array.isArray(response.data?.data)
    ? response.data.data
    : [];
}

// =====================================================
// GET ACTIVE
// =====================================================

export async function getActiveFormulaByProduct(
  productId: string
): Promise<Formula | null> {
  try {
    const response = await axios.get(
      `${API_URL}/product/${productId}/active`
    );

    return response.data?.data || null;
  } catch (error: any) {
    if (error?.response?.status === 404) {
      return null;
    }

    throw error;
  }
}

// =====================================================
// CREATE NEW FORMULA
// =====================================================
//
// "New Formula"
//
//
// Backend automatically creates:
// V1
//
// IMPORTANT:
// Do not send version from frontend.
//

export async function createFormula(
  data: CreateFormulaData
): Promise<Formula> {
  const response = await axios.post(
    API_URL,
    data
  );

  return response.data.data;
}

// =====================================================
// CREATE NEW VERSION
// =====================================================
//
// Example:
//
// INT-WHT V1
// INT-WHT V2
// INT-WHT V3
//
// CODE REMAINS THE SAME.
// ONLY VERSION CHANGES.
//

export async function createNewFormulaVersion(
  id: string,
  data: Partial<CreateFormulaData> = {}
): Promise<Formula> {
  const response = await axios.post(
    `${API_URL}/${id}/version`,
    data
  );

  return response.data.data;
}

// =====================================================
// UPDATE EXISTING FORMULA
// =====================================================
//
// Editing formula does NOT create a new version.
//
// Example:
//
// INT-WHT V2
//   ↓ edit
// INT-WHT V2
//
// To create V3 use createNewFormulaVersion().
//

export async function updateFormula(
  id: string,
  data: Partial<CreateFormulaData>
): Promise<Formula> {
  const response = await axios.patch(
    `${API_URL}/${id}`,
    data
  );

  return response.data.data;
}

// =====================================================
// DEACTIVATE
// =====================================================

export async function deactivateFormula(
  id: string
): Promise<Formula> {
  const response = await axios.patch(
    `${API_URL}/${id}/deactivate`
  );

  return response.data.data;
}

// =====================================================
// DELETE
// =====================================================

export async function deleteFormula(
  id: string
) {
  const response = await axios.delete(
    `${API_URL}/${id}`
  );

  return response.data;
}