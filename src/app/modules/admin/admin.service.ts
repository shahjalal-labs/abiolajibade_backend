import { Request } from "express";
import config from "../../../config";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import prisma from "../../../shared/prisma";
import bcrypt from "bcryptjs";
import { uploadInSpace } from "../../../shared/UploadHelper";
import { transferMoneyToConnectedWorker } from "../../../helpers/stripe.helper";
import { Prisma, TApplyStatus } from "@prisma/client";
import {
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  getDay,
  getMonth,
} from "date-fns";

const loginAdminIntoDB = async (payload: any) => {
  const admin = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
      role: "ADMIN",
    },
  });

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    admin?.password,
  );

  if (!isPasswordValid) {
    throw new ApiError(403, "Invalid credentials");
  }

  const accessToken = jwtHelpers.generateToken(
    {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      userName: admin.userName,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  return {
    accessToken,
  };
};

const updateAdminProfileInDB = async (req: Request) => {
  const file = req.file;
  const payload = req.body;

  const admin = await prisma.user.findUniqueOrThrow({
    where: { id: req.user.id, role: "ADMIN" },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const profileImage = file ? await processImage(file, "profileImage") : null;

  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      userName: payload.userName || admin.userName,
      profileImage: profileImage || admin.profileImage,
    },
  });

  return;
};

const acceptWithdrawRequestInDB = async (withdrawId: string) => {
  const withdraw = await prisma.withdraw.findUniqueOrThrow({
    where: { id: withdrawId, status: "Pending" },
  });

  const workerProfile = await prisma.workerProfile.findUniqueOrThrow({
    where: { workerId: withdraw.workerId },
  });

  const transfer = await transferMoneyToConnectedWorker(
    workerProfile.stripeAccountId as string,
    withdraw.amount,
  );

  if (!transfer || transfer.reversed) {
    throw new ApiError(400, "Stripe transfer failed");
  }

  await prisma.withdraw.update({
    where: { id: withdrawId },
    data: { status: "Accepted" },
  });

  await prisma.workerProfile.update({
    where: { workerId: withdraw.workerId },
    data: { currentEarning: { decrement: withdraw.amount } },
  });

  return;
};

const rejectWithdrawRequestInDB = async (withdrawId: string) => {
  await prisma.withdraw.delete({
    where: { id: withdrawId, status: "Pending" },
  });

  return;
};

const getAllUsersFromDB = async (page: number = 1, search?: string) => {
  const whereCondition: Prisma.UserWhereInput = {
    role: "USER",
    ...(search && {
      OR: [
        { userName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalUsers = await prisma.user.count({
    where: { role: "USER" },
  });

  const filteredUsersCount = await prisma.user.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredUsersCount / 10);

  const users = await prisma.user.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      profileImage: true,
      userName: true,
      email: true,
      createdAt: true,
      status: true,
      _count: {
        select: {
          userBookings: true,
        },
      },
    },
  });

  return {
    meta: {
      totalUsers,
      filteredUsers: filteredUsersCount,
      totalPages,
      currentPage: page,
    },
    users,
  };
};
const getAllWorkersFromDB = async (page: number = 1, search?: string) => {
  const whereCondition: Prisma.UserWhereInput = {
    role: "WORKER",
    ...(search && {
      OR: [
        { userName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalWorkers = await prisma.user.count({
    where: { role: "WORKER" },
  });

  const filteredWorkersCount = await prisma.user.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredWorkersCount / 10);

  const workers = await prisma.user.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      profileImage: true,
      userName: true,
      email: true,
      workerProfile: {
        select: {
          skills: true,
          hourlyRate: true,
        },
      },
      _count: {
        select: {
          workerBookings: true,
        },
      },
      status: true,
      createdAt: true,
    },
  });

  return {
    meta: {
      totalWorkers,
      filteredWorkers: filteredWorkersCount,
      totalPages,
      currentPage: page,
    },
    workers,
  };
};
const getAllPendingWorkersFromDB = async (
  page: number = 1,
  search?: string,
) => {
  const whereCondition: Prisma.UserWhereInput = {
    role: "WORKER",
    status: "Pending",
    ...(search && {
      OR: [
        { userName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalWorkers = await prisma.user.count({
    where: { role: "WORKER" },
  });

  const filteredWorkersCount = await prisma.user.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredWorkersCount / 10);

  const workers = await prisma.user.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      profileImage: true,
      userName: true,
      email: true,
      workerProfile: {
        select: {
          skills: true,
          hourlyRate: true,
        },
      },
      status: true,
      createdAt: true,
    },
  });

  return {
    meta: {
      totalWorkers,
      filteredWorkers: filteredWorkersCount,
      totalPages,
      currentPage: page,
    },
    workers,
  };
};

const getWorkerDetailsFromDB = async (workerId: string) => {
  const worker = await prisma.user.findUniqueOrThrow({
    where: { id: workerId, role: "WORKER" },
    select: {
      id: true,
      userName: true,
      email: true,
      profileImage: true,
      avgRating: true,
      totalReview: true,
      workerProfile: {
        select: {
          skills: true,
          hourlyRate: true,
          bio: true,
          experience: true,
          certificateUrl: true,
          cprUrl: true,
          immunizationUrl: true,
          licenceUrl: true,
          age: true,
          allTimeEarning: true,
          currentEarning: true,
          disability: true,
          ethnicity: true,
          language: true,
          licenceNumber: true,
          gender: true,
        },
      },
    },
  });

  return worker;
};

const getAllJobsFromDB = async (page: number = 1, search?: string) => {
  const whereCondition: Prisma.JobWhereInput = {
    ...(search && {
      OR: [
        { title: { contains: search, mode: "insensitive" } },
        { address: { contains: search, mode: "insensitive" } },
        { skill: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalJobs = await prisma.job.count();

  const filteredJobsCount = await prisma.job.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredJobsCount / 10);

  const jobs = await prisma.job.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      address: true,
      skill: true,
      price: true,
      street: true,
      postal: true,
      fileUrl: true,
      user: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
      applications: {
        select: {
          note: true,
          worker: {
            select: {
              id: true,
              userName: true,
              email: true,
              profileImage: true,
            },
          },
        },
      },
      createdAt: true,
    },
  });

  return {
    meta: {
      totalJobs,
      filteredJobs: filteredJobsCount,
      totalPages,
      currentPage: page,
    },
    jobs,
  };
};
const getAllUserReportsFromDB = async (page: number = 1) => {
  const totalReports = await prisma.userReport.count();
  const filteredReportsCount = await prisma.userReport.count({});
  const totalPages = Math.ceil(filteredReportsCount / 10);

  const reports = await prisma.userReport.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      comment: true,
      adminReply: true,
      bookingId: true,
      createdAt: true,
    },
  });

  return {
    meta: {
      totalReports,
      filteredReports: filteredReportsCount,
      totalPages,
      currentPage: page,
    },
    reports,
  };
};
const getAllWorkerReportsFromDB = async (page: number = 1) => {
  const totalReports = await prisma.workerReport.count();
  const filteredReportsCount = await prisma.workerReport.count({});
  const totalPages = Math.ceil(filteredReportsCount / 10);

  const reports = await prisma.workerReport.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      comment: true,
      adminReply: true,
      bookingId: true,
      createdAt: true,
    },
  });

  return {
    meta: {
      totalReports,
      filteredReports: filteredReportsCount,
      totalPages,
      currentPage: page,
    },
    reports,
  };
};

const responseToUserReportInDB = async (payload: any) => {
  const report = await prisma.userReport.findUniqueOrThrow({
    where: { id: payload.reportId, status: "Pending" },
    include: {
      booking: {
        select: {
          userId: true,
          workerId: true,
          price: true,
          overTimeCharge: true,
        },
      },
    },
  });

  const totalAmount =
    report.booking.price + (report.booking.overTimeCharge || 0);

  if (payload.status === "Got_Refund" || payload.status === "Partial_Refund") {
    const refundPercentage =
      payload.status === "Partial_Refund" ? Number(payload.percentage) : 100;

    if (payload.status === "Partial_Refund") {
      if (
        payload.percentage === undefined ||
        payload.percentage === null ||
        Number.isNaN(refundPercentage) ||
        refundPercentage <= 0 ||
        refundPercentage >= 100
      ) {
        throw new ApiError(400, "percentage is required for Partial Refund");
      }
    }

    const refundAmount = (totalAmount * refundPercentage) / 100;

    await prisma.booking.update({
      where: { id: report.bookingId },
      data: { status: "Refunded" },
    });

    await prisma.workerProfile.update({
      where: { workerId: report.booking.workerId },
      data: {
        currentEarning: {
          decrement: refundAmount * 0.9,
        },
      },
    });

    await prisma.userProfile.update({
      where: { userId: report.booking.userId },
      data: {
        walletBalance: {
          increment: refundAmount,
        },
        netSpent: {
          decrement: refundAmount,
        },
      },
    });
  }

  await prisma.userReport.update({
    where: { id: payload.reportId },
    data: {
      status: payload.status,
      adminReply: payload.adminReply,
    },
  });

  return;
};

const responseToWorkerReportInDB = async (payload: any) => {
  await prisma.workerReport.findUniqueOrThrow({
    where: { id: payload.reportId, status: "Pending" },
  });

  await prisma.workerReport.update({
    where: { id: payload.reportId },
    data: { status: payload.status, adminReply: payload.adminReply },
  });

  return;
};

const getAllBookingsFromDB = async (page: number = 1) => {
  const totalBookings = await prisma.booking.count();
  const filteredBookingsCount = await prisma.booking.count({});
  const totalPages = Math.ceil(filteredBookingsCount / 10);

  const bookings = await prisma.booking.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      price: true,
      overTimeCharge: true,
      address: true,
      date: true,
      purpose: true,
      deliveryProofs: {
        select: {
          fileUrl: true,
          message: true,
        },
      },
      worker: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
      user: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
      createdAt: true,
    },
  });

  return {
    meta: {
      totalBookings,
      filteredBookings: filteredBookingsCount,
      totalPages,
      currentPage: page,
    },
    bookings,
  };
};

const getAllWithdrawRequestsFromDB = async (
  page: number = 1,
  status?: TApplyStatus,
) => {
  const whereCondition: Prisma.WithdrawWhereInput = {
    ...(status && { status }),
  };

  const totalWithdraws = await prisma.withdraw.count({});

  const filteredWithdrawsCount = await prisma.withdraw.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredWithdrawsCount / 10);

  const withdraws = await prisma.withdraw.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      amount: true,
      status: true,
      createdAt: true,
      worker: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
    },
  });

  return {
    meta: {
      totalWithdraws,
      filteredWithdraws: filteredWithdrawsCount,
      totalPages,
      currentPage: page,
    },
    withdraws,
  };
};

const blockUnblockUserInDB = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: user.status === "Active" ? "Blocked" : "Active",
    },
  });

  return {
    message: `User has been ${user.status === "Active" ? "Blocked" : "Unblocked"} successfully`,
  };
};

const acceptOrRejectWorkerApplicationInDB = async (payload: any) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: payload.workerId, status: "Pending", role: "WORKER" },
  });

  if (payload.accept === true) {
    await prisma.user.update({
      where: { id: payload.workerId },
      data: { status: "Active" },
    });

    return {
      message: "Worker application accepted successfully",
    };
  }

  await prisma.user.delete({
    where: { id: payload.workerId },
  });

  return {
    message: "Worker application rejected successfully",
  };
};

const getAllUserReviewsFromDB = async (page: number = 1) => {
  const totalReviews = await prisma.review.count();
  const filteredReviewsCount = await prisma.review.count({});
  const totalPages = Math.ceil(filteredReviewsCount / 10);

  const reviews = await prisma.review.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      reviewer: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
      worker: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
      createdAt: true,
    },
  });

  return {
    meta: {
      totalReviews,
      filteredReviews: filteredReviewsCount,
      totalPages,
      currentPage: page,
    },
    reviews,
  };
};
const getAllWorkerReviewsFromDB = async (page: number = 1) => {
  const totalReviews = await prisma.userReview.count();
  const filteredReviewsCount = await prisma.userReview.count({});
  const totalPages = Math.ceil(filteredReviewsCount / 10);

  const reviews = await prisma.userReview.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      reviewer: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
      worker: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
      createdAt: true,
    },
  });

  return {
    meta: {
      totalReviews,
      filteredReviews: filteredReviewsCount,
      totalPages,
      currentPage: page,
    },
    reviews,
  };
};

const getUserDetailsFromDB = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
    select: {
      id: true,
      userName: true,
      email: true,
      profileImage: true,
      avgRating: true,
      totalReview: true,
      userProfile: {
        select: {
          walletBalance: true,
          netSpent: true,
          age: true,
          ethnicity: true,
          gender: true,

          bio: true,
        },
      },
    },
  });

  return user;
};

const getDashboardOverviewFromDB = async () => {
  const totalUsers = await prisma.user.count({
    where: { role: "USER" },
  });
  const totalWorkers = await prisma.user.count({
    where: { role: "WORKER" },
  });

  const totalBookings = await prisma.booking.count();
  const totalEarnings = await prisma.booking.aggregate({
    where: { status: "Completed" },
    _sum: {
      price: true,
      overTimeCharge: true,
    },
  });

  // Calculate the total earnings including the overtime charge
  const totalAmount =
    (totalEarnings._sum.price || 0) + (totalEarnings._sum.overTimeCharge || 0);

  const adminEarnings = totalAmount * 0.1;

  return {
    totalUsers,
    totalWorkers,
    totalBookings,
    adminEarnings,
  };
};

const getTopWorkersFromDB = async () => {
  const topWorkers = await prisma.user.findMany({
    where: { role: "WORKER" },
    select: {
      id: true,
      userName: true,
      profileImage: true,
      avgRating: true,
      totalReview: true,
      _count: {
        select: {
          workerBookings: true,
        },
      },
    },
    orderBy: {
      avgRating: "desc",
    },

    take: 3,
  });

  return topWorkers;
};

const getAdminEarningSummaryFromDB = async (type: "weekly" | "monthly") => {
  const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  let chartData: any[] = [];

  if (type === "weekly") {
    const start = startOfWeek(new Date(), { weekStartsOn: 6 }); // Sat
    const end = endOfWeek(new Date(), { weekStartsOn: 6 }); // Fri

    const weekEarnings = await prisma.booking.findMany({
      where: {
        status: "Completed",
        createdAt: { gte: start, lte: end },
      },
      select: { price: true, overTimeCharge: true, createdAt: true },
    });

    const weeklyData = Array(7).fill(0);

    for (const e of weekEarnings) {
      const localDate = new Date(e.createdAt);
      const dayIndex = getDay(localDate);
      const mappedIndex = (dayIndex - 6 + 7) % 7;
      const adminEarning = (e.price + (e.overTimeCharge || 0)) * 0.1;
      weeklyData[mappedIndex] += adminEarning;
    }

    chartData = days.map((day, idx) => ({
      day,
      earnings: weeklyData[idx],
    }));
  }

  if (type === "monthly") {
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());

    const monthEarnings = await prisma.booking.findMany({
      where: {
        status: "Completed",
        createdAt: { gte: start, lte: end },
      },
      select: { price: true, overTimeCharge: true, createdAt: true },
    });

    const monthlyData = Array(12).fill(0);

    for (const e of monthEarnings) {
      const localDate = new Date(e.createdAt);
      const monthIndex = getMonth(localDate);
      const adminEarning = (e.price + (e.overTimeCharge || 0)) * 0.1;
      monthlyData[monthIndex] += adminEarning;
    }

    chartData = months.map((month, idx) => ({
      month,
      earnings: monthlyData[idx],
    }));
  }

  return {
    chartData,
  };
};

export const adminService = {
  loginAdminIntoDB,
  blockUnblockUserInDB,
  getUserDetailsFromDB,
  updateAdminProfileInDB,
  acceptWithdrawRequestInDB,
  rejectWithdrawRequestInDB,
  getAllWithdrawRequestsFromDB,
  getAdminEarningSummaryFromDB,
  getAllUsersFromDB,
  getAllWorkersFromDB,
  getWorkerDetailsFromDB,
  getAllPendingWorkersFromDB,
  acceptOrRejectWorkerApplicationInDB,
  getAllJobsFromDB,
  getAllUserReportsFromDB,
  getAllWorkerReportsFromDB,
  getTopWorkersFromDB,
  responseToUserReportInDB,
  responseToWorkerReportInDB,
  getAllBookingsFromDB,
  getAllUserReviewsFromDB,
  getAllWorkerReviewsFromDB,
  getDashboardOverviewFromDB,
};
