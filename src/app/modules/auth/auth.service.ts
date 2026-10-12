import prisma from "../../../shared/prisma";
import bcrypt from "bcryptjs";
import ApiError from "../../../errors/ApiErrors";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import config from "../../../config";
import { UserLocation } from "@prisma/client";
import generateOTP from "../../../helpers/generateOtp";
import sendEmail from "../../../helpers/sendEmail";
import Stripe from "stripe";
import {
  createVerificationUser,
  getMedalionJWT,
  submitUserConsent,
} from "../../../helpers/authenticate";

const stripe = new Stripe(config.stripe.stripe_secret as string);

//login user
const loginUserIntoDB = async (payload: any) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: {
      email: payload.email,
    },
  });

  const isPasswordValid = await bcrypt.compare(
    payload.password,
    user?.password,
  );

  if (!isPasswordValid) {
    throw new ApiError(403, "Invalid credentials");
  }

  if (user.status === "Blocked") {
    throw new ApiError(
      403,
      "Your account has been blocked. Please contact support.",
    );
  }

  const accessToken = jwtHelpers.generateToken(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      userName: user.userName,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { fcmToken: payload.fcmToken },
  });

  return {
    accessToken,
    id: user.id,
    isSetup: user.isSetup,
    role: user.role,
  };
};

//update or add user location
const userLocationUpdateInDB = async (
  userId: string,
  userLocation: UserLocation,
) => {
  const location = await prisma.userLocation.findFirst({
    where: { userId: userId },
  });
  if (!location) {
    const result = await prisma.userLocation.create({
      data: { ...userLocation, userId: userId },
    });

    return result;
  }

  const result = await prisma.userLocation.update({
    where: { id: location.id },
    data: userLocation,
  });

  return result;
};
//send forgot password otp
const sendForgotPasswordOtpDB = async (email: string) => {
  const existringUser = await prisma.user.findUniqueOrThrow({
    where: {
      email: email,
    },
  });

  // Generate OTP and expiry time
  const otp = generateOTP(); // 4-digit OTP
  const OTP_EXPIRATION_TIME = 5 * 60 * 1000; // 5 minute
  const expiresAt = Date.now() + OTP_EXPIRATION_TIME;
  const subject = "Your Password Reset OTP";
  const html = `
  <div style="font-family: Arial, sans-serif; color: #333;">
    <h2>Password Reset Request</h2>
    <p>Hi <b>${existringUser.userName}</b>,</p>
    <p>Your OTP for password reset is:</p>
    <h1 style="color: #007BFF;">${otp}</h1>
    <p>This OTP is valid for <b>5 minutes</b>. If you did not request this, please ignore this email.</p>
    <p>Thanks, <br>The Support Team</p>
  </div>
`;
  await sendEmail(email, subject, html);
  await prisma.otp.upsert({
    where: {
      email: email,
    },
    update: { otpCode: otp, expiresAt: new Date(expiresAt) },
    create: { email: email, otpCode: otp, expiresAt: new Date(expiresAt) },
  });

  return otp;
};

// verify otp code
const verifyForgotPasswordOtpCodeDB = async (payload: any) => {
  const { email, otp } = payload;

  if (!email && !otp) {
    throw new ApiError(400, "Email and OTP are required.");
  }

  const user = await prisma.user.findUniqueOrThrow({ where: { email: email } });

  const userId = user.id;

  const verifyData = await prisma.otp.findUnique({
    where: {
      email: email,
    },
  });

  if (!verifyData) {
    throw new ApiError(400, "Invalid or expired OTP.");
  }

  const { otpCode: savedOtp, expiresAt } = verifyData;

  if (otp !== savedOtp) {
    throw new ApiError(401, "Invalid OTP.");
  }

  if (Date.now() > expiresAt.getTime()) {
    await prisma.otp.delete({
      where: {
        email: email,
      },
    }); // OTP has expired
    throw new ApiError(410, "OTP has expired. Please request a new OTP.");
  }

  // OTP is valid
  await prisma.otp.delete({
    where: {
      email: email,
    },
  });

  const accessToken = jwtHelpers.generateToken(
    { id: userId, email },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  return { accessToken: accessToken };
};

// reset password
const resetForgotPasswordDB = async (newPassword: string, userId: string) => {
  const existingUser = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.gen_salt),
  );

  await prisma.user.update({
    where: {
      id: existingUser.id,
    },
    data: {
      password: hashedPassword,
    },
  });

  return;
};

const changePasswordFromDB = async (
  userId: string,
  newPassword: string,
  oldPassword: string,
) => {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (
    !existingUser ||
    !(await bcrypt.compare(oldPassword, existingUser.password))
  ) {
    throw new Error("Invalid old password");
  }

  const hashedPassword = await bcrypt.hash(
    newPassword,
    Number(config.jwt.gen_salt),
  );

  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return;
};

const rechargeUserWalletIntoDB = async (userId: string, payload: any) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  await stripe.paymentMethods.attach(payload.paymentMethodId, {
    customer: user.stripeUserId as string,
  });

  // 3. Charge exact job price (in cents)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(payload.amount * 100),
    currency: "usd",
    customer: user.stripeUserId as string,
    payment_method: payload.paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(402, "Payment failed");
  }

  await prisma.userProfile.update({
    where: { userId },
    data: { walletBalance: { increment: payload.amount } },
  });

  return;
};

const updateHourlyRateInDB = async (workerId: string, hourlyRate: number) => {
  await prisma.workerProfile.findUniqueOrThrow({
    where: { workerId },
  });

  await prisma.workerProfile.update({
    where: { workerId },
    data: { hourlyRate },
  });

  return;
};

const sendVerificationRequestToMedalion = async (
  userId: string,
  payload: any,
) => {
  const worker = await prisma.user.findUnique({
    where: { id: userId, role: "WORKER", status: "Pending" },
  });

  if (!worker) {
    throw new ApiError(
      404,
      "Worker not found or not eligible for verification.",
    );
  }

  const nameParts = worker.userName.trim().split(" ");

  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  const response = await createVerificationUser({
    firstName: firstName,
    lastName: lastName,
    email: worker.email,
    phone: payload.phoneNumber,
    dob: payload.dob,
    address: payload.address,
    ssn: payload.ssn,
    zipCode: payload.zipCode,
    state: payload.state,
    city: payload.city,
    country: "USA",
    streetName: payload.streetName,
    houseNumber: payload.houseNumber,
  });

  if (response.userAccessCode) {
    const responses = await submitUserConsent(
      response.userAccessCode,
      worker.userName,
    );

    if (responses.success == true) {
      await prisma.user.update({
        where: { id: userId },
        data: { status: "Verification_Submitted" },
      });

      await prisma.workerProfile.update({
        where: { workerId: userId },
        data: {
          userAccessCode: response.userAccessCode,
        },
      });
    }

    return;
  }

  return response;
};

const payForMedalionVerificationLink = async (userId: string, payload: any) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "WORKER" },
    include: { workerProfile: { select: { userAccessCode: true } } },
  });

  if (
    user.status !== "Verification_Submitted" ||
    !user.workerProfile?.userAccessCode
  ) {
    throw new ApiError(400, "Verification form not submitted yet.");
  }

  await stripe.paymentMethods.attach(payload.paymentMethodId, {
    customer: user.stripeUserId as string,
  });

  // 3. Charge exact job price (in cents)
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(19.99 * 100),
    currency: "usd",
    customer: user.stripeUserId as string,
    payment_method: payload.paymentMethodId,
    confirm: true,
    automatic_payment_methods: {
      enabled: true,
      allow_redirects: "never",
    },
  });

  if (paymentIntent.status !== "succeeded") {
    throw new ApiError(402, "Payment failed");
  }

  const response = await getMedalionJWT(
    user.workerProfile?.userAccessCode as string,
  );
  if (!response.token) {
    throw new ApiError(500, "Failed to generate verification link");
  }
  const link = `https://verify.authenticating.com/?token=${response.token}`;

  await prisma.workerProfile.update({
    where: { workerId: userId },
    data: {
      generatedLink: link,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      status: "Link_Generated",
    },
  });

  return link;
};

export const authService = {
  loginUserIntoDB,
  userLocationUpdateInDB,
  sendForgotPasswordOtpDB,
  verifyForgotPasswordOtpCodeDB,
  resetForgotPasswordDB,
  changePasswordFromDB,
  rechargeUserWalletIntoDB,
  updateHourlyRateInDB,
  sendVerificationRequestToMedalion,
  payForMedalionVerificationLink,
};
