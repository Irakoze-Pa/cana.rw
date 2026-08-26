import Product from "./product.model";
import cloudinary from "../../config/cloudinary";

export interface CreateProductData {
  name: string;
  code: string;
  category: string;
  price: number;
  stock?: number;
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
  unit?: string;
  description?: string;
  image?: string;
  status?: "Active" | "Inactive";
  trackBatch?: boolean;
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

  if (file) {
    imageUrl = await uploadImageToCloudinary(file);
  }

  const product = await Product.create({
    ...data,

    code,

    price: Number(data.price),
    stock: Number(data.stock ?? 0),

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