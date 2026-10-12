import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { adminService } from "./admin.service";
import sendResponse from "../../../shared/sendResponse";
import { TApplyStatus } from "@prisma/client";

const loginAdmin = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const result = await adminService.loginAdminIntoDB(payload);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin logged in successfully",
    data: result,
  });
});
const updateAdminProfile = catchAsync(async (req: Request, res: Response) => {
  await adminService.updateAdminProfileInDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin profile updated successfully",
  });
});
const acceptWithdrawRequest = catchAsync(
  async (req: Request, res: Response) => {
    await adminService.acceptWithdrawRequestInDB(req.params.id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Admin withdraw request accepted successfully",
    });
  },
);
const rejectWithdrawRequest = catchAsync(
  async (req: Request, res: Response) => {
    await adminService.rejectWithdrawRequestInDB(req.params.id);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Admin withdraw request rejected successfully",
    });
  },
);

const allUsers = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const search = req.query.search as string;
  const result = await adminService.getAllUsersFromDB(page, search);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Users retrieved Successfully",
    data: result,
  });
});
const allWorkers = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const search = req.query.search as string;
  const result = await adminService.getAllWorkersFromDB(page, search);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Workers retrieved Successfully",
    data: result,
  });
});
const allPendingWorkers = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const search = req.query.search as string;
  const result = await adminService.getAllPendingWorkersFromDB(page, search);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Pending Workers retrieved Successfully",
    data: result,
  });
});

const allJobs = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const search = req.query.search as string;
  const result = await adminService.getAllJobsFromDB(page, search);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Jobs retrieved Successfully",
    data: result,
  });
});
const allWithdrawRequests = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const status = req.query.status as TApplyStatus;
  const result = await adminService.getAllWithdrawRequestsFromDB(page, status);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Withdraw requests retrieved Successfully",
    data: result,
  });
});
const userReports = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminService.getAllUserReportsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User Reports retrieved Successfully",
    data: result,
  });
});
const workerReports = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminService.getAllWorkerReportsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Worker Reports retrieved Successfully",
    data: result,
  });
});
const blockUnblock = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.blockUnblockUserInDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: result.message,
  });
});
const allBookings = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminService.getAllBookingsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Bookings retrieved Successfully",
    data: result,
  });
});
const userReviews = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminService.getAllUserReviewsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User Reviews retrieved Successfully",
    data: result,
  });
});
const workerReviews = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminService.getAllWorkerReviewsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Worker Reviews retrieved Successfully",
    data: result,
  });
});
const responseUserReport = catchAsync(async (req: Request, res: Response) => {
  await adminService.responseToUserReportInDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User Report response submitted Successfully",
  });
});
const responseWorkerReport = catchAsync(async (req: Request, res: Response) => {
  await adminService.responseToWorkerReportInDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Worker Report response submitted Successfully",
  });
});
const acceptRejectApplication = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminService.acceptOrRejectWorkerApplicationInDB(
      req.body,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: result.message,
    });
  },
);
const workerDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getWorkerDetailsFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Worker details retrieved Successfully",
    data: result,
  });
});
const userDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getUserDetailsFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User details retrieved Successfully",
    data: result,
  });
});
const getoverview = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getDashboardOverviewFromDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Dashboard overview retrieved Successfully",
    data: result,
  });
});
const topWorkers = catchAsync(async (req: Request, res: Response) => {
  const result = await adminService.getTopWorkersFromDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Top Workers retrieved Successfully",
    data: result,
  });
});
const earningsSummary = catchAsync(async (req: Request, res: Response) => {
  const type = req.query.type as "weekly" | "monthly";
  const result = await adminService.getAdminEarningSummaryFromDB(type);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Earnings Summary retrieved Successfully",
    data: result,
  });
});

export const adminController = {
  loginAdmin,
  topWorkers,
  earningsSummary,
  updateAdminProfile,
  acceptWithdrawRequest,
  rejectWithdrawRequest,
  workerDetails,
  userDetails,
  getoverview,
  allUsers,
  allWorkers,
  allPendingWorkers,
  allJobs,
  allWithdrawRequests,
  userReports,
  workerReports,
  blockUnblock,
  responseUserReport,
  responseWorkerReport,
  acceptRejectApplication,
  allBookings,
  userReviews,
  workerReviews,
};
