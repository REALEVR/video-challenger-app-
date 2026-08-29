import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { voteLimiter } from "../lib/rateLimit";

export const votesRouter = Router();

// Anyone in the world can vote — the only requirement is a free account, so a
// vote can be tied to exactly one person (@@unique([submissionId, userId]) in
// the schema is what actually stops one visitor from voting twice).
votesRouter.post("/:submissionId", voteLimiter, requireAuth, async (req, res, next) => {
  try {
    const submission = await prisma.submission.findUnique({ where: { id: req.params.submissionId } });
    if (!submission) return res.status(404).json({ error: "Submission not found." });

    const challenge = await prisma.challenge.findUnique({ where: { id: submission.challengeId } });
    if (!challenge || !["OPEN", "VOTING"].includes(challenge.status)) {
      return res.status(400).json({ error: "Voting is not open for this challenge." });
    }
    if (new Date() > challenge.votingDeadline) {
      return res.status(400).json({ error: "The voting deadline for this challenge has passed." });
    }

    const existing = await prisma.vote.findUnique({
      where: { submissionId_userId: { submissionId: submission.id, userId: req.userId! } },
    });
    if (existing) {
      return res.status(409).json({ error: "You already voted for this submission." });
    }

    await prisma.$transaction([
      prisma.vote.create({ data: { submissionId: submission.id, userId: req.userId! } }),
      prisma.submission.update({ where: { id: submission.id }, data: { voteCount: { increment: 1 } } }),
    ]);

    res.status(201).json({ ok: true });
  } catch (err) {
    next(err);
  }
});

votesRouter.delete("/:submissionId", requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.vote.findUnique({
      where: { submissionId_userId: { submissionId: req.params.submissionId, userId: req.userId! } },
    });
    if (!existing) return res.status(404).json({ error: "You haven't voted for this submission." });

    await prisma.$transaction([
      prisma.vote.delete({ where: { id: existing.id } }),
      prisma.submission.update({ where: { id: req.params.submissionId }, data: { voteCount: { decrement: 1 } } }),
    ]);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

votesRouter.get("/:submissionId/mine", requireAuth, async (req, res, next) => {
  try {
    const existing = await prisma.vote.findUnique({
      where: { submissionId_userId: { submissionId: req.params.submissionId, userId: req.userId! } },
    });
    res.json({ voted: Boolean(existing) });
  } catch (err) {
    next(err);
  }
});
