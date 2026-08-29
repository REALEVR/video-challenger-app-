import type { Request, Response, NextFunction } from "express";
import type { Role } from "../types";
import { tokenFromRequest, verifyToken } from "../lib/auth";
import { prisma } from "../lib/prisma";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
      userRole?: Role;
    }
  }
}

/** Attaches req.userId/userRole if a valid token is present; never blocks the request. */
export async function attachUser(req: Request, _res: Response, next: NextFunction) {
  const token = tokenFromRequest(req);
  if (token) {
    const payload = verifyToken(token);
    if (payload) {
      req.userId = payload.sub;
      req.userRole = payload.role;
    }
  }
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.userId) {
    return res.status(401).json({ error: "Authentication required." });
  }
  next();
}

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userId || !req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: "You do not have permission to do that." });
    }
    next();
  };
}

/** Challenge creator OR admin. Loads the challenge and stashes it on req for the handler. */
export async function requireChallengeOwner(req: Request, res: Response, next: NextFunction) {
  const challenge = await prisma.challenge.findUnique({ where: { id: req.params.id ?? req.params.challengeId } });
  if (!challenge) return res.status(404).json({ error: "Challenge not found." });
  if (challenge.createdById !== req.userId && req.userRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the challenge creator can do that." });
  }
  (req as any).challenge = challenge;
  next();
}
