import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { reportController } from "./report.controller";

const router = express.Router();

router.post(
  "/user-report",
  auth(UserRole.USER),
  reportController.createUserReport,
);
router.post(
  "/worker-report",
  auth(UserRole.WORKER),
  reportController.createWorkerReport,
);

export const reportRoute = router;
