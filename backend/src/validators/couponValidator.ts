import * as yup from "yup";

export const validateCouponSchema = yup.object({
  code: yup
    .string()
    .required("Coupon code is required")
    .max(50, "Coupon code must not exceed 50 characters"),
  orderAmount: yup
    .number()
    .required("Order amount is required")
    .typeError("Order amount must be a number")
    .min(0, "Order amount cannot be negative"),
});

export const couponSchema = yup.object({
  code: yup
    .string()
    .required("Coupon code is required")
    .max(50, "Coupon code must not exceed 50 characters"),
  discountType: yup
    .string()
    .required("Discount type is required")
    .oneOf(["Percentage", "Fixed"], "Discount type must be either 'Percentage' or 'Fixed'"),
  discountValue: yup
    .number()
    .required("Discount value is required")
    .typeError("Discount value must be a number")
    .positive("Discount value must be greater than zero"),
  minOrderAmount: yup
    .number()
    .required("Minimum order amount is required")
    .typeError("Minimum order amount must be a number")
    .min(0, "Minimum order amount cannot be negative")
    .default(0),
  expiryDate: yup
    .date()
    .required("Expiry date is required")
    .typeError("Expiry date must be a valid date"),
  isActive: yup
    .boolean()
    .default(true),
});
