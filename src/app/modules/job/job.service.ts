import { Request } from "express";
import { uploadInSpace } from "../../../shared/UploadHelper";
import ApiError from "../../../errors/ApiErrors";
import prisma from "../../../shared/prisma";
import { calculateDistance } from "../../../helpers/distanceCalculator";

const createNewJobIntoDB = async (req: Request) => {
  const userId = req.user.id;
  const payload = req.body;
  const file = req.file;

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const fileUrl = file ? await processImage(file, "profileImage") : null;
  // if (!fileUrl) {
  //   throw new ApiError(404, "Attachment is required");
  // }

  const price = parseFloat(payload.price);
  const latitude = parseFloat(payload.latitude);
  const longitude = parseFloat(payload.longitude);

  await prisma.job.create({
    data: {
      ...payload,
      price,
      userId,
      latitude,
      longitude,
      fileUrl,
    },
  });

  return;
};

const getUserWiseJobsFromDB = async (userId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  const jobs = await prisma.job.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      description: true,
      address: true,
      date: true,
      skill: true,
      price: true,
      status: true,
      startTime: true,
      endTime: true,
      state: true,
      applications: {
        select: {
          id: true,
          worker: {
            select: {
              profileImage: true,
              userName: true,
            },
          },
        },
      },
    },
  });

  return jobs;
};
const getAllJobsFromDB = async (
  workerId: string,
  skill?: string,
  maxDistance?: number,
) => {
  const worker = await prisma.user.findUniqueOrThrow({
    where: { id: workerId, role: "WORKER" },
    include: {
      userLocation: {
        select: {
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  const workerLocation = worker.userLocation[0];

  if (!workerLocation) {
    throw new ApiError(
      404,
      "Worker location not found. Please update your location.",
    );
  }

  const jobWhere: Record<string, unknown> = {};

  jobWhere.status = "Active";

  if (skill) {
    jobWhere.skill = {
      contains: skill,
      mode: "insensitive",
    };
  }

  const jobs = await prisma.job.findMany({
    where: jobWhere,
    select: {
      id: true,
      title: true,
      description: true,
      address: true,
      date: true,
      skill: true,
      price: true,
      latitude: true,
      longitude: true,
      startTime: true,
      state: true,
      endTime: true,
      user: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
        },
      },
    },
  });

  const jobsWithDistance = jobs
    .map((job) => {
      const distance = calculateDistance(
        workerLocation.latitude,
        workerLocation.longitude,
        job.latitude,
        job.longitude,
      );

      if (
        typeof maxDistance === "number" &&
        Number.isFinite(maxDistance) &&
        distance > maxDistance
      ) {
        return null;
      }

      return {
        ...job,
        distance,
      };
    })
    .filter((job) => job !== null)
    .sort((a, b) => a.distance - b.distance);

  return jobsWithDistance;
};

const getJobDetailsFromDB = async (jobId: string) => {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    select: {
      id: true,
      title: true,
      description: true,
      address: true,
      date: true,
      postal: true,
      street: true,
      fileUrl: true,
      skill: true,
      price: true,
      latitude: true,
      longitude: true,
      startTime: true,
      endTime: true,
      state: true,
      status: true,
      user: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
        },
      },
    },
  });

  return job;
};

const deleteJobFromDB = async (jobId: string) => {
  await prisma.job.delete({
    where: { id: jobId },
  });

  return;
};

const applyToJobIntoDB = async (workerId: string, jobId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: workerId, role: "WORKER" },
  });

  if (!user) {
    throw new ApiError(404, "Worker not found");
  }

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
  });

  const bypassSkills = [
    "Social Media Manager",
    "Content Creator",
    "Photo Editor",
  ];

  const shouldBypassStatusCheck = bypassSkills.includes(job.skill);

  if (!shouldBypassStatusCheck) {
    if (user.status === "Verification_Submitted") {
      throw new ApiError(403, "Your account is still under verification.");
    }

    if (user.status !== "Active") {
      throw new ApiError(
        403,
        "Your account is not active. Please contact support.",
      );
    }
  }

  const existingApplication = await prisma.application.findFirst({
    where: { workerId, jobId },
  });

  if (existingApplication) {
    throw new ApiError(409, "You have already applied for this job.");
  }

  await prisma.application.create({
    data: {
      workerId,
      jobId,
      note: "sdfsdfsdf",
    },
  });

  return;
};

const acceptJobApplicationIntoDB = async (userId: string, payload: any) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    include: {
      userProfile: {
        select: {
          walletBalance: true,
        },
      },
    },
  });

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: payload.jobId },
  });

  if (!user.userProfile) {
    throw new ApiError(400, "User profile not found");
  }

  if (user?.userProfile?.walletBalance < job.price) {
    throw new ApiError(400, "Insufficient wallet balance to accept this job");
  }

  const application = await prisma.application.findUniqueOrThrow({
    where: { id: payload.applicationId },
  });

  if (application.jobId !== job.id) {
    throw new ApiError(400, "Application does not belong to this job");
  }

  // 4. Atomic DB transaction
  await prisma.$transaction(async (tx) => {
    await tx.booking.create({
      data: {
        date: job.date,
        purpose: job.skill,
        price: job.price,
        address: job.address,
        workerId: application.workerId,
        startTime: job.startTime,
        endTime: job.endTime,
        status: "Active",
        userId,
      },
    });

    await tx.application.deleteMany({
      where: { jobId: job.id },
    });

    await tx.job.update({
      where: { id: job.id },
      data: { status: "Inactive" },
    });

    await tx.userProfile.update({
      where: { userId: user.id },
      data: {
        walletBalance: { decrement: job.price },
        netSpent: { increment: job.price },
      },
    });

    return;
  });

  return;
};

const editJobIntoDB = async (req: Request) => {
  const payload = req.body;
  const file = req.file;

  const job = await prisma.job.findUniqueOrThrow({
    where: { id: payload.jobId },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const fileUrl = file ? await processImage(file, "profileImage") : null;

  const price = parseFloat(payload.price);
  const latitude = parseFloat(payload.latitude);
  const longitude = parseFloat(payload.longitude);

  await prisma.job.update({
    where: { id: payload.jobId },
    data: {
      address: payload.address || job.address,
      description: payload.description || job.description,
      price: price || job.price,
      latitude: latitude || job.latitude,
      longitude: longitude || job.longitude,
      startTime: payload.startTime || job.startTime,
      endTime: payload.endTime || job.endTime,
      date: payload.date || job.date,
      skill: payload.skill || job.skill,
      fileUrl: fileUrl || job.fileUrl,
      postal: payload.postal || job.postal,
      street: payload.street || job.street,
      title: payload.title || job.title,
      state: payload.state || job.state,
    },
  });

  return;
};

const repostJobIntoDB = async (jobId: string) => {
  const job = await prisma.job.findUnique({
    where: { id: jobId, status: "Inactive" },
  });

  if (!job) {
    throw new ApiError(404, "Job not found or cannot be reposted");
  }

  await prisma.job.update({
    where: { id: jobId },
    data: { status: "Active" },
  });

  return;
};

export const jobServices = {
  createNewJobIntoDB,
  deleteJobFromDB,
  getUserWiseJobsFromDB,
  getAllJobsFromDB,
  applyToJobIntoDB,
  getJobDetailsFromDB,
  acceptJobApplicationIntoDB,
  editJobIntoDB,
  repostJobIntoDB,
};
