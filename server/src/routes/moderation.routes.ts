import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/auth.middleware";

export const moderationRouter = Router();

// Every route here is admin-only.
moderationRouter.use(requireRole("ADMIN"));

const QUEUE_PAGE_SIZE = 50;

/**
 * The review queue: submissions that have at least one report, most-reported
 * first, with each report's reason so an admin can triage without opening
 * every video. Defaults to PENDING (i.e. already hidden) items.
 */
moderationRouter.get("/reports", async (req, res, next) => {
  try {
    const { status } = z
      .object({ status: z.enum(["PENDING", "APPROVED", "REJECTED"]).default("PENDING") })
      .parse(req.query);

    const submissions = await prisma.submission.findMany({
      where: { status, reports: { some: {} } },
      include: {
        user: { select: { id: true, displayName: true } },
        challenge: { select: { id: true, title: true } },
        reports: {
          select: { id: true, reason: true, details: true, createdAt: true, reporterId: true },
          orderBy: { createdAt: "desc" },
        },
        _count: { select: { reports: true } },
      },
      orderBy: { reports: { _count: "desc" } },
      take: QUEUE_PAGE_SIZE,
    });
    res.json(submissions);
  } catch (err) {
    next(err);
  }
});

const decisionSchema = z.object({ status: z.enum(["APPROVED", "REJECTED"]) });

/** Resolve a reported submission: restore it to the feed, or reject it. */
moderationRouter.patch("/submissions/:id", async (req, res, next) => {
  try {
    const { status } = decisionSchema.parse(req.body);
    const existing = await prisma.submission.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Submission not found." });

    const submission = await prisma.submission.update({ where: { id: existing.id }, data: { status } });
    res.json(submission);
  } catch (err) {
    next(err);
  }
});
