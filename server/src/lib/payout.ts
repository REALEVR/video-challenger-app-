import { prisma } from "./prisma";
import { stripe, transferPayout } from "./stripe";
import { HttpError } from "./httpError";

/** Payout states that mean money was (or was recorded as) sent. */
const DISBURSED_STATUSES = ["PAID", "SIMULATED", "PROCESSING"];

// What compute/disburse return to the client. Never `user: true`: that sends
// every payee's passwordHash, email and Stripe account id to the caller.
const PAYOUT_RESULT_INCLUDE = {
  user: { select: { id: true, displayName: true, avatarUrl: true } },
  submission: { select: { id: true, caption: true, viewCount: true, voteCount: true } },
} as const;

/**
 * Computes each approved submission's share of a challenge's prize pool.
 *
 * - VIEWS  -> split proportional to view count (the "paid like YouTube" model)
 * - VOTES  -> split proportional to public vote count
 * - HYBRID -> average of the two shares
 *
 * Submissions below `minViewsForPayout` are excluded from the split entirely
 * (guards against a single stray view "winning" an empty challenge). Cents
 * are floored per-submission and any leftover remainder from rounding is
 * handed to the top-earning submission, so the pool always pays out in full
 * and never over-pays it.
 */
export async function computeChallengePayouts(challengeId: string) {
  const challenge = await prisma.challenge.findUniqueOrThrow({
    where: { id: challengeId },
    include: {
      submissions: {
        where: { status: "APPROVED" },
      },
    },
  });

  // Payouts can be (re)computed while voting runs or after it closed, but
  // never once any have been disbursed: recomputing used to reset PAID rows
  // back to PENDING, and the next disburse would pay those creators again.
  if (!["VOTING", "CLOSED"].includes(challenge.status)) {
    throw new HttpError(400, "Close submissions and start voting before computing payouts.");
  }
  const alreadyDisbursed = await prisma.payout.count({
    where: { challengeId, status: { in: DISBURSED_STATUSES } },
  });
  if (alreadyDisbursed > 0) {
    throw new HttpError(409, "Payouts for this challenge have already been disbursed and can't be recomputed.");
  }

  const eligible = challenge.submissions.filter((s) => s.viewCount >= challenge.minViewsForPayout);

  const totalViews = eligible.reduce((sum, s) => sum + s.viewCount, 0);
  const totalVotes = eligible.reduce((sum, s) => sum + s.voteCount, 0);

  type Share = { submissionId: string; userId: string; viewShare: number; voteShare: number; blendedShare: number };

  const shares: Share[] = eligible.map((s) => {
    const viewShare = totalViews > 0 ? s.viewCount / totalViews : 0;
    const voteShare = totalVotes > 0 ? s.voteCount / totalVotes : 0;
    let blended: number;
    switch (challenge.payoutModel) {
      case "VOTES":
        blended = voteShare;
        break;
      case "HYBRID":
        blended = (viewShare + voteShare) / 2;
        break;
      case "VIEWS":
      default:
        blended = viewShare;
    }
    return { submissionId: s.id, userId: s.userId, viewShare, voteShare, blendedShare: blended };
  });

  const totalBlended = shares.reduce((sum, s) => sum + s.blendedShare, 0);

  const results = shares.map((s) => {
    const normalized = totalBlended > 0 ? s.blendedShare / totalBlended : 0;
    const amountCents = Math.floor(normalized * challenge.prizePoolCents);
    return { ...s, amountCents };
  });

  // Distribute rounding remainder to the top earner so the full pool is allocated.
  const allocated = results.reduce((sum, r) => sum + r.amountCents, 0);
  const remainder = challenge.prizePoolCents - allocated;
  if (remainder > 0 && results.length > 0) {
    const top = [...results].sort((a, b) => b.amountCents - a.amountCents)[0];
    top.amountCents += remainder;
  }

  await prisma.$transaction(
    results.map((r) =>
      prisma.payout.upsert({
        where: { submissionId: r.submissionId },
        create: {
          challengeId,
          submissionId: r.submissionId,
          userId: r.userId,
          viewShare: r.viewShare,
          voteShare: r.voteShare,
          amountCents: r.amountCents,
          currency: challenge.currency,
          status: "PENDING",
        },
        update: {
          viewShare: r.viewShare,
          voteShare: r.voteShare,
          amountCents: r.amountCents,
          status: "PENDING",
          computedAt: new Date(),
        },
      })
    )
  );

  await prisma.challenge.update({
    where: { id: challengeId },
    data: { status: "CLOSED" },
  });

  return prisma.payout.findMany({ where: { challengeId }, include: PAYOUT_RESULT_INCLUDE, orderBy: { amountCents: "desc" } });
}

/** Disburses (or simulates disbursing) every PENDING payout for a challenge. */
export async function disburseChallengePayouts(challengeId: string) {
  const challenge = await prisma.challenge.findUniqueOrThrow({ where: { id: challengeId } });
  if (challenge.status !== "CLOSED") {
    throw new HttpError(400, "Compute payouts (which ends voting) before disbursing them.");
  }

  const payouts = await prisma.payout.findMany({
    where: { challengeId, status: "PENDING" },
    include: { user: true },
  });

  for (const payout of payouts) {
    // Claim the row first. A double-click or two admins disbursing at once
    // would otherwise both see it PENDING and both send the transfer.
    const claim = await prisma.payout.updateMany({
      where: { id: payout.id, status: "PENDING" },
      data: { status: "PROCESSING" },
    });
    if (claim.count === 0) continue;

    if (payout.amountCents <= 0) {
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      continue;
    }

    if (!stripe || !payout.user.stripeAccountId) {
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: "SIMULATED", paidAt: new Date() },
      });
      continue;
    }

    try {
      const result = await transferPayout({
        destinationAccountId: payout.user.stripeAccountId,
        amountCents: payout.amountCents,
        currency: payout.currency,
        transferGroup: `challenge_${challengeId}`,
        idempotencyKey: `payout_${payout.id}`,
      });
      await prisma.payout.update({
        where: { id: payout.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          stripeTransferId: "id" in result ? result.id : null,
        },
      });
    } catch (err) {
      console.error(`Stripe transfer failed for payout ${payout.id}:`, err);
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED" },
      });
    }
  }

  const remaining = await prisma.payout.count({
    where: { challengeId, status: { in: ["PENDING", "FAILED", "PROCESSING"] } },
  });
  if (remaining === 0) {
    await prisma.challenge.update({ where: { id: challengeId }, data: { status: "PAID" } });
  }

  return prisma.payout.findMany({ where: { challengeId }, include: PAYOUT_RESULT_INCLUDE, orderBy: { amountCents: "desc" } });
}
