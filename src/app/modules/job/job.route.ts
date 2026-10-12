import express from "express";
import { jobController } from "./job.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { jobSchema } from "./job.validation";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { fileUploader } from "../../../helpers/fileUploadHelper";

const router = express.Router();

router.post(
  "/create",
  auth(UserRole.USER),
  fileUploader.fileUrl,
  parseBodyData,
  validateRequest(jobSchema.jobValidationSchema),
  jobController.createJob,
);
router.put(
  "/update",
  auth(UserRole.USER),
  fileUploader.fileUrl,
  parseBodyData,
  validateRequest(jobSchema.jobUpdateValidationSchema),
  jobController.editJob,
);
router.patch(
  "/repost/:id",
  auth(UserRole.USER),
  jobController.repostJobInDB,
);
router.get("/user-wise", auth(UserRole.USER), jobController.getUserWiseJobs);
router.get("/all-jobs", auth(), jobController.getAllJobs);
router.get("/details/:id", jobController.getJobDetails);
router.post("/apply/:id", auth(UserRole.WORKER), jobController.applyJob);
router.delete("/:id", auth(UserRole.USER, UserRole.ADMIN), jobController.deleteJob);
router.post(
  "/application-accept",
  auth(UserRole.USER),
  validateRequest(jobSchema.acceptJobApplicationSchema),
  jobController.acceptApplication,
);

export const jobRoutes = router;
