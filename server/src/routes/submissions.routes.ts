import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { shouldAutoHide } from "../lib/moderation";
import { REPORT_REASONS } from "../types";
import { uploadVideo, publicUploadUrl, saveThumbnailFromDataUrl, discardUpload } from "../lib/upload";
import { reportLimiter, uploadLimiter } from "../lib/rateLimit";

export const submissionsRouter = Router();

const submitSchema = z.object({
  challengeId: z.string(),
  caption: z.string().max(500).optional(),
  thumbnailDataUrl: z.string().optional(),
});

submissionsRouter.post("/", requireAuth, uploadLimiter, uploadVideo.single("video"), async (req, res, next) => {
  // Multer has already written the video to disk by the time this runs, so
  // every early return below must delete it — otherwise rejected uploads
  // (closed challenge, bad id, validation error) pile up on the volume.
  let created = false;
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request.", details: parsed.error.flatten() });
    }
    const { challengeId, caption, thumbnailDataUrl } = parsed.data;
    if (!req.file) {
      return res.status(400).json({ error: "A video file is required." });
    }

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) return res.status(404).json({ error: "Challenge not found." });
    if (challenge.status !== "OPEN") {
      return res.status(400).json({ error: "This challenge is not currently accepting submissions." });
    }
    if (new Date() > challenge.submissionDeadline) {
      return res.status(400).json({ error: "The submission deadline for this challenge has passed." });
    }

    const submission = await prisma.submission.create({
      data: {
        challengeId,
        userId: req.userId!,
        caption: caption?.trim() || undefined,
        videoUrl: publicUploadUrl(req.file.filename),
        thumbnailUrl: saveThumbnailFromDataUrl(thumbnailDataUrl),
      },
    });
    created = true;
    res.status(201).json(submission);
  } catch (err) {
    next(err);
  } finally {
    if (!created) discardUpload(req.file);
  }
});

submissionsRouter.get("/:id", async (req, res, next) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, displayName: true, avatarUrl: true } },
        challenge: { select: { id: true, title: true, status: true } },
      },
    });
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    res.json(submission);
  } catch (err) {
    next(err);
  }
});

const reportSchema = z.object({
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(1000).optional(),
});

/**
 * Flag a submission for moderator review. Enough distinct reports (or one
 * minor-safety report) move it from APPROVED to PENDING, which drops it from
 * every public listing until an admin decides — see src/lib/moderation.ts.
 *
 * The response never says whether the submission was hidden, so a reporter
 * can't use it to probe how close a video is to the threshold.
 */
submissionsRouter.post("/:id/report", reportLimiter, requireAuth, async (req, res, next) => {
  try {
    const { reason, details } = reportSchema.parse(req.body);
    const submission = await prisma.submission.findUnique({ where: { id: req.params.id } });
    if (!submission) return res.status(404).json({ error: "Submission not found." });
    if (submission.userId === req.userId) {
      return res.status(400).json({ error: "You can't report your own submission." });
    }

    await prisma.$transaction(async (tx) => {
      await tx.submissionReport.create({
        data: { submissionId: submission.id, reporterId: req.userId!, reason, details: details || undefined },
      });
      const distinctReporters = await tx.submissionReport.count({ where: { submissionId: submission.id } });
      if (shouldAutoHide({ status: submission.status, distinctReporters, latestReason: reason })) {
        // Conditional update: if an admin changed the status since we read it,
        // their decision wins and this matches zero rows.
        await tx.submission.updateMany({
          where: { id: submission.id, status: "APPROVED" },
          data: { status: "PENDING" },
        });
      }
    });

    res.status(201).json({ reported: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({ error: "You've already reported this submission." });
    }
    next(err);
  }
});
