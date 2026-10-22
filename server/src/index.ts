import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "./lib/env";
import { attachUser } from "./middleware/auth.middleware";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { challengesRouter } from "./routes/challenges.routes";
import { submissionsRouter } from "./routes/submissions.routes";
import { votesRouter } from "./routes/votes.routes";
import { viewsRouter } from "./routes/views.routes";
import { payoutsRouter } from "./routes/payouts.routes";
import { commentsRouter } from "./routes/comments.routes";
import { stripeEnabled } from "./lib/stripe";
import { SERVABLE_UPLOAD_EXTENSIONS } from "./lib/upload";
import { ensureSampleMedia } from "./lib/sampleMedia";
import path from "path";

const app = express();

// Trust the platform's proxy hops so express-rate-limit and secure cookies see
// the real client IP/protocol instead of the proxy's. Defaults to 1 hop; set
// TRUST_PROXY=2 when the API sits behind both Vercel's rewrite and Railway's
// edge (see docs/DEPLOYMENT.md).
app.set("trust proxy", env.trustProxy);

app.use(
  helmet({
    // This is a JSON API + static video server, not an HTML app — a
    // default CSP has nothing useful to restrict here and only risks
    // breaking cross-origin video playback in production.
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);
app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: "100kb" }));
app.use(attachUser);

ensureSampleMedia();

// Only ever serve media types from /uploads. Files written before upload
// extensions were derived from the MIME type could have any extension
// (e.g. .html/.svg), and serving those same-origin would be stored XSS.
app.use(
  "/uploads",
  (req, res, next) => {
    if (!SERVABLE_UPLOAD_EXTENSIONS.has(path.extname(req.path).toLowerCase())) {
      return res.status(404).json({ error: "Not found." });
    }
    next();
  },
  express.static(env.uploadDir, { dotfiles: "deny", index: false, maxAge: "7d", immutable: true })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, stripeEnabled, time: new Date().toISOString() });
});

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/challenges", challengesRouter);
app.use("/api/submissions", submissionsRouter);
app.use("/api/votes", votesRouter);
app.use("/api/views", viewsRouter);
app.use("/api/payouts", payoutsRouter);
app.use("/api/comments", commentsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

app.listen(env.port, () => {
  console.log(`Video Challenger API listening on http://localhost:${env.port}`);
  console.log(`Stripe payouts: ${stripeEnabled ? "LIVE (Connect configured)" : "SIMULATED (no STRIPE_SECRET_KEY set)"}`);
});
