import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { withdrawController } from "./withdraw.controller";

const router = express.Router();

router.post(
  "/create",
  auth(UserRole.WORKER),
  withdrawController.createWithdrawRequest,
);
router.get(
  "/worker-requests",
  auth(UserRole.WORKER),
  withdrawController.withdrawRequests,
);

export const withdrawRoute = router;
