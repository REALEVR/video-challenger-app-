import { Router } from "express";
import crypto from "crypto";
import { prisma } from "../lib/prisma";

export const viewsRouter = Router();

const ANON_COOKIE = "vc_anon";
const DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000; // 12h: watching again later still counts, like real platforms

/**
 * Records a view from anyone — logged in or anonymous — but only counts it
 * once per viewer per dedupe window, so refreshing the page can't be used to
 * farm view-based payouts. Anonymous visitors are identified by a random,
 * httpOnly cookie issued on first visit (no personal data collected).
 */
viewsRouter.post("/:submissionId", async (req, res, next) => {
  try {
    const submission = await prisma.submission.findUnique({ where: { id: req.params.submissionId } });
    if (!submission) return res.status(404).json({ error: "Submission not found." });

    let anonId = req.cookies?.[ANON_COOKIE] as string | undefined;
    if (!req.userId && !anonId) {
      anonId = crypto.randomUUID();
      res.cookie(ANON_COOKIE, anonId, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 365 * 24 * 60 * 60 * 1000,
      });
    }
    const viewerKey = req.userId ?? anonId!;

    const recent = await prisma.view.findFirst({
      where: {
        submissionId: submission.id,
        viewerKey,
        createdAt: { gt: new Date(Date.now() - DEDUPE_WINDOW_MS) },
      },
    });

    if (recent) {
      return res.json({ counted: false, viewCount: submission.viewCount });
    }

    const [, updated] = await prisma.$transaction([
      prisma.view.create({ data: { submissionId: submission.id, viewerKey, userId: req.userId ?? null } }),
      prisma.submission.update({ where: { id: submission.id }, data: { viewCount: { increment: 1 } } }),
    ]);

    res.json({ counted: true, viewCount: updated.viewCount });
  } catch (err) {
    next(err);
  }
});
