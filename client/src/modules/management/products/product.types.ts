export interface Product {
  _id: string;

  code: string;

  name: string;
  category: string;

  price: number;
  stock: number;
  baseUnit?: "kg" | "pcs";
  packSizeKg?: number;
  densityKgPerL?: number;
  pricePerKg?: number | null;

  unit: string;

  description?: string;

  status: "Active" | "Inactive";

  image?: string;

  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductData {
  code: string;

  name: string;
  category: string;

  price: number;
  stock: number;
  packSizeKg: number;
  densityKgPerL?: number;

  unit: string;

  description?: string;

  status?: "Active" | "Inactive";

  image?: File;
}

export interface UpdateProductData {
  code?: string;

  name?: string;
  category?: string;

  price?: number;
  stock?: number;
  packSizeKg?: number;
  densityKgPerL?: number;

  unit?: string;

  description?: string;

  status?: "Active" | "Inactive";

  image?: File;
}
