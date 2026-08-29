import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "./env";
import type { Role } from "../types";

export interface AuthTokenPayload {
  sub: string; // userId
  role: Role;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "30d" });
}

export function verifyToken(token: string): AuthTokenPayload | null {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  } catch {
    return null;
  }
}

const AUTH_COOKIE = "vc_token";
export const AUTH_COOKIE_NAME = AUTH_COOKIE;

export function tokenFromRequest(req: {
  cookies?: Record<string, string>;
  headers: { authorization?: string };
}): string | null {
  const bearer = req.headers.authorization;
  if (bearer?.startsWith("Bearer ")) return bearer.slice(7);
  if (req.cookies?.[AUTH_COOKIE]) return req.cookies[AUTH_COOKIE];
  return null;
}
