import * as yup from "yup";

export const placeOrderSchema = yup.object({
  addressId: yup
    .number()
    .required("Shipping address selection is required")
    .typeError("Address ID must be a number")
    .integer()
    .positive(),
  couponCode: yup
    .string()
    .nullable()
    .max(50, "Coupon code must not exceed 50 characters"),
  paymentMethod: yup
    .string()
    .default("Simulated Card")
    .max(50),
});

export const updateOrderStatusSchema = yup.object({
  orderStatus: yup
    .string()
    .required("Order status is required")
    .oneOf(
      ["Pending", "Paid", "Processing", "Shipped", "Delivered", "Cancelled"],
      "Invalid order status value"
    ),
  paymentStatus: yup
    .string()
    .required("Payment status is required")
    .oneOf(["Pending", "Success", "Failed"], "Invalid payment status value"),
});
