import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth.middleware";
import { uploadVideo, publicUploadUrl, saveThumbnailFromDataUrl, discardUpload } from "../lib/upload";
import { uploadLimiter } from "../lib/rateLimit";

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
