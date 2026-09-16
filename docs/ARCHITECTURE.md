# Architecture

## Overview

Clashreel is a two-service app:

```
client/   React + Vite + TypeScript + Tailwind    (port 5173 in dev)
server/   Express + TypeScript + Prisma + Postgres (port 4000)
```

In dev, Vite proxies `/api/*` and `/uploads/*` to the Express server (see
`client/vite.config.ts`), so the browser only ever talks to one origin. In
production you can either keep them behind one reverse proxy (nginx, Caddy,
a platform's built-in router) the same way, or point `VITE_API_BASE_URL` at
a separately-hosted API.

## Why Postgres for the data store

The schema (`server/prisma/schema.prisma`) is plain Prisma models with no
engine-specific tricks. It was authored against SQLite for zero-config local
runs, then moved to Postgres — and the move cost exactly one line, as designed:

```prisma
datasource db {
  provider = "postgresql"   // was "sqlite"
  url      = env("DATABASE_URL")
}
```

No model, field or index changed. The existing SQLite migrations could not
come along — their DDL is SQLite dialect — so they were replaced with a single
Postgres baseline (`20260913000000_init_postgres`): 7 tables, 6 indexes, 12
foreign keys.

One artefact of the SQLite origin remains on purpose. SQLite has no native
enum, so the "enum" columns are `String`, constrained by zod validation in the
routes and the union types in `server/src/types.ts` / `client/src/types.ts`.
Postgres *does* have real enums, so these could be promoted — but that needs a
data migration for existing rows, which stops being free the moment a
deployment has data. Left as strings deliberately; revisit when the schema is
otherwise settled.

Hosted deployments use a Neon free-tier project. See `docs/DEPLOYMENT.md` —
including why the API does not run on Vercel serverless (200 MB video uploads
need a real disk).

## Data model

- **User** — one account type; the `role` string (`VIEWER` / `CREATOR` /
  `ADMIN`) is informational for now. Anyone can create a challenge, upload
  a submission, or vote — there's no separate "creator application" step in
  the MVP.
- **Challenge** — a contest with a prize pool, a payout model, and two
  deadlines (submissions close, then voting closes).
- **Submission** — one video entry into one challenge, with denormalized
  `viewCount` / `voteCount` counters kept in sync transactionally.
- **Vote** — one row per (submission, user), enforced unique at the DB
  level. This is the actual anti-ballot-stuffing mechanism: a "vote" is
  really "this account voted," and accounts are free but require an email.
- **View** — one row per (submission, viewer) per dedupe window (12h by
  default — see `server/src/routes/views.routes.ts`). Anonymous viewers get
  a random httpOnly cookie on first visit; no personal data is collected
  for them.
- **Payout** — one row per (challenge, submission), computed by
  `server/src/lib/payout.ts` and disbursed (or simulated) by the same file.

## Request flow for the core loop

1. `POST /api/challenges` — creator sets a prize pool, a payout model
   (views / votes / hybrid), and two deadlines.
2. `POST /api/submissions` (multipart, `multer`) — creators upload video
   files while the challenge is `OPEN`. Files land in `server/uploads/` and
   are served statically from `/uploads/:filename`. Swap this for S3 /
   Cloudflare R2 / Mux in production — see "Scaling the video pipeline"
   below.
3. `POST /api/views/:submissionId` — fired by the client's
   `IntersectionObserver` when a video scrolls into view and starts
   playing. Deduped server-side.
4. `POST /api/votes/:submissionId` — any logged-in user, anywhere, once
   per submission.
5. Creator flips the challenge to `VOTING` (`PATCH .../status`), then to
   `CLOSED` via `POST /api/challenges/:id/compute-payouts`, which computes
   each submission's share of the pool (see `docs/PAYOUT_MODEL.md`).
6. `POST /api/challenges/:id/disburse-payouts` pays out via Stripe Connect
   if configured, or marks payouts `SIMULATED` otherwise.

## Scaling the video pipeline

The MVP stores uploaded files on local disk and serves them with
`express.static`. That's fine for a demo; for real traffic you'll want:

- **Object storage** (S3 / R2 / GCS) instead of local disk — swap
  `multer.diskStorage` for `multer-s3` or a presigned-upload flow in
  `server/src/lib/upload.ts`.
- **A CDN in front of video files** — view latency matters a lot for
  retention.
- **Transcoding** (Mux, Cloudflare Stream, or your own ffmpeg workers) to
  produce adaptive-bitrate renditions instead of serving the raw upload.
- **Async processing** for anything slow (transcode, thumbnail
  generation, moderation) via a queue, rather than doing it inline in the
  upload request.

## Auth

Simple email/password + JWT in an httpOnly cookie (`server/src/lib/auth.ts`).
No OAuth/social login in the MVP — add it as another `/api/auth/*` route
that issues the same JWT shape if you need it.
