export interface Product {
  _id: string;

  code: string;

  name: string;
  category: string;

  price: number;
  stock: number;

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

  unit?: string;

  description?: string;

  status?: "Active" | "Inactive";

  image?: File;
}