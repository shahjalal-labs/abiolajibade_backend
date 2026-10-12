import express from "express";
import { UserControllers } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import { UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { fileUploader } from "../../../helpers/fileUploadHelper";

const router = express.Router();

router.post(
  "/pending",
  validateRequest(userValidation.userRegisterValidationSchema),
  UserControllers.createPendingUser
);
router.post("/verify-account", UserControllers.createUser);
router.post(
  "/set-profile/user",
  auth(UserRole.USER),
  fileUploader.profileImage,
  parseBodyData,
  validateRequest(userValidation.userProfileSchema),
  UserControllers.setUpUserProfile
);
router.put(
  "/set-profile/user",
  auth(UserRole.USER),
  fileUploader.profileImage,
  parseBodyData,
  validateRequest(userValidation.userProfileSchema),
  UserControllers.updateUserProfile
);
router.post(
  "/set-profile/worker",
  auth(UserRole.WORKER),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(userValidation.workerProfileSchema),
  UserControllers.setUpWorkerProfile
);
router.put(
  "/set-profile/worker",
  auth(UserRole.WORKER),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(userValidation.workerProfileSchema),
  UserControllers.updateWorkerProfile
);
router.get("/profile", auth(), UserControllers.getProfile);
router.put(
  "/:id",
  validateRequest(userValidation.userUpdateValidationSchema),
  auth(UserRole.ADMIN),
  UserControllers.updateUser
);
router.delete("/:id", auth(UserRole.ADMIN), UserControllers.deleteUser);
router.get("/details/:id",  UserControllers.userDetails);

export const userRoutes = router;
