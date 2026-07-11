import * as yup from "yup";

export const categorySchema = yup.object({
  name: yup
    .string()
    .required("Category name is required")
    .min(2, "Category name must be at least 2 characters")
    .max(100, "Category name must not exceed 100 characters"),
  description: yup
    .string()
    .nullable()
    .max(500, "Description must not exceed 500 characters"),
});

export const productSchema = yup.object({
  name: yup
    .string()
    .required("Product name is required")
    .min(2, "Product name must be at least 2 characters")
    .max(255, "Product name must not exceed 255 characters"),
  description: yup
    .string()
    .required("Product description is required"),
  price: yup
    .number()
    .required("Price is required")
    .typeError("Price must be a valid number")
    .positive("Price must be a positive number"),
  sku: yup
    .string()
    .required("SKU is required")
    .max(100, "SKU must not exceed 100 characters"),
  stockQuantity: yup
    .number()
    .required("Stock quantity is required")
    .typeError("Stock quantity must be a valid number")
    .integer("Stock quantity must be an integer")
    .min(0, "Stock quantity cannot be negative"),
  categoryId: yup
    .number()
    .required("Category ID is required")
    .typeError("Category ID must be a valid number")
    .integer()
    .positive(),
  status: yup
    .string()
    .oneOf(["Active", "Inactive"], "Invalid product status")
    .default("Active"),
});

export const productQuerySchema = yup.object({
  page: yup
    .number()
    .typeError("Page must be a number")
    .integer()
    .min(1)
    .default(1),
  limit: yup
    .number()
    .typeError("Limit must be a number")
    .integer()
    .min(1)
    .max(100)
    .default(10),
  category: yup
    .number()
    .typeError("Category filter must be a number")
    .integer()
    .nullable(),
  search: yup
    .string()
    .nullable(),
});
