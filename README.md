# Clashreel — Global Video Challenge Platform

Upload a short video into a challenge. Anyone in the world watches and
votes — no login needed to browse, just to vote. When voting closes, the
prize pool is split automatically among the entries based on their share
of views and/or votes, and creators cash out through Stripe Connect.

Think: TikTok's vertical video feed + upload flow, YouTube's
"get-paid-by-views" creator economics, Instagram-style profiles, and
global, open voting — as one small, working app.

## Features

- 📤 **Upload** — any logged-in user can start a challenge or submit a
  video entry to one (MP4/MOV/WebM/MKV).
- 🌍 **Global voting** — anyone with a free account can vote once per
  entry, from anywhere. Browsing and watching needs no account at all.
- 👀 **View tracking** — TikTok-style autoplay feed with deduped view
  counting (per viewer, per cooldown window — not spammable by refreshing).
- 🏆 **Leaderboards** — every challenge has a live-ranked entries table.
- 💰 **Payouts by views (or votes, or both)** — when a challenge's voting
  window closes, its prize pool splits proportionally among entries based
  on the payout model the creator chose. See
  [`docs/PAYOUT_MODEL.md`](docs/PAYOUT_MODEL.md) for the exact math.
- 💳 **Real or simulated payouts** — Stripe Connect for real money; runs in
  a clearly-labeled `SIMULATED` mode with no Stripe account configured, so
  the whole loop is demoable out of the box.

## Stack

- **Server**: Node.js, Express, TypeScript, Prisma, Postgres
  (Neon free tier for hosted trials — see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)),
  JWT auth, Multer for uploads, Stripe Connect for payouts.
- **Client**: React, Vite, TypeScript, Tailwind CSS, React Router.

## Quick start

Requires Node.js 18+.

```bash
npm install                 # installs both workspaces (server + client)

cp server/.env.example server/.env
cp client/.env.example client/.env

# Needs a running Postgres. Quickest: docker compose up -d db
npm run db:migrate          # applies the schema to $DATABASE_URL
npm run db:seed             # seeds two creators, a viewer, and a sample challenge

npm run dev                 # runs the API (:4000) and the client (:5173) together
```

Open http://localhost:5173. Log in with a seeded account
(`maya@example.com` / `kofi@example.com` / `viewer@example.com`, password
`password123` for all three) or register a new one.

### Run with Docker instead

```bash
docker compose up --build
```

This builds the server (Node, runs `prisma migrate deploy` on boot) and
the client (built as static assets, served by nginx, which proxies
`/api` and `/uploads` through to the server — mirroring the dev-time Vite
proxy). Open http://localhost:8080. Postgres runs as its own `db` service
(the server waits on its healthcheck before migrating); the database persists
in the `db-data` volume and uploaded videos in `server-data`, across restarts.
Set `JWT_SECRET`, `STRIPE_SECRET_KEY`, etc. via a `.env` file next to
`docker-compose.yml` or as shell env vars — see the `environment:` block
in that file for what it reads.

> Note: the Dockerfiles and compose setup were validated by running their
> underlying npm/prisma commands directly (they're the same build/start
> steps this README uses locally, and CI runs them too — see
> `.github/workflows/ci.yml`), but `docker build`/`docker compose up`
> themselves could not be executed in the environment this was built in.
> Sanity-check the images build cleanly before relying on them.

### Try the full loop

1. Log in, click **Start a Challenge**, set a small prize pool (e.g. $10)
   and short deadlines.
2. Submit a video entry (any short MP4 works) from a second account.
3. Log in as a third account and vote for it / watch it to rack up views.
4. As the challenge creator, click **Close submissions, start voting**,
   then **End voting & compute payouts** on the challenge page.
5. You're taken to the payouts page — each entry's computed share and
   dollar amount is shown. Click **Disburse** to mark them paid (this runs
   in `SIMULATED` mode unless you've configured Stripe — see below).

### Enabling real payouts

Set `STRIPE_SECRET_KEY` in `server/.env` (a Stripe account with Connect
enabled). Creators then connect a payout account from their profile page
before a challenge pays out for real. Details in
[`docs/PAYOUT_MODEL.md`](docs/PAYOUT_MODEL.md).

## Project layout

```
server/   Express API, Prisma schema, payout engine, Stripe integration
client/   React app — feed, challenges, upload, voting, payouts
docs/     Architecture, payout math, and legal/trust-safety notes
```

## Known dev-only dependency advisory

`npm audit` on the client flags a moderate esbuild advisory
(GHSA-67mh-4wv8-2f99) bundled inside Vite's dev server (fixed only in Vite
8, a breaking major bump not taken here yet). It only affects `npm run
dev` — a page you visit while the dev server is running could make
requests to it — not the production build output. Vite's dev server binds
to localhost by default, which already limits exposure; avoid running
`vite --host` on an untrusted network until this is upgraded.

## Before you take this to production

Read [`docs/LEGAL_AND_TRUST_SAFETY.md`](docs/LEGAL_AND_TRUST_SAFETY.md) —
paying people based on public votes/views touches contest law, KYC/AML,
minors, and content-moderation obligations that this MVP does not solve
for you. It's written so you know exactly what's still open before you
launch with real money and a public audience.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Runs server + client together |
| `npm run dev:server` / `npm run dev:client` | Run just one side |
| `npm run build` | Production build of both |
| `npm run db:migrate` | Apply Prisma migrations (server) |
| `npm run db:seed` | Seed demo data (server) |
| `npm run db:studio` | Open Prisma Studio to browse the DB |
