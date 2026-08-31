import api from "@/services/api";

// =====================================================
// API
// =====================================================

const API_URL = "/purchase-orders";

// =====================================================
// STATUS
// =====================================================

export type PurchaseOrderStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "partially_received"
  | "received"
  | "cancelled";

// =====================================================
// ITEM
// =====================================================

export interface PurchaseOrderItem {
  rawMaterial: string;

  quantity: number;

  unit: string;

  unitPrice: number;

  total: number;
}

// =====================================================
// PURCHASE ORDER
// =====================================================

export interface PurchaseOrder {
  _id: string;

  poNumber: string;

  supplier:
    | string
    | {
        _id: string;
        name: string;
        code?: string;
      };

  orderDate: string;

  expectedDeliveryDate?: string;

  items: PurchaseOrderItem[];

  subtotal: number;

  tax: number;

  total: number;

  status: PurchaseOrderStatus;

  notes?: string;

  createdAt: string;

  updatedAt: string;
}

// =====================================================
// CREATE DATA
// =====================================================

export interface CreatePurchaseOrderData {
  supplier: string;

  orderDate: string;

  expectedDeliveryDate?: string;

  items: PurchaseOrderItem[];

  subtotal: number;

  tax: number;

  total: number;

  notes?: string;
}

// =====================================================
// GET ALL
// =====================================================

export async function getPurchaseOrders() {
  const response = await api.get(API_URL);

  return response.data;
}

// =====================================================
// GET ONE
// =====================================================

export async function getPurchaseOrderById(
  id: string
) {
  const response = await api.get(
    `${API_URL}/${id}`
  );

  return response.data;
}

// =====================================================
// CREATE
// =====================================================

export async function createPurchaseOrder(
  data: CreatePurchaseOrderData
) {
  const response = await api.post(
    API_URL,
    data
  );

  return response.data;
}

// =====================================================
// UPDATE STATUS
// =====================================================

export async function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus
) {
  const response = await api.patch(
    `${API_URL}/${id}/status`,
    {
      status,
    }
  );

  return response.data;
}

// =====================================================
// DELETE
// =====================================================

export async function deletePurchaseOrder(
  id: string
) {
  const response = await api.delete(
    `${API_URL}/${id}`
  );

  return response.data;
}
