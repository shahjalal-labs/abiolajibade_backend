import { z } from "zod";

const reviewValidationSchema = z.object({
  comment: z.string(),
  bookingId: z.string(),
  rating: z.number().min(1).max(5),
});

export const reviewSchema = {
  reviewValidationSchema,
};
