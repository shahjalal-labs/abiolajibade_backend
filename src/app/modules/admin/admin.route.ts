import express from "express";
import validateRequest from "../../middlewares/validateRequest";
import { authValidation } from "../auth/auth.validation";
import { adminController } from "./admin.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

//login user
router.post(
  "/login",
  validateRequest(authValidation.loginSchema),
  adminController.loginAdmin,
);
router.put(
  "/update-profile",
  auth(UserRole.ADMIN),
  fileUploader.profileImage,
  parseBodyData,
  adminController.updateAdminProfile,
);
router.patch(
  "/accept-withdraw-request/:id",
  auth(UserRole.ADMIN),
  adminController.acceptWithdrawRequest,
);
router.delete(
  "/reject-withdraw-request/:id",
  auth(UserRole.ADMIN),
  adminController.rejectWithdrawRequest,
);
router.get("/all-users", auth(UserRole.ADMIN), adminController.allUsers);
router.get("/all-workers", auth(UserRole.ADMIN), adminController.allWorkers);
router.get(
  "/all-pending-workers",
  auth(UserRole.ADMIN),
  adminController.allPendingWorkers,
);
router.get("/all-jobs", auth(UserRole.ADMIN), adminController.allJobs);
router.get("/user-reports", auth(UserRole.ADMIN), adminController.userReports);
router.get(
  "/worker-reports",
  auth(UserRole.ADMIN),
  adminController.workerReports,
);
router.put(
  "/response-worker-report",
  auth(UserRole.ADMIN),
  adminController.responseWorkerReport,
);
router.put(
  "/response-user-report",
  auth(UserRole.ADMIN),
  adminController.responseUserReport,
);
router.get("/all-user-reviews", auth(UserRole.ADMIN), adminController.userReviews);
router.get("/all-worker-reviews", auth(UserRole.ADMIN), adminController.workerReviews);
router.get("/all-bookings", auth(UserRole.ADMIN), adminController.allBookings);
router.get(
  "/withdraw-requests",
  auth(UserRole.ADMIN),
  adminController.allWithdrawRequests,
);
router.patch(
  "/block-unblock/:id",
  auth(UserRole.ADMIN),
  adminController.blockUnblock,
);
router.put(
  "/accept-reject-application",
  auth(UserRole.ADMIN),
  adminController.acceptRejectApplication,
);
router.get(
  "/user-details/:id",
  auth(UserRole.ADMIN),
  adminController.userDetails,
);
router.get(
  "/worker-details/:id",
  auth(UserRole.ADMIN),
  adminController.workerDetails,
);

router.get(
  "/overview",
  auth(UserRole.ADMIN),
  adminController.getoverview,
);
router.get(
  "/top-workers",
  auth(UserRole.ADMIN),
  adminController.topWorkers,
);
router.get(
  "/earnings-summary",
  auth(UserRole.ADMIN),
  adminController.earningsSummary,
);

export const adminRoute = router;
