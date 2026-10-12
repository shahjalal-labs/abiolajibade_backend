import express from "express";
import { bookingController } from "./booking.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import validateRequest from "../../middlewares/validateRequest";
import { bookingSchema } from "./booking.validation";

const router = express.Router();

router.post("/create", auth(UserRole.USER), bookingController.createBooking);
router.get(
  "/user-wise",
  auth(UserRole.USER),
  bookingController.getUserBookings,
);
router.get(
  "/worker-wise",
  auth(UserRole.WORKER),
  bookingController.getWorkerBookings,
);
router.delete("/reject/:id", auth(), bookingController.rejectBooking);
router.patch(
  "/accept/:id",
  auth(UserRole.WORKER),
  bookingController.acceptBooking,
);
router.put(
  "/mark-completed",
  auth(UserRole.WORKER),
  fileUploader.fileUrl,
  parseBodyData,
  validateRequest(bookingSchema.markCompletedValidationSchema),
  bookingController.markBookingAsCompleted,
);
router.patch("/cancel/:id", auth(), bookingController.cancelBooking);
router.patch(
  "/send-overtime-request/:id",
  auth(UserRole.USER),
  bookingController.sendOvertimeRequest,
);
router.put(
  "/accept-reject-overtime",
  auth(UserRole.WORKER),
  validateRequest(bookingSchema.acceptRejectSchema),
  bookingController.acceptRejectOvertimeRequest,
);
router.get(
  "/details/:id",
  auth(),
  bookingController.getBookingDetails,
);

export const bookingRoute = router;
