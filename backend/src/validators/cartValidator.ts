import * as yup from "yup";

export const addCartItemSchema = yup.object({
  productId: yup
    .number()
    .required("Product ID is required")
    .typeError("Product ID must be a number")
    .integer()
    .positive(),
  quantity: yup
    .number()
    .typeError("Quantity must be a number")
    .integer()
    .positive("Quantity must be a positive integer")
    .default(1),
});

export const updateCartItemSchema = yup.object({
  quantity: yup
    .number()
    .required("Quantity is required")
    .typeError("Quantity must be a number")
    .integer()
    .positive("Quantity must be a positive integer"),
});
