import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { withdrawService } from "./withdraw.service";
import sendResponse from "../../../shared/sendResponse";

const createWithdrawRequest = catchAsync(
  async (req: Request, res: Response) => {
    const workerId = req.user.id;
    const amount = req.body.amount;
    const result = await withdrawService.createWithdrawRequestInDB(
      amount,
      workerId,
    );

    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: result.message,
      data: result.link,
    });
  },
);
const withdrawRequests = catchAsync(async (req: Request, res: Response) => {
  const workerId = req.user.id;
  const result = await withdrawService.workerWithdrawRequestsFromDB(workerId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Withdraw requests retrieved successfully",
    data: result,
  });
});

export const withdrawController = {
  createWithdrawRequest,
  withdrawRequests,
};
