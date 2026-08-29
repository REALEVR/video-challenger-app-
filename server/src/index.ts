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

const app = express();

// Trust the first proxy hop (reverse proxy / platform load balancer) so
// express-rate-limit and secure cookies see the real client IP/protocol
// instead of the proxy's.
app.set("trust proxy", 1);

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
app.use(express.json());
app.use(attachUser);

app.use("/uploads", express.static(env.uploadDir));

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
