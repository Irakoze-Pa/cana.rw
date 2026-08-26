export type SupplierStatus = "Active" | "Inactive";

export interface Supplier {
  _id: string;

  name: string;
  code: string;

  contactPerson?: string;
  phone?: string;
  email?: string;

  address?: string;
  city?: string;
  country?: string;

  paymentTerms?: string;

  status: SupplierStatus;

  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface CreateSupplierData {
  name: string;
  code: string;

  contactPerson?: string;
  phone?: string;
  email?: string;

  address?: string;
  city?: string;
  country?: string;

  paymentTerms?: string;

  status?: SupplierStatus;

  notes?: string;
}

export interface UpdateSupplierData
  extends Partial<CreateSupplierData> {}