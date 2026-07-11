import * as yup from "yup";

export const addressSchema = yup.object({
  title: yup
    .string()
    .required("Title is required (e.g. Home, Office)")
    .max(50, "Title must not exceed 50 characters"),
  street: yup
    .string()
    .required("Street address is required")
    .max(255, "Street must not exceed 255 characters"),
  city: yup
    .string()
    .required("City is required")
    .max(100, "City must not exceed 100 characters"),
  state: yup
    .string()
    .required("State is required")
    .max(100, "State must not exceed 100 characters"),
  postalCode: yup
    .string()
    .required("Postal code is required")
    .max(20, "Postal code must not exceed 20 characters"),
  country: yup
    .string()
    .required("Country is required")
    .max(100, "Country must not exceed 100 characters"),
  phone: yup
    .string()
    .required("Phone number is required")
    .max(20, "Phone number must not exceed 20 characters"),
});
