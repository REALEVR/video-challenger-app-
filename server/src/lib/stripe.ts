import Stripe from "stripe";
import { env } from "./env";

// Real payouts require a Stripe account with Connect enabled. Until
// STRIPE_SECRET_KEY is set, every payout call below is simulated: the
// amount is still computed and recorded (status SIMULATED), so the whole
// product flow — including "how much would this creator have earned" — is
// demoable and testable without any payment credentials.
export const stripeEnabled = Boolean(env.stripeSecretKey);

export const stripe = stripeEnabled
  ? new Stripe(env.stripeSecretKey, { apiVersion: "2024-06-20" })
  : null;

export async function createConnectOnboardingLink(userEmail: string, existingAccountId?: string) {
  if (!stripe) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY unset).");
  }
  const account =
    existingAccountId ??
    (
      await stripe.accounts.create({
        type: "express",
        email: userEmail,
        capabilities: {
          transfers: { requested: true },
        },
      })
    ).id;

  const link = await stripe.accountLinks.create({
    account,
    refresh_url: env.stripeConnectRefreshUrl,
    return_url: env.stripeConnectReturnUrl,
    type: "account_onboarding",
  });

  return { accountId: account, url: link.url };
}

export async function transferPayout(opts: {
  destinationAccountId: string;
  amountCents: number;
  currency: string;
  transferGroup: string;
}): Promise<{ id: string } | { simulated: true }> {
  if (!stripe) {
    return { simulated: true };
  }
  const transfer = await stripe.transfers.create({
    amount: opts.amountCents,
    currency: opts.currency,
    destination: opts.destinationAccountId,
    transfer_group: opts.transferGroup,
  });
  return { id: transfer.id };
}
