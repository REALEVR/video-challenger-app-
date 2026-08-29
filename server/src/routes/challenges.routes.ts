import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireChallengeOwner } from "../middleware/auth.middleware";
import { computeChallengePayouts, disburseChallengePayouts } from "../lib/payout";

export const challengesRouter = Router();

challengesRouter.get("/", async (req, res, next) => {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const challenges = await prisma.challenge.findMany({
      where: status ? { status: status as any } : undefined,
      include: {
        createdBy: { select: { id: true, displayName: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(challenges);
  } catch (err) {
    next(err);
  }
});

challengesRouter.get("/:id", async (req, res, next) => {
  try {
    const challenge = await prisma.challenge.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { id: true, displayName: true, avatarUrl: true } },
        submissions: {
          where: { status: "APPROVED" },
          include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
          orderBy: [{ voteCount: "desc" }, { viewCount: "desc" }],
        },
      },
    });
    if (!challenge) return res.status(404).json({ error: "Challenge not found." });
    res.json(challenge);
  } catch (err) {
    next(err);
  }
});

const createChallengeSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(10).max(4000),
  category: z.string().max(60).optional(),
  coverImageUrl: z.string().url().optional(),
  prizePoolCents: z.number().int().min(0),
  payoutModel: z.enum(["VIEWS", "VOTES", "HYBRID"]).default("VIEWS"),
  submissionDeadline: z.coerce.date(),
  votingDeadline: z.coerce.date(),
  minViewsForPayout: z.number().int().min(0).default(0),
});

challengesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const data = createChallengeSchema.parse(req.body);
    if (data.votingDeadline <= data.submissionDeadline) {
      return res.status(400).json({ error: "Voting deadline must be after the submission deadline." });
    }
    const challenge = await prisma.challenge.create({
      data: { ...data, createdById: req.userId! },
    });
    res.status(201).json(challenge);
  } catch (err) {
    next(err);
  }
});

const updateStatusSchema = z.object({
  status: z.enum(["DRAFT", "OPEN", "VOTING", "CLOSED", "PAID"]),
});

/** Manual status transitions (e.g. creator closes submissions to move to VOTING). */
challengesRouter.patch("/:id/status", requireAuth, requireChallengeOwner, async (req, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const challenge = await prisma.challenge.update({ where: { id: req.params.id }, data: { status } });
    res.json(challenge);
  } catch (err) {
    next(err);
  }
});

/** Ends voting and computes each submission's share of the prize pool from its views/votes. */
challengesRouter.post("/:id/compute-payouts", requireAuth, requireChallengeOwner, async (req, res, next) => {
  try {
    const payouts = await computeChallengePayouts(req.params.id);
    res.json(payouts);
  } catch (err) {
    next(err);
  }
});

/** Disburses (or simulates, if Stripe isn't configured) every computed payout. */
challengesRouter.post("/:id/disburse-payouts", requireAuth, requireChallengeOwner, async (req, res, next) => {
  try {
    const payouts = await disburseChallengePayouts(req.params.id);
    res.json(payouts);
  } catch (err) {
    next(err);
  }
});
