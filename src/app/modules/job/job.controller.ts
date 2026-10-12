import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { jobServices } from "./job.service";

const createJob = catchAsync(async (req: Request, res: Response) => {
  await jobServices.createNewJobIntoDB(req);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Job created successfully",
  });
});
const editJob = catchAsync(async (req: Request, res: Response) => {
  await jobServices.editJobIntoDB(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Job updated successfully",
  });
});

const getUserWiseJobs = catchAsync(async (req: Request, res: Response) => {
  const jobs = await jobServices.getUserWiseJobsFromDB(req.user.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Jobs retrieved successfully",
    data: jobs,
  });
});
const getAllJobs = catchAsync(async (req: Request, res: Response) => {
  const workerId = req.user.id;
  const skill = req.query.skill as string;
  const maxDistance = parseFloat(req.query.maxDistance as string) || 500;
  const jobs = await jobServices.getAllJobsFromDB(workerId, skill, maxDistance);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Jobs retrieved successfully",
    data: jobs,
  });
});
const getJobDetails = catchAsync(async (req: Request, res: Response) => {
  const job = await jobServices.getJobDetailsFromDB(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Jobs retrieved successfully",
    data: job,
  });
});

const deleteJob = catchAsync(async (req: Request, res: Response) => {
  await jobServices.deleteJobFromDB(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Job deleted successfully",
  });
});

const applyJob = catchAsync(async (req: Request, res: Response) => {
  await jobServices.applyToJobIntoDB(req.user.id, req.params.id);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Application submitted successfully",
  });
});

const acceptApplication = catchAsync(async (req: Request, res: Response) => {
  await jobServices.acceptJobApplicationIntoDB(req.user.id, req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Application accepted successfully",
  });
});
const repostJobInDB = catchAsync(async (req: Request, res: Response) => {
  await jobServices.repostJobIntoDB(req.params.id);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Job reposted successfully",
  });
});

export const jobController = {
  createJob,
  deleteJob,
  applyJob,
  getUserWiseJobs,
  getAllJobs,
  getJobDetails,
  acceptApplication,
  editJob,
  repostJobInDB,
};
