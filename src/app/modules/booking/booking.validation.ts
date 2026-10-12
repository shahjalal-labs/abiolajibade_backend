import { z } from "zod";

const markCompletedValidationSchema = z.object({
  bookingId: z.string(),
  message: z.string(),
});
const acceptRejectSchema = z.object({
  bookingId: z.string(),
  approveOvertime: z.boolean(),
});

export const bookingSchema = {
  markCompletedValidationSchema,
  acceptRejectSchema,
};
