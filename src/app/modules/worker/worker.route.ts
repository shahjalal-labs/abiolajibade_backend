import express from "express";
import { workerController } from "./worker.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get("/", auth(UserRole.USER), workerController.getAllWorkers);
router.get(
  "/details/:id",
  auth(UserRole.USER),
  workerController.getWorkerDetails,
);

router.get(
  "/earnings-summary",
  auth(UserRole.WORKER),
  workerController.getEarningsSummary
);

export const workerRoutes = router;
