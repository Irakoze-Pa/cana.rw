import Product from "./product.model";
import cloudinary from "../../config/cloudinary";

export interface CreateProductData {
  name: string;
  code: string;
  category: string;
  price: number;
  stock?: number;
  packSizeKg?: number;
  densityKgPerL?: number;
  unit: string;
  description?: string;
  image?: string;
  status?: "Active" | "Inactive";
  trackBatch?: boolean;
}

export interface UpdateProductData {
  name?: string;
  code?: string;
  category?: string;
  price?: number;
  stock?: number;
  packSizeKg?: number;
  densityKgPerL?: number;
  unit?: string;
  description?: string;
  image?: string;
  status?: "Active" | "Inactive";
  trackBatch?: boolean;
}

function getPackagingData(data: {
  category?: string;
  unit?: string;
  densityKgPerL?: number;
}) {
  const category = String(data.category || "").trim();
  const normalizedUnit = String(data.unit || "").trim().toLowerCase();

  if (category === "Wall Master") {
    if (normalizedUnit !== "30kg") {
      throw new Error("Wall Master must be packed as 30kg.");
    }
    return { packSizeKg: 30, densityKgPerL: undefined };
  }

  const litres = normalizedUnit === "4l" ? 4 : normalizedUnit === "20l" ? 20 : 0;
  if (!litres) {
    throw new Error("CANA Paints products must be packed as 4L or 20L.");
  }

  const densityKgPerL = Number(data.densityKgPerL);
  if (!Number.isFinite(densityKgPerL) || densityKgPerL <= 0) {
    throw new Error("Paint density in kg/L must be greater than zero.");
  }

  return {
    packSizeKg: Number((litres * densityKgPerL).toFixed(4)),
    densityKgPerL,
  };
}

/* =========================================================
   UPLOAD IMAGE TO CLOUDINARY
========================================================= */

const uploadImageToCloudinary = (
  file: Express.Multer.File
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "cana/products",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(
            new Error(
              "Cloudinary did not return an image URL."
            )
          );
          return;
        }

        resolve(result.secure_url);
      }
    );

    uploadStream.end(file.buffer);
  });
};

/* =========================================================
   CREATE PRODUCT
========================================================= */

export const createProduct = async (
  data: CreateProductData,
  file?: Express.Multer.File
) => {
  const code = data.code.trim().toUpperCase();

  const existingProduct = await Product.findOne({
    code,
  });

  if (existingProduct) {
    throw new Error("Product code already exists");
  }

  let imageUrl = "";

  const packaging = getPackagingData(data);

  if (file) {
    imageUrl = await uploadImageToCloudinary(file);
  }

  const product = await Product.create({
    ...data,

    code,

    price: Number(data.price),
    stock: Number(data.stock ?? 0),
    baseUnit: "kg",
    packSizeKg: packaging.packSizeKg,
    densityKgPerL: packaging.densityKgPerL,

    image: imageUrl,
  });

  return product;
};

/* =========================================================
   GET ALL PRODUCTS
========================================================= */

export const getProducts = async () => {
  return await Product.find().sort({
    createdAt: -1,
  });
};

/* =========================================================
   GET PRODUCT BY ID
========================================================= */

export const getProductById = async (
  id: string
) => {
  return await Product.findById(id);
};

/* =========================================================
   UPDATE PRODUCT
========================================================= */

export const updateProduct = async (
  id: string,
  data: UpdateProductData,
  file?: Express.Multer.File
) => {
  const updateData: UpdateProductData = {
    ...data,
  };

  /* -----------------------------------------
     NORMALIZE CODE
  ----------------------------------------- */

  if (data.code) {
    const code = data.code.trim().toUpperCase();

    const existingProduct =
      await Product.findOne({
        code,
        _id: { $ne: id },
      });

    if (existingProduct) {
      throw new Error(
        "Product code already exists"
      );
    }

    updateData.code = code;
  }

  /* -----------------------------------------
     CONVERT NUMBERS
  ----------------------------------------- */

  if (data.price !== undefined) {
    updateData.price = Number(data.price);
  }

  if (data.stock !== undefined) {
    updateData.stock = Number(data.stock);
  }

  if (
    data.category !== undefined ||
    data.unit !== undefined ||
    data.packSizeKg !== undefined ||
    data.densityKgPerL !== undefined
  ) {
    const existing = await Product.findById(id).lean();
    if (!existing) {
      throw new Error("Product not found");
    }

    const packaging = getPackagingData({
      category: data.category ?? existing.category,
      unit: data.unit ?? existing.unit,
      densityKgPerL: data.densityKgPerL ?? existing.densityKgPerL,
    });

    updateData.packSizeKg = packaging.packSizeKg;
    updateData.densityKgPerL = packaging.densityKgPerL;
  }

  /* -----------------------------------------
     UPLOAD NEW IMAGE
  ----------------------------------------- */

  if (file) {
    const imageUrl =
      await uploadImageToCloudinary(file);

    updateData.image = imageUrl;
  }

  /* -----------------------------------------
     UPDATE DATABASE
  ----------------------------------------- */

  return await Product.findByIdAndUpdate(
    id,
    updateData,
    {
      returnDocument: "after",
      runValidators: true,
    }
  );
};

/* =========================================================
   DELETE PRODUCT
========================================================= */

export const deleteProduct = async (
  id: string
) => {
  return await Product.findByIdAndDelete(id);
};
