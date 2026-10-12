import express, { Application, NextFunction, Request, Response } from "express";

import httpStatus from "http-status";
import cors from "cors";
import router from "./app/routes";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
import { PrismaClient } from "@prisma/client";
import path from "path";
import redisClient from "./helpers/redis";
import { createVerificationUser, getMedalionJWT, getTestResult, submitUserConsent } from "./helpers/authenticate";
import { medallionReturnPage, privacyPolicy, termsAndConditions } from "./app/routes/viewRoutes";

const app: Application = express();
const prisma = new PrismaClient();

// Middleware setup
// prisma
//   .$connect()
//   .then(() => {
//     console.log("Database connected successfully!");
//   })
//   .catch((error) => {
//     console.error("Failed to connect to the database:", error);
//   });
(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
    await redisClient.connect();
  } catch (error) {
    console.error("Failed to connect to services:", error);
    process.exit(1); // exit app if connection fails
  }
})();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.get("/", (req: Request, res: Response) => {
  res.send({
    Message: "Welcome to api main route",
  });
});
app.post("/create-mock-user", async (req: Request, res: Response) => {
  const response = await createVerificationUser(req.body);
  console.log(response);
  res.send({
    Message: "Mock user created successfully",
  });
});
app.get("/privacy-policy", (req, res) => {
  res.send(privacyPolicy());
});
app.get("/terms-conditions", (req, res) => {
  res.send(termsAndConditions());
});
app.get("/medallion-return", (req, res) => {
  res.send(medallionReturnPage());
});


app.post("/test-result", async (req: Request, res: Response) => {
  const response = await getTestResult("043c79e8-9d88-4c31-a9ed-4c3fa821923c");
  console.log(response);
  res.send({
    Message: response,
  });
});
app.post("/medalion-verification", async (req: Request, res: Response) => {
  const response = await getMedalionJWT("8bfcf46b-434f-4249-8980-d1703aafadc2");
  console.log(response);
  res.send({
    Message: response,
  });
});

app.use("/api/v1", router);
app.use(GlobalErrorHandler);

app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;
