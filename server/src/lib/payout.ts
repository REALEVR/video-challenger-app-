import { prisma } from "./prisma";
import { stripe, transferPayout } from "./stripe";

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

  return prisma.payout.findMany({ where: { challengeId }, include: { user: true, submission: true } });
}

/** Disburses (or simulates disbursing) every PENDING payout for a challenge. */
export async function disburseChallengePayouts(challengeId: string) {
  const payouts = await prisma.payout.findMany({
    where: { challengeId, status: "PENDING" },
    include: { user: true },
  });

  for (const payout of payouts) {
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
      await prisma.payout.update({
        where: { id: payout.id },
        data: { status: "FAILED" },
      });
    }
  }

  const remaining = await prisma.payout.count({
    where: { challengeId, status: { in: ["PENDING", "FAILED"] } },
  });
  if (remaining === 0) {
    await prisma.challenge.update({ where: { id: challengeId }, data: { status: "PAID" } });
  }

  return prisma.payout.findMany({ where: { challengeId }, include: { user: true, submission: true } });
}
