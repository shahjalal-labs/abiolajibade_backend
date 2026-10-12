import { z } from "zod";
const genderEnum = z.enum(["MALE", "FEMALE", "OTHER"]);

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string(),
});

const userUpdateValidationSchema = z.object({
  userName: z.string().min(1, "User name is required").optional(),
  phone: z.string().min(8, "Phone number at least 8 digit long").optional(),
  gender: genderEnum.optional(),
});
const rechargeValidationSchema = z.object({
  paymentMethodId: z.string(),
  amount: z.number(),
});

const userLocationSchema = z.object({
  latitude: z
    .number()
    .min(-90, "Latitude must be >= -90")
    .max(90, "Latitude must be <= 90"),

  longitude: z
    .number()
    .min(-180, "Longitude must be >= -180")
    .max(180, "Longitude must be <= 180"),
});

const verificationSchema = z.object({
  dob: z.string(),
  address: z.string(),
  streetName: z.string(),
  phoneNumber: z.string(),
  houseNumber: z.string(),
  city: z.string(),
  state: z.string(),  
  zipCode: z.string(),
  ssn: z.string().regex(/^\d{9}$/, "SSN must be exactly 9 digits"),
});

export const authValidation = {
  userUpdateValidationSchema,
  loginSchema,
  userLocationSchema,
  rechargeValidationSchema,
  verificationSchema
};
