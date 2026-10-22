import fs from "fs";
import path from "path";
import { env } from "./env";

/**
 * Demo videos bundled with the repo (server/prisma/sample-media, copied into
 * the runtime image alongside the Prisma schema). The seeded submissions point
 * at these, so a fresh deploy — or an empty volume — still has a playable feed.
 *
 * `sample-placeholder.mp4` is the name older seeds used; databases seeded
 * before this file existed reference it, so it is provided too.
 */
const SAMPLES: Record<string, string> = {
  "sample-1.mp4": "sample-1.mp4",
  "sample-2.mp4": "sample-2.mp4",
  "sample-placeholder.mp4": "sample-1.mp4",
};

export const SAMPLE_VIDEO_URLS = ["/uploads/sample-1.mp4", "/uploads/sample-2.mp4"] as const;

/** Copy any missing demo videos into UPLOAD_DIR. Never overwrites existing files. */
export function ensureSampleMedia(sourceDir = path.resolve(process.cwd(), "prisma/sample-media")): void {
  if (!fs.existsSync(sourceDir)) return;
  fs.mkdirSync(env.uploadDir, { recursive: true });
  for (const [target, source] of Object.entries(SAMPLES)) {
    const dest = path.join(env.uploadDir, target);
    const src = path.join(sourceDir, source);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      try {
        fs.copyFileSync(src, dest);
      } catch (err) {
        // A missing demo video must never stop the API from booting.
        console.warn(`Could not provision sample video ${target}:`, (err as Error).message);
      }
    }
  }
}
