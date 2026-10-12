import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { bookingService } from "./booking.service";

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const payload = req.body;
  await bookingService.createNewBookingInDB(userId, payload);

  console.log(payload);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Booking created successfully",
  });
});
const getUserBookings = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const bookings = await bookingService.getUserWiseBookingsFromDB(userId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User bookings retrieved successfully",
    data: bookings,
  });
});
const getWorkerBookings = catchAsync(async (req: Request, res: Response) => {
  const workerId = req.user.id;
  const bookings = await bookingService.getWorkerWiseBookingsFromDB(workerId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Worker bookings retrieved successfully",
    data: bookings,
  });
});
const acceptBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  await bookingService.acceptBookingInDB(bookingId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking accepted successfully",
  });
});
const rejectBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  await bookingService.rejectBookingFromDB(bookingId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking rejected successfully",
  });
});
const markBookingAsCompleted = catchAsync(
  async (req: Request, res: Response) => {
    await bookingService.markBookingAsCompletedInDB(req);

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Booking marked as completed successfully",
    });
  },
);
const cancelBooking = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  await bookingService.cancelBookingInDB(bookingId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Booking cancelled successfully",
  });
});
const sendOvertimeRequest = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  await bookingService.sendOvertimeRequestInDB(bookingId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Overtime request sent successfully",
  });
});
const acceptRejectOvertimeRequest = catchAsync(
  async (req: Request, res: Response) => {
    const { bookingId, approveOvertime } = req.body;
    const result = await bookingService.acceptRejectOvertimeRequestInDB(
      bookingId,
      approveOvertime,
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: result.message,
    });
  },
);
const getBookingDetails = catchAsync(
  async (req: Request, res: Response) => {
    const result = await bookingService.getBookingDetailsFromDB(
      req.params.id
    );

    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: "Booking details retrieved successfully",
      data: result,
    });
  },
);

export const bookingController = {
  createBooking,
  getUserBookings,
  getWorkerBookings,
  rejectBooking,
  acceptBooking,
  markBookingAsCompleted,
  cancelBooking,
  sendOvertimeRequest,
  acceptRejectOvertimeRequest,
  getBookingDetails,
};
