import fs from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import { env } from "./env";

if (!fs.existsSync(env.uploadDir)) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

const ALLOWED_MIME = new Set([
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp4";
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

export const uploadVideo = multer({
  storage,
  limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      cb(new Error("Unsupported video format. Use mp4, mov, webm, or mkv."));
      return;
    }
    cb(null, true);
  },
});

export function publicUploadUrl(filename: string): string {
  return `/uploads/${filename}`;
}
