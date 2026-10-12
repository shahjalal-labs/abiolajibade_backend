import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { reviewServices } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const payload = req.body;
  await reviewServices.createNewReviewInDB(userId, payload);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Review created successfully",
  });
});

const createWorkerReview = catchAsync(async (req: Request, res: Response) => {
  const workerId = req.user.id;
  const payload = req.body;
  await reviewServices.createWorkerReviewInDB(workerId, payload);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Review submitted successfully",
  });
});

export const reviewController = {
  createReview,
  createWorkerReview,
  
};
