import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { reportService } from "./report.service";
import sendResponse from "../../../shared/sendResponse";

const createUserReport = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const payload = req.body;
  await reportService.createUserReportInDB(userId, payload);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Report created successfully",
  });
});
const createWorkerReport = catchAsync(async (req: Request, res: Response) => {
  const workerId = req.user.id;
  const payload = req.body;
  await reportService.createWorkerReportInDB(workerId, payload);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Report created successfully",
  });
});

export const reportController = {
  createUserReport,
  createWorkerReport,
};
