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
  limits: {
    fileSize: env.maxUploadMb * 1024 * 1024,
    // The thumbnail is sent as a base64 form field (see saveThumbnailFromDataUrl
    // below) alongside the video file — 3MB of base64 comfortably covers a
    // compressed JPEG frame while still bounding the payload.
    fieldSize: 3 * 1024 * 1024,
  },
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

const THUMBNAIL_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;

/**
 * Decodes a `data:image/...;base64,...` URL (captured client-side from a
 * frame of the uploaded video — see client/src/pages/UploadSubmission.tsx)
 * and writes it to disk. Returns the public URL, or null if the input is
 * missing, malformed, an unsupported type, or too large — a bad/missing
 * thumbnail should never fail the whole submission.
 */
export function saveThumbnailFromDataUrl(dataUrl: string | undefined): string | null {
  if (!dataUrl) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(dataUrl);
  if (!match) return null;

  const [, mime, base64] = match;
  const ext = THUMBNAIL_MIME_TO_EXT[mime];
  const buffer = Buffer.from(base64, "base64");
  if (buffer.byteLength === 0 || buffer.byteLength > MAX_THUMBNAIL_BYTES) return null;

  const filename = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(env.uploadDir, filename), buffer);
  return publicUploadUrl(filename);
}
