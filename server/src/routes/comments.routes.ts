import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { commentLimiter } from "../lib/rateLimit";

export const commentsRouter = Router();

commentsRouter.get("/:submissionId", async (req, res, next) => {
  try {
    const comments = await prisma.comment.findMany({
      where: { submissionId: req.params.submissionId },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    res.json(comments);
  } catch (err) {
    next(err);
  }
});

const createCommentSchema = z.object({
  body: z.string().trim().min(1, "Comment can't be empty.").max(500),
});

commentsRouter.post("/:submissionId", commentLimiter, requireAuth, async (req, res, next) => {
  try {
    const { body } = createCommentSchema.parse(req.body);
    const submission = await prisma.submission.findUnique({ where: { id: req.params.submissionId } });
    if (!submission) return res.status(404).json({ error: "Submission not found." });

    const comment = await prisma.comment.create({
      data: { submissionId: submission.id, userId: req.userId!, body },
      include: { user: { select: { id: true, displayName: true, avatarUrl: true } } },
    });
    res.status(201).json(comment);
  } catch (err) {
    next(err);
  }
});

commentsRouter.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const comment = await prisma.comment.findUnique({ where: { id: req.params.id } });
    if (!comment) return res.status(404).json({ error: "Comment not found." });
    if (comment.userId !== req.userId && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "You can only delete your own comments." });
    }
    await prisma.comment.delete({ where: { id: comment.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
