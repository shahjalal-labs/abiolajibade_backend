import Stripe from "stripe";
import ApiError from "../../../errors/ApiErrors";
import { generateOnboardingLink } from "../../../helpers/stripe.helper";
import prisma from "../../../shared/prisma";
import config from "../../../config";

const stripe = new Stripe(config.stripe.stripe_secret as string);

const createWithdrawRequestInDB = async (amount: number, workerId: string) => {
  const workerProfile = await prisma.workerProfile.findUniqueOrThrow({
    where: {
      workerId,
    },
    include: {
      worker: {
        select: {
          email: true,
        },
      },
    },
  });

  if (workerProfile.currentEarning < amount) {
    throw new ApiError(400, "Insufficient funds");
  }

  if (!workerProfile.stripeAccountId) {
    const account = await stripe.accounts.create({
      type: "express",
      country: "US",
      email: workerProfile.worker?.email ?? undefined,
    });

    await prisma.workerProfile.update({
      where: { workerId },
      data: { stripeAccountId: account.id },
    });

    const link = await generateOnboardingLink(account.id);

    return {
      message: "Account not connected. Onboarding link generated",
      link,
    };
  }

  const account = await stripe.accounts.retrieve(
    workerProfile.stripeAccountId as string,
  );
  if (!account.charges_enabled) {
    const link = await generateOnboardingLink(
      workerProfile.stripeAccountId as string,
    );

    return {
      message: "Account not connected. Onboarding link generated",
      link,
    };
  }

  const existingRequest = await prisma.withdraw.findFirst({
    where: {
      workerId,
      status: "Pending",
    },
  });

  if (existingRequest) {
    throw new ApiError(400, "You already have a pending withdraw request");
  }

  await prisma.withdraw.create({
    data: {
      amount,
      workerId,
    },
  });

  return {
    message: "Withdraw request created successfully",
  };
};

const workerWithdrawRequestsFromDB = async (workerId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: {
      id: workerId,
      role: "WORKER",
    },
  });

  const withdraws = await prisma.withdraw.findMany({
    where: {
      workerId,
    },
  });

  return withdraws
};

export const withdrawService = {
  createWithdrawRequestInDB,
  workerWithdrawRequestsFromDB
};
