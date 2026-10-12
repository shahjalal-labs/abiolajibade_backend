import express from "express";

import { reviewController } from "./review.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { reviewSchema } from "./review.validation";

const router = express.Router();

router.post(
  "/create",
  auth(UserRole.USER),
  validateRequest(reviewSchema.reviewValidationSchema),
  reviewController.createReview,
);
router.post(
  "/create-by-worker",
  auth(UserRole.WORKER),
  validateRequest(reviewSchema.reviewValidationSchema),
  reviewController.createWorkerReview,
);

export const reviewRoute = router;
