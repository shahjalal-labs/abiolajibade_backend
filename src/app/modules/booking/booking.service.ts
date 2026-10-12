import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { sendSingleNotification } from "../notifications/notification.services";
import { Request } from "express";
import { uploadInSpace } from "../../../shared/UploadHelper";

const createNewBookingInDB = async (
  userId: string,
  payload: any
) => {
  const [user, worker] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: userId, role: "USER" },
      include: { userProfile: true },
    }),
    prisma.user.findUniqueOrThrow({
      where: { id: payload.workerId, role: "WORKER" },
      include: { workerProfile: true },
    }),
  ]);

  if (!worker.workerProfile?.hourlyRate) {
    throw new ApiError(400, "Worker hourly rate not set");
  }

  const userBalance = user.userProfile?.walletBalance ?? 0;

  if (userBalance < payload.price) {
    throw new ApiError(400, "Insufficient wallet balance");
  }

  return await prisma.$transaction(async (tx) => {
    await tx.booking.create({
      data: {
        userId,
        workerId: payload.workerId,
        date: payload.date,
        purpose: payload.purpose,
        address: payload.address,
        price: payload.price,
        status: "Pending",
        startTime: payload.startTime,
        endTime: payload.endTime,
        duration: payload.duration,
      },
    });

    await tx.userProfile.update({
      where: { userId },
      data: {
        walletBalance: { decrement: payload.price },
      },
    });

    try {
      await sendSingleNotification(
        worker.id,
        `${user.userName} has just booked a appointment with you!`,
        user.id,
        "New Job Received!",
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }

    return;
  });
};

const getUserWiseBookingsFromDB = async (userId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  const bookingSelect = {
    id: true,
    date: true,
    purpose: true,
    address: true,
    price: true,
    isReviewed: true,
    isReported: true,
    overTimeStatus: true,
    overTimeCharge: true,
    startTime: true,
    endTime: true,
    status: true,
    worker: {
      select: {
        id: true,
        userName: true,
        profileImage: true,
      },
    },
  };

  const [pendingBooking, activeBookings, completedBookings, cancelledBookings] =
    await Promise.all([
      prisma.booking.findMany({
        where: { userId, status: "Pending" },
        select: bookingSelect,
      }),
      prisma.booking.findMany({
        where: { userId, status: "Active" },
        select: bookingSelect,
      }),
      prisma.booking.findMany({
        where: { userId, status: "Completed" },
        select: bookingSelect,
      }),
      prisma.booking.findMany({
        where: { userId, status: "Cancelled" },
        select: bookingSelect,
      }),
    ]);

  return {
    pendingBooking,
    activeBookings,
    completedBookings,
    cancelledBookings,
  };
};

const getWorkerWiseBookingsFromDB = async (workerId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: workerId, role: "WORKER" },
  });

  const bookingSelect = {
    id: true,
    date: true,
    purpose: true,
    address: true,
    price: true,
    isWorkerReviewed: true,
    isWorkerReported: true,
    status: true,
    startTime: true,
    endTime: true,
    overTimeStatus: true,
    overTimeCharge: true,
    user: {
      select: {
        id: true,
        userName: true,
        profileImage: true,
      },
    },
  };

  const [pendingBooking, activeBookings, completedBookings, cancelledBookings] =
    await Promise.all([
      prisma.booking.findMany({
        where: { workerId, status: "Pending" },
        select: bookingSelect,
      }),
      prisma.booking.findMany({
        where: { workerId, status: "Active" },
        select: bookingSelect,
      }),
      prisma.booking.findMany({
        where: { workerId, status: "Completed" },
        select: bookingSelect,
      }),
      prisma.booking.findMany({
        where: { workerId, status: "Cancelled" },
        select: bookingSelect,
      }),
    ]);

  return {
    pendingBooking,
    activeBookings,
    completedBookings,
    cancelledBookings,
  };
};

const acceptBookingInDB = async (bookingId: string) => {
  await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId, status: "Pending" },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "Active" },
  });

  return;
};

const rejectBookingFromDB = async (bookingId: string) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId, status: "Pending" },
    include: {
      user: {
        select: {
          userName: true,
        },
      },
    },
  });

  await prisma.booking.delete({ where: { id: bookingId } });

  await prisma.userProfile.update({
    where: { userId: booking.userId },
    data: {
      walletBalance: { increment: booking.price },
    },
  });

  try {
    await sendSingleNotification(
      booking.userId,
      `${booking.user.userName} has rejected your appointment`,
      booking.workerId,
      "Booking Rejected!",
    );
  } catch (notificationError) {
    console.error("Notification failed:", notificationError);
  }

  return;
};

const markBookingAsCompletedInDB = async (req: Request) => {
  const payload = req.body;
  const file = req.file;

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId, status: "Active" },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const fileUrl = file ? await processImage(file, "fileUrl") : null;

  if (!fileUrl) {
    throw new ApiError(
      400,
      "Proof image of delivery is required to complete the booking",
    );
  }

  await prisma.booking.update({
    where: { id: payload.bookingId },
    data: { status: "Completed" },
  });

  await prisma.deliveryProof.create({
    data: {
      bookingId: payload.bookingId,
      fileUrl: fileUrl,
      message: payload.message,
    },
  });

  const total = booking.price + booking.overTimeCharge;

  await prisma.workerProfile.update({
    where: { workerId: booking.workerId },
    data: {
      allTimeEarning: { increment: total * 0.9 },
      currentEarning: { increment: total * 0.9 },
    },
  });

  await prisma.userProfile.update({
    where: { userId: booking.userId },
    data: {
      netSpent: { increment: booking.price + booking.overTimeCharge },
    },
  });

  return;
};

const cancelBookingInDB = async (bookingId: string) => {
  const booking = await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId, status: "Active" },
      include: {
        user: { select: { userName: true } },
      },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "Cancelled" },
    });

    await tx.userProfile.update({
      where: { userId: booking.userId },
      data: {
        walletBalance: { increment: booking.price },
      },
    });

    return booking;
  });

  sendSingleNotification(
    booking.workerId,
    `${booking.user.userName} cancelled the appointment`,
    booking.userId,
    "Booking Cancelled",
  ).catch((err) => console.error("Notification failed:", err));
};

const sendOvertimeRequestInDB = async (bookingId: string) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId, status: "Active" },
  });

  const userProfile = await prisma.userProfile.findUniqueOrThrow({
    where: { userId: booking.userId },
  });

  if (userProfile.walletBalance < booking.price * 0.5) {
    throw new ApiError(
      400,
      "Insufficient wallet balance to send overtime request",
    );
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { overTimeStatus: "Pending", overTimeCharge: booking.price * 0.5 },
  });

  await prisma.userProfile.update({
    where: { userId: booking.userId },
    data: {
      walletBalance: { decrement: booking.price * 0.5 },
    },
  });

  return;
};

const acceptRejectOvertimeRequestInDB = async (
  bookingId: string,
  approveOvertime: boolean,
) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId, status: "Active", overTimeStatus: "Pending" },
  });

  if (!approveOvertime) {
    await prisma.userProfile.update({
      where: { userId: booking.userId },
      data: {
        walletBalance: { increment: booking.price * 0.5 },
        netSpent: { decrement: booking.price * 0.5 },
      },
    });
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      overTimeStatus: approveOvertime ? "Accepted" : "Not_Requested",
      overTimeCharge: 0,
    },
  });

  return {
    message: approveOvertime
      ? "Overtime request accepted"
      : "Overtime request rejected",
  };
};

const getBookingDetailsFromDB = async (bookingId: string) => {
  const bookingDetails = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
    include: {
      user: {
        select: {
          userName: true,
          profileImage: true
        }
      },
      worker: {
        select: {
          userName: true,
          profileImage: true
        }
      },
      deliveryProofs: {
        select: {
          fileUrl: true,
          message: true
        }
      }
    }
  })

  return bookingDetails;
}

export const bookingService = {
  createNewBookingInDB,
  getUserWiseBookingsFromDB,
  getWorkerWiseBookingsFromDB,
  rejectBookingFromDB,
  acceptBookingInDB,
  markBookingAsCompletedInDB,
  cancelBookingInDB,
  sendOvertimeRequestInDB,
  acceptRejectOvertimeRequestInDB,
  getBookingDetailsFromDB
};
