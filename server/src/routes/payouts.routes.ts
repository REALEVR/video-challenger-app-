import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";

export const payoutsRouter = Router();

payoutsRouter.get("/challenge/:challengeId", async (req, res, next) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: { challengeId: req.params.challengeId },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        submission: { select: { id: true, caption: true, viewCount: true, voteCount: true } },
      },
      orderBy: { amountCents: "desc" },
    });
    res.json(payouts);
  } catch (err) {
    next(err);
  }
});

payoutsRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: { userId: req.userId! },
      include: { challenge: { select: { id: true, title: true } } },
      orderBy: { computedAt: "desc" },
    });
    res.json(payouts);
  } catch (err) {
    next(err);
  }
});
