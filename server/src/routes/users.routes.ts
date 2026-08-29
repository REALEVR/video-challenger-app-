import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { createConnectOnboardingLink, stripeEnabled } from "../lib/stripe";

export const usersRouter = Router();

usersRouter.get("/:id", async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        submissions: {
          include: { challenge: { select: { id: true, title: true, status: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({
      id: user.id,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      role: user.role,
      submissions: user.submissions,
    });
  } catch (err) {
    next(err);
  }
});

usersRouter.get("/:id/payouts", requireAuth, async (req, res, next) => {
  try {
    if (req.userId !== req.params.id && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "You can only view your own payouts." });
    }
    const payouts = await prisma.payout.findMany({
      where: { userId: req.params.id },
      include: { challenge: { select: { title: true } }, submission: { select: { caption: true, videoUrl: true } } },
      orderBy: { computedAt: "desc" },
    });
    res.json(payouts);
  } catch (err) {
    next(err);
  }
});

/** Kicks off Stripe Connect onboarding so a creator can actually receive payouts. */
usersRouter.post("/me/stripe/onboard", requireAuth, async (req, res, next) => {
  try {
    if (!stripeEnabled) {
      return res.status(400).json({
        error: "Stripe is not configured on this server yet. Payouts will run in simulated mode until it is.",
      });
    }
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    const { accountId, url } = await createConnectOnboardingLink(user.email, user.stripeAccountId ?? undefined);
    if (accountId !== user.stripeAccountId) {
      await prisma.user.update({ where: { id: user.id }, data: { stripeAccountId: accountId } });
    }
    res.json({ url });
  } catch (err) {
    next(err);
  }
});
