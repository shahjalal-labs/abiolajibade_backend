import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { workerServices } from "./worker.service";

const getAllWorkers = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const maxDistance = req.query.maxDistance
    ? parseFloat(req.query.maxDistance as string)
    : undefined;
  const rating = req.query.rating
    ? parseFloat(req.query.rating as string)
    : undefined;
  const gender = req.query.gender as string | undefined;
  const skill = req.query.skill as string | undefined;

  const result = await workerServices.getAllWorkersFromDB(
    userId,
    rating,
    maxDistance,
    skill,
    gender,
  );
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Workers retrieved successfully",
    data: result,
  });
});
const getWorkerDetails = catchAsync(async (req, res) => {
  const workerId = req.params.id;
  const result = await workerServices.getWorkerDetailsFromDB(workerId);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Worker details retrieved successfully",
    data: result,
  });
});

const getEarningsSummary = catchAsync(async (req: Request, res: Response) => {
  const workerId = req.user.id;
  const type = req.query.type as "weekly" | "monthly";

  const result = await workerServices.getWorkerEarningSummaryFromDB(
    workerId,
    type,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Earnings summary retrieved successfully",
    data: result,
  });
});

export const workerController = {
  getAllWorkers,
  getWorkerDetails,
  getEarningsSummary,
};
