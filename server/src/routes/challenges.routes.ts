import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireAuth, requireChallengeOwner } from "../middleware/auth.middleware";
import { computeChallengePayouts, disburseChallengePayouts } from "../lib/payout";
import { stripeEnabled } from "../lib/stripe";

export const challengesRouter = Router();

const listQuerySchema = z.object({
  status: z.string().optional(),
  category: z.string().optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

/**
 * Filtered, searched, paginated challenge listing.
 *
 * The `q` search is done in application code rather than a SQL `contains`
 * because SQLite's default collation is case-sensitive and Prisma's
 * `mode: "insensitive"` option only applies to Postgres/MongoDB — matching
 * this way keeps search behavior correct (and identical) regardless of
 * which database is behind it. Fine at MVP scale; move to Postgres full-text
 * search (or at least DB-level filtering) before this list gets large.
 */
challengesRouter.get("/", async (req, res, next) => {
  try {
    const { status, category, q, page, pageSize } = listQuerySchema.parse(req.query);

    const all = await prisma.challenge.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(category ? { category } : {}),
      },
      include: {
        createdBy: { select: { id: true, displayName: true } },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const categories = Array.from(new Set(all.map((c) => c.category).filter((c): c is string => Boolean(c)))).sort();

    const filtered = q
      ? all.filter((c) => {
          const needle = q.toLowerCase();
          return (
            c.title.toLowerCase().includes(needle) ||
            c.description.toLowerCase().includes(needle) ||
            (c.category ?? "").toLowerCase().includes(needle)
          );
        })
      : all;

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    res.json({ items, total, page, pageSize, categories });
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
          include: {
            user: { select: { id: true, displayName: true, avatarUrl: true } },
            _count: { select: { comments: true } },
          },
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

// Manual transitions a creator may make. CLOSED and PAID are reached only
// through compute-payouts / disburse-payouts, and nothing moves backwards:
// re-opening a CLOSED/PAID challenge would re-open voting on results that
// payouts were already computed (or paid) from.
const MANUAL_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["VOTING"],
};

/** Manual status transitions (e.g. creator closes submissions to move to VOTING). */
challengesRouter.patch("/:id/status", requireAuth, requireChallengeOwner, async (req, res, next) => {
  try {
    const { status } = updateStatusSchema.parse(req.body);
    const current = (req as any).challenge.status as string;
    if (!(MANUAL_TRANSITIONS[current] ?? []).includes(status)) {
      return res.status(400).json({ error: `A ${current} challenge can't be moved to ${status}.` });
    }
    // Conditional update so two racing requests can't both transition.
    const { count } = await prisma.challenge.updateMany({ where: { id: req.params.id, status: current }, data: { status } });
    if (count === 0) return res.status(409).json({ error: "The challenge changed in the meantime. Reload and try again." });
    res.json(await prisma.challenge.findUniqueOrThrow({ where: { id: req.params.id } }));
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

/**
 * Disburses (or simulates, if Stripe isn't configured) every computed payout.
 *
 * With real Stripe, transfers come out of the PLATFORM's balance — prize pools
 * are just a number the creator typed, nothing is escrowed. So while Stripe is
 * live only an ADMIN may release money; otherwise any account could create a
 * challenge with a huge pool and pay it to itself.
 */
challengesRouter.post("/:id/disburse-payouts", requireAuth, requireChallengeOwner, async (req, res, next) => {
  try {
    if (stripeEnabled && req.userRole !== "ADMIN") {
      return res.status(403).json({ error: "Real payouts must be released by a platform admin." });
    }
    const payouts = await disburseChallengePayouts(req.params.id);
    res.json(payouts);
  } catch (err) {
    next(err);
  }
});
