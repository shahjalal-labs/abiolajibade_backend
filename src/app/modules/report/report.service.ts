import prisma from "../../../shared/prisma";

const createUserReportInDB = async (userId: string, payload: any) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId, status: "Completed" },
  });

  await prisma.userReport.create({
    data: {
      bookingId: payload.bookingId,
      comment: payload.comment,
    },
  });

  await prisma.booking.update({
    where: { id: payload.bookingId },
    data: { isReported: true },
  });

  return;
};
const createWorkerReportInDB = async (workerId: string, payload: any) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: workerId, role: "WORKER" },
  });

  await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId, status: "Completed" },
  });

  await prisma.workerReport.create({
    data: {
      bookingId: payload.bookingId,
      comment: payload.comment,
    },
  });

  await prisma.booking.update({
    where: { id: payload.bookingId },
    data: { isWorkerReported: true },
  });

  return;
};

export const reportService = {
  createUserReportInDB,
  createWorkerReportInDB,
};
