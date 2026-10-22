import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";
import { HttpError } from "../lib/httpError";
import { env } from "../lib/env";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found." });
}

const MULTER_MESSAGES: Partial<Record<MulterError["code"], string>> = {
  LIMIT_FILE_SIZE: `That video is too large. The limit is ${env.maxUploadMb}MB.`,
  LIMIT_FIELD_VALUE: "The thumbnail is too large.",
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request.", details: err.flatten() });
  }
  if (err instanceof MulterError) {
    return res.status(err.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: MULTER_MESSAGES[err.code] ?? err.message });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Body-parser errors (malformed JSON, oversized body) carry their own 4xx status.
  const status = (err as { status?: unknown })?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    return res.status(status).json({ error: "Invalid request body." });
  }
  console.error(err);
  // Unexpected errors can carry database/driver internals (Prisma messages
  // include query fragments and connection details), so only show them in dev.
  const message = !env.isProduction && err instanceof Error && err.message ? err.message : "Internal server error.";
  res.status(500).json({ error: message });
}
