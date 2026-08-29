import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { hashPassword, verifyPassword, signToken, AUTH_COOKIE_NAME } from "../lib/auth";
import { requireAuth } from "../middleware/auth.middleware";
import type { Role } from "../types";

export const authRouter = Router();

const COOKIE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters."),
  displayName: z.string().min(2).max(40),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const { email, password, displayName } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "An account with that email already exists." });
    }

    const user = await prisma.user.create({
      data: { email, displayName, passwordHash: await hashPassword(password) },
    });

    const token = signToken({ sub: user.id, role: user.role as Role });
    res.cookie(AUTH_COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE_MS });
    res.status(201).json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return res.status(401).json({ error: "Invalid email or password." });
    }
    const token = signToken({ sub: user.id, role: user.role as Role });
    res.cookie(AUTH_COOKIE_NAME, token, { httpOnly: true, sameSite: "lax", maxAge: COOKIE_MAX_AGE_MS });
    res.json({
      token,
      user: { id: user.id, email: user.email, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      hasStripeAccount: Boolean(user.stripeAccountId),
    });
  } catch (err) {
    next(err);
  }
});
