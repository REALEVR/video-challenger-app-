# Deployment — free-tier trial runs

Goal: a live URL you can open to watch the product develop, at no cost, with
no risk to anything in production.

## What runs where, and why

| Piece | Host | Why |
|---|---|---|
| `client/` | **Vercel** | Static Vite SPA. Exactly what Vercel is best at. |
| Database | **Neon** free tier | Serverless Postgres, generous free project. |
| `server/` | **Render / Railway / Fly** free tier | *Not Vercel.* See below. |

### Why the API is not on Vercel

This is a deliberate choice, not an oversight. `server/src/lib/upload.ts`
accepts video files up to `MAX_UPLOAD_MB` (default **200 MB**) and writes them
to a local directory with `multer.diskStorage`. Vercel's serverless runtime
breaks that in two independent ways:

1. **Request body cap.** Serverless functions reject bodies over ~4.5 MB. A
   200 MB video upload cannot physically arrive.
2. **Ephemeral, read-only filesystem.** Only `/tmp` is writable, and it is
   discarded between invocations. A file written during one request is gone
   before anyone can play it back.

So the API belongs on a host with a real disk and long-lived processes. Render,
Railway and Fly all have free tiers that qualify.

**If you specifically want the API on Vercel too**, the upload path has to move
to object storage first — Vercel Blob's client-side `upload()` sends the file
straight from the browser to the blob store, so the 4.5 MB function limit never
applies. That is a real code change across `lib/upload.ts`,
`routes/submissions.routes.ts` and the client's upload form. Worth doing, but
it is a separate piece of work — not a config flag.

Everything except video upload works fine on Vercel serverless today.

## Database: SQLite → Postgres

Already done on this branch. For the record, what changed:

- `server/prisma/schema.prisma` — `provider = "sqlite"` → `"postgresql"`.
- `server/prisma/migrations/` — the two SQLite migrations were replaced with a
  single Postgres baseline (`20260913000000_init_postgres`). SQLite-dialect DDL
  cannot be applied to Postgres, so they could not be kept.
- `migration_lock.toml` — now records `postgresql`.

**No model, field or index changed.** The schema was authored to be portable
and it was: 7 tables, 6 indexes, 12 foreign keys, zero SQLite remnants.

One follow-up is deliberately *not* done: the enum-like `String` columns
(`role`, `status`, `payoutModel`) could become real Postgres enums. Left as
strings for now because promoting them needs a data migration, which stops
being free the moment a trial deployment has rows in it.

## Setup

### 1. Database (Neon)

Create a project at [neon.tech](https://neon.tech). Copy **both** connection
strings — you need the pooled one for the app and the direct one for migrations.

```bash
cd server
cp .env.example .env      # paste the POOLED url into DATABASE_URL

# Migrations need a session-mode (direct, non-pooled) connection:
DATABASE_URL="<DIRECT url>" npx prisma migrate deploy
npm run db:seed           # demo users + challenges, so the app isn't empty
```

The seed gives you working logins — e.g. `maya@example.com` / `password123`.
They are demo credentials on throwaway data; do not reuse them anywhere real.

### 2. API

Deploy `server/` to Render/Railway/Fly. Root directory `server`, build
`npm install && npm run build`, start `npm start`. Set every variable from
`server/.env.example`, with:

- `DATABASE_URL` — the **pooled** Neon URL
- `JWT_SECRET` — `openssl rand -base64 32`, not the placeholder
- `CLIENT_ORIGIN` — your Vercel URL, or CORS will block the browser

#### On Railway (what the trial deploy uses)

Build from the **repo root** with `server/Dockerfile`; it's an npm workspaces
monorepo, so a `server`-only root loses the lockfile. Then:

- **Volume** at `/data`, with `UPLOAD_DIR=/data/uploads`. Without it, every
  redeploy wipes uploaded videos. (Railway refuses a Dockerfile `VOLUME`
  instruction, which is why the Dockerfile doesn't declare one.)
- **Pre-deploy command**:
  `sh -c "npx prisma migrate deploy && npx tsx prisma/seed.ts"`.
  Dockerfile services run it without a shell, so a bare `a && b` silently
  runs only `a`: the `sh -c` is what makes the second half happen. The seed
  is all upserts, so re-running it on every deploy is harmless. Drop it once
  real users exist.
- **Start command**: `node dist/index.js`. **Healthcheck**: `/api/health`.
- `DATABASE_URL` may point several apps at one Postgres by giving each its
  own schema, e.g. `${{Postgres.DATABASE_URL}}?schema=clashreel`.

### 3. Client (Vercel)

Import the repo, set **root directory to `client`**. `client/vercel.json`
handles the rest — the rewrite is what stops a refresh on `/challenges/123`
returning a 404 instead of the app.

`client/vercel.json` also proxies `/api/*` and `/uploads/*` to the API, so
the browser only ever talks to the Vercel origin. That matters: auth uses a
`SameSite=Lax` cookie, and a `*.vercel.app` page calling a `*.up.railway.app`
API is cross-site, so the browser would never send the cookie and every login
would look like it silently failed. Same-origin through the proxy avoids that
without loosening the cookie.

Point the two proxy destinations at your API's host, and leave
`VITE_API_BASE_URL` **unset** so requests stay relative. (The trial deploy
points at `clashreel-api-production.up.railway.app`.)

## Trial-run caveats

- **Free Neon projects sleep** when idle. The first request after a pause takes
  a few seconds to wake the compute. Not a bug.
- **Stripe stays in simulation** while `STRIPE_SECRET_KEY` is blank — payouts
  compute and display without moving money. That is the right setting for a
  trial.
- **Seeded data is fake.** Nothing here reflects real users, real videos, or
  real money.
