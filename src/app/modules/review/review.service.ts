import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";

const createNewReviewInDB = async (userId: string, payload: any) => {
  const { rating } = payload;

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: payload.bookingId },
    });

    if (booking.isReviewed) {
      throw new ApiError(400, "Booking already reviewed");
    }

    const worker = await tx.user.findUniqueOrThrow({
      where: { id: booking.workerId, role: "WORKER" },
      select: { avgRating: true, totalReview: true },
    });

    const currentTotalReview = worker.totalReview ?? 0;
    const newTotalReview = currentTotalReview + 1;
    const newAvgRating =
      (worker.avgRating * currentTotalReview + rating) / newTotalReview;
    const roundedAvgRating = Math.round(newAvgRating * 10) / 10;

    await tx.review.create({
      data: {
        rating,
        comment: payload.comment,
        userId: userId,
        workerId: booking.workerId,
      },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: { isReviewed: true },
    });

    await tx.user.update({
      where: { id: booking.workerId },
      data: { avgRating: roundedAvgRating, totalReview: newTotalReview },
    });
  });

  return;
};
const createWorkerReviewInDB = async (workerId: string, payload: any) => {
  const { rating } = payload;

  await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: payload.bookingId },
    });

    if (booking.isWorkerReviewed) {
      throw new ApiError(400, "Booking already reviewed");
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: booking.userId, role: "USER" },
      select: { avgRating: true, totalReview: true },
    });

    const currentTotalReview = user.totalReview ?? 0;
    const newTotalReview = currentTotalReview + 1;
    const newAvgRating =
      (user.avgRating * currentTotalReview + rating) / newTotalReview;
    const roundedAvgRating = Math.round(newAvgRating * 10) / 10;

    await tx.userReview.create({
      data: {
        rating,
        comment: payload.comment,
        userId: booking.userId,
        workerId: workerId,
      },
    });

    await tx.booking.update({
      where: { id: booking.id },
      data: { isWorkerReviewed: true },
    });

    await tx.user.update({
      where: { id: booking.userId },
      data: { avgRating: roundedAvgRating, totalReview: newTotalReview },
    });
  });

  return;
};

export const reviewServices = {
  createNewReviewInDB,
  createWorkerReviewInDB,
};
