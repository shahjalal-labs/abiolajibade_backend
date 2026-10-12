import Stripe from "stripe";
import config from "../config";

const stripe = new Stripe(config.stripe.stripe_secret as string);

export const createCustomerStripeAccount = async (
  name: string,
  email: string
) => {
  const account = await stripe.customers.create({
    email,
    name,
  });
  return account;
};

export const generateOnboardingLink = async (accountId: string) => {
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: "https://yourdomain.com/reauth",
    return_url: "http://72.60.125.50:5003/account/connect/success",
    type: "account_onboarding",
  });

  return link.url;
};

export const transferMoneyToConnectedWorker = async (
  stripeAccountId: string,
  amount: number
) => {
  const transfer = await stripe.transfers.create({
    amount: Math.round(amount * 100),
    currency: "usd",
    destination: stripeAccountId,
  });

  return transfer;
};
