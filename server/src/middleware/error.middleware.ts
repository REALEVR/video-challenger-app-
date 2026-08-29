import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { MulterError } from "multer";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: "Not found." });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request.", details: err.flatten() });
  }
  if (err instanceof MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof Error) {
    console.error(err);
    return res.status(500).json({ error: err.message || "Internal server error." });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
}
