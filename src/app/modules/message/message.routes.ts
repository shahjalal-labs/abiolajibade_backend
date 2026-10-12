import express from "express";
import { messageControllers } from "./message.controller";
import { fileUploader } from "../../../helpers/fileUploadHelper";


const router = express.Router();

router.post(
  "/generate-url",
  fileUploader.uploadMultiple,
  messageControllers.generateFileUrl
);


export const messageRoute = router;
