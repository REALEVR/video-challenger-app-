import rateLimit from "express-rate-limit";

// Auth endpoints: the main lever against credential-stuffing and the
// "spin up N accounts to ballot-stuff" attack described in
// docs/PAYOUT_MODEL.md. Tight because a legitimate user rarely needs more
// than a couple of attempts per window.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

// Voting: one real vote per (submission, user) is already enforced at the
// DB level (see the Vote model's @@unique) — this just caps how fast any
// one client can hammer the endpoint.
export const voteLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're voting too fast. Please slow down." },
});

// Views: fires on every autoplay-into-view in the feed, so this needs
// headroom for a normal scrolling session while still bounding a script
// that just calls the endpoint in a loop.
export const viewLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many view events. Please slow down." },
});

// Comments: generous enough for a real conversation, tight enough to stop
// a script from flooding a submission's comment section.
export const commentLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're commenting too fast. Please slow down." },
});

// Uploads: bounded mostly by disk/bandwidth cost, not fraud.
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many uploads this hour. Please try again later." },
});
