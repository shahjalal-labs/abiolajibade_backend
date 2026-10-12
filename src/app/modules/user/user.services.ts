import { PendingUser, UserRole } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import prisma from "../../../shared/prisma";
import sendEmail from "../../../helpers/sendEmail";
import generateOTP from "../../../helpers/generateOtp";
import { emailBody } from "../../../helpers/EmailBody";
import { createCustomerStripeAccount } from "../../../helpers/stripe.helper";
import { Request } from "express";
import { uploadInSpace } from "../../../shared/UploadHelper";

//create new user
const createPendingUserIntoDB = async (payload: PendingUser) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: payload.email },
  });
  if (existingUser) {
    throw new ApiError(409, "Email already exists!");
  }

  const hashedPassword = await bcrypt.hash(payload.password as string, 10);
  const otp = generateOTP();

  const OTP_EXPIRATION_TIME = 5 * 60 * 1000;
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  const subject = "Your Account Verification OTP";
  const html = emailBody(payload.userName, otp);

  await sendEmail(payload.email, subject, html);
  await prisma.pendingUser.upsert({
    where: {
      email: payload.email,
    },
    update: { otpCode: otp, expiresAt: new Date(expiresAt) },
    create: {
      ...payload,
      password: hashedPassword,
      otpCode: otp,
      expiresAt: new Date(expiresAt),
    },
  });

  return otp;
};

//create new user
const createUserIntoDB = async (email: string, otp: string) => {
  const existingUser = await prisma.user.findUnique({
    where: { email: email },
  });
  if (existingUser) {
    throw new ApiError(409, "User Already exists!");
  }

  const userPending = await prisma.pendingUser.findUnique({
    where: { email: email },
  });
  if (!userPending) {
    throw new ApiError(409, "User doesn't exist!");
  }

  const { otpCode, expiresAt, userName } = userPending;

  if (otp !== otpCode) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.pendingUser.delete({
      where: {
        email: userPending.email,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  // OTP is valid
  await prisma.pendingUser.delete({
    where: {
      email: email,
    },
  });

  const stripeAccount = await createCustomerStripeAccount(userName, email);

  const user = await prisma.user.create({
    data: {
      email: email,
      password: userPending.password,
      userName: userName,
      status: userPending.role === "WORKER" ? "Pending" : "Active",
      stripeUserId: stripeAccount.id || null,
      role: userPending.role as UserRole,
    },
  });

  const accessToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  return {
    accessToken,
    id: user.id,
    role: user.role,
  };
};

const setUpUserProfileIntoDB = async (req: Request) => {
  const userId = req.user.id;
  const payload = req.body;
  const file = req.file;

  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const profileImage = file ? await processImage(file, "profileImage") : null;
  if (!profileImage) {
    throw new ApiError(404, "Image is required");
  }

  const age = parseInt(payload.age);

  await prisma.userProfile.create({
    data: {
      userId,
      age: age,
      ethnicity: payload.ethnicity,
      gender: payload.gender,
      bio: payload.bio,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isSetup: true,
      profileImage,
    },
  });
  return;
};

const setUpWorkerProfileIntoDB = async (req: Request) => {
  const workerId = req.user.id;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const payload = req.body;
  const bypassSkills = [
    "Social Media Manager",
    "Content Creator",
    "Photo Editor",
  ];

  await prisma.user.findUniqueOrThrow({
    where: { id: workerId, role: "WORKER" },
  });

  if (payload.skills.length < 1) {
    throw new ApiError(400, "At least one skills is required");
  }

  const processImages = async (
    files: Express.Multer.File[] | undefined,
    folder: string,
  ) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, `courses/${folder}`)),
    );
  };

  const [profileImage, cprUrl, immunizationUrl, licenceUrl, certificateUrl] =
    await Promise.all([
      processImages(files?.profileImage, "profileImage"),
      processImages(files?.cprUrl, "cprUrl"),
      processImages(files?.immunizationUrl, "immunizationUrl"),
      processImages(files?.licenceUrl, "licenceUrl"),
      processImages(files?.certificateUrl, "certificateUrl"),
    ]);

  const age = parseInt(payload.age);
  const submittedSkills: string[] = Array.isArray(payload.skills)
    ? payload.skills
    : typeof payload.skills === "string" && payload.skills
      ? [payload.skills]
      : [];
  const shouldBeActive = submittedSkills.every((skill) =>
    bypassSkills.includes(skill),
  );

  await prisma.workerProfile.create({
    data: {
      workerId,
      cprUrl: cprUrl?.[0],
      immunizationUrl: immunizationUrl?.[0],
      licenceUrl: licenceUrl?.[0],
      certificateUrl: certificateUrl?.[0],
      age,
      ...payload,
    },
  });

  await prisma.user.update({
    where: { id: workerId },
    data: {
      profileImage: profileImage?.[0],
      isSetup: true,
      status: shouldBeActive ? "Active" : "Pending",
    },
  });

  return;
};

// const setUpWorkerProfileIntoDB = async (req: Request) => {
//   const workerId = req.user.id;
//   const files = req.files as { [fieldname: string]: Express.Multer.File[] };
//   const payload = req.body;

//   await prisma.user.findUniqueOrThrow({
//     where: { id: workerId, role: "WORKER" },
//   });

//   if (payload.skills.length < 1) {
//     throw new ApiError(400, "At least one skills is required");
//   }

//   const processImages = async (
//     files: Express.Multer.File[] | undefined,
//     folder: string,
//   ) => {
//     if (!files || files.length === 0) return null;
//     return Promise.all(
//       files.map((file) => uploadInSpace(file, `courses/${folder}`)),
//     );
//   };

//   const [profileImage, cprUrl, immunizationUrl, licenceUrl, certificateUrl] =
//     await Promise.all([
//       processImages(files?.profileImage, "profileImage"),
//       processImages(files?.cprUrl, "cprUrl"),
//       processImages(files?.immunizationUrl, "immunizationUrl"),
//       processImages(files?.licenceUrl, "licenceUrl"),
//       processImages(files?.certificateUrl, "certificateUrl"),
//     ]);

//   const age = parseInt(payload.age);

//   await prisma.workerProfile.create({
//     data: {
//       workerId,
//       cprUrl: cprUrl?.[0],
//       immunizationUrl: immunizationUrl?.[0],
//       licenceUrl: licenceUrl?.[0],
//       certificateUrl: certificateUrl?.[0],
//       age,
//       ...payload,
//     },
//   });

//   await prisma.user.update({
//     where: { id: workerId },
//     data: {
//       profileImage: profileImage?.[0],
//       isSetup: true,
//     },
//   });

//   return;
// };

const updateUserProfileIntoDB = async (req: Request) => {
  const userId = req.user.id;
  const payload = req.body;
  const file = req.file;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
    include: {
      userProfile: true,
    },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const profileImage = file ? await processImage(file, "profileImage") : null;

  const age = parseInt(payload.age);

  await prisma.userProfile.update({
    where: { userId },
    data: {
      userId,
      age: age || user.userProfile?.age,
      ethnicity: payload.ethnicity || user.userProfile?.ethnicity,
      gender: payload.gender || user.userProfile?.gender,
      bio: payload.bio || user.userProfile?.bio,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      userName: payload.userName || user.userName,
      profileImage: profileImage || user.profileImage,
    },
  });
  return;
};

const updateWorkerProfileIntoDB = async (req: Request) => {
  const workerId = req.user.id;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const payload = req.body;

  const worker = await prisma.user.findUniqueOrThrow({
    where: { id: workerId, role: "WORKER" },
    include: {
      workerProfile: true,
    },
  });

  if (payload.skills.length < 1) {
    throw new ApiError(400, "At least one skills is required");
  }

  const processImages = async (
    files: Express.Multer.File[] | undefined,
    folder: string,
  ) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, `courses/${folder}`)),
    );
  };

  const [profileImage, cprUrl, immunizationUrl, licenceUrl, certificateUrl] =
    await Promise.all([
      processImages(files?.profileImage, "profileImage"),
      processImages(files?.cprUrl, "cprUrl"),
      processImages(files?.immunizationUrl, "immunizationUrl"),
      processImages(files?.licenceUrl, "licenceUrl"),
      processImages(files?.certificateUrl, "certificateUrl"),
    ]);

  const age = parseInt(payload.age);

  await prisma.workerProfile.update({
    where: { workerId },
    data: {
      workerId,
      cprUrl: cprUrl?.[0] || worker.workerProfile?.cprUrl,
      immunizationUrl:
        immunizationUrl?.[0] || worker.workerProfile?.immunizationUrl,
      licenceUrl: licenceUrl?.[0] || worker.workerProfile?.licenceUrl,
      certificateUrl:
        certificateUrl?.[0] || worker.workerProfile?.certificateUrl,
      age: age || worker.workerProfile?.age,
      ethnicity: payload.ethnicity || worker.workerProfile?.ethnicity,
      bio: payload.bio || worker.workerProfile?.bio,
      skills: payload.skills || worker.workerProfile?.skills,
      disability: payload.disability || worker.workerProfile?.disability,
      language: payload.language || worker.workerProfile?.language,
      experience: payload.experience || worker.workerProfile?.experience,
      licenceNumber:
        payload.licenceNumber || worker.workerProfile?.licenceNumber,
      gender: payload.gender || worker.workerProfile?.gender,
    },
  });

  await prisma.user.update({
    where: { id: workerId },
    data: {
      profileImage: profileImage?.[0] || worker.profileImage,
      userName: payload.userName || worker.userName,
    },
  });

  return;
};

//get single user
const getProfileFromDB = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    include: {
      userProfile: true,
      workerProfile: true,
    },
  });

  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

//update user
const updateUserIntoDB = async (id: string, userData: any) => {
  if (!ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: userData,
  });

  const { password, ...sanitizedUser } = updatedUser;

  return sanitizedUser;
};

//delete user
const deleteUserIntoDB = async (userId: string, loggedId: string) => {
  if (!ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid user ID format");
  }

  if (userId === loggedId) {
    throw new ApiError(403, "You can't delete your own account!");
  }

  await prisma.user.delete({
    where: { id: userId },
  });
  return;
};

const getUserDetailsFromDB = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      userName: true,
      avgRating: true,
      profileImage: true,
      userProfile: {
        select: {
          bio: true,
        },
      },
      reviewWorker: {
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          worker: {
            select: {
              userName: true,
              profileImage: true,
            },
          },
        },
      },
    },
  });

  return user;
};

export const userService = {
  createUserIntoDB,
  createPendingUserIntoDB,
  setUpUserProfileIntoDB,
  setUpWorkerProfileIntoDB,
  getProfileFromDB,
  updateUserIntoDB,
  deleteUserIntoDB,
  updateUserProfileIntoDB,
  updateWorkerProfileIntoDB,
  getUserDetailsFromDB,
};
