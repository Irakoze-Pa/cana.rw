import api from "@/services/api";

import type {
  Supplier,
  CreateSupplierData,
  UpdateSupplierData,
} from "../types/supplier.types";

// =====================================================
// RESPONSE TYPES
// =====================================================

interface SupplierResponse {
  success: boolean;
  message?: string;
  data: Supplier;
}

interface SuppliersResponse {
  success: boolean;
  message?: string;
  data: Supplier[];
}

// =====================================================
// GET ALL SUPPLIERS
// =====================================================

export const getSuppliers = async (): Promise<Supplier[]> => {
  const response = await api.get<SuppliersResponse>("/suppliers");

  return response.data.data;
};

// =====================================================
// GET SUPPLIER BY ID
// =====================================================

export const getSupplierById = async (
  id: string
): Promise<Supplier> => {
  const response = await api.get<SupplierResponse>(
    `/suppliers/${id}`
  );

  return response.data.data;
};

// =====================================================
// CREATE SUPPLIER
// =====================================================

export const createSupplier = async (
  data: CreateSupplierData
): Promise<Supplier> => {
  const response = await api.post<SupplierResponse>(
    "/suppliers",
    data
  );

  return response.data.data;
};

// =====================================================
// UPDATE SUPPLIER
// =====================================================

export const updateSupplier = async (
  id: string,
  data: UpdateSupplierData
): Promise<Supplier> => {
  const response = await api.put<SupplierResponse>(
    `/suppliers/${id}`,
    data
  );

  return response.data.data;
};

// =====================================================
// DELETE SUPPLIER
// =====================================================

export const deleteSupplier = async (
  id: string
): Promise<void> => {
  await api.delete(`/suppliers/${id}`);
};