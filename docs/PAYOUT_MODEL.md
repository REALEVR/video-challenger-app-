# Payout Model

This is the "get paid based on views, like YouTube" mechanic, spelled out.

## The pool, not per-view ad rates

Clashreel does **not** try to replicate YouTube's ad-revenue-per-1000-views
model (that requires an ads marketplace, a lot of fraud infrastructure, and
regulatory overhead far beyond an MVP). Instead, each **challenge** has a
fixed **prize pool** (set by whoever creates the challenge — could be a
brand, a community organizer, or a creator crowdfunding their own contest),
and that pool is split among the approved submissions in proportion to
their share of the challenge's total views and/or votes.

This is simpler to reason about, impossible to pay out more than was
funded, and still delivers the core promise: the creators who pull the
most attention earn the most money.

## The three split models (`Challenge.payoutModel`)

- **VIEWS** — `submission.viewCount / totalViewsInChallenge`. Purest
  "paid like YouTube" analog.
- **VOTES** — `submission.voteCount / totalVotesInChallenge`. Rewards
  quality/preference over raw reach — harder to game with bot traffic that
  can watch but can't easily register accounts to vote.
- **HYBRID** — the average of the two shares above. Good default for
  contests that want both reach and audience approval to matter.

See `computeChallengePayouts()` in `server/src/lib/payout.ts` for the exact
implementation, including:

- **`minViewsForPayout`** — a per-challenge floor. Submissions below it are
  excluded from the split entirely, so a single stray view can't "win" an
  otherwise-empty challenge.
- **Rounding** — amounts are floored to whole cents per submission, and any
  leftover remainder from that flooring goes to the top-earning
  submission, so the full pool is always allocated and never over-paid.

## Lifecycle

```
DRAFT → OPEN → VOTING → CLOSED → PAID
```

- **OPEN**: accepting submissions (until `submissionDeadline`).
- **VOTING**: submissions closed; the public can still watch and vote
  (until `votingDeadline`).
- **CLOSED**: the creator has called `compute-payouts` — shares are
  computed from views/votes at that moment and locked in as `Payout` rows
  with status `PENDING`.
- **PAID**: every payout has been disbursed (or `SIMULATED`/`FAILED`).

Recomputing payouts (calling `compute-payouts` again) is safe — it's an
upsert keyed on submission, so it just recalculates from current numbers.
Disbursement, once `PAID`, does not undo itself.

## Disbursement: real money vs. simulated

`server/src/lib/stripe.ts` wraps Stripe Connect (Express accounts +
`transfers`). If `STRIPE_SECRET_KEY` is unset, or a creator hasn't
connected a payout account yet, `disburseChallengePayouts()` marks that
payout `SIMULATED` instead of `PAID` — the computed amount is still
recorded and shown in the UI, so the whole product loop is demoable and
testable without a live Stripe account or moving real money.

To go live:

1. Set `STRIPE_SECRET_KEY` on the server (a Stripe platform account with
   Connect enabled).
2. Creators click "Connect payout account" on their profile — this hits
   `POST /api/users/me/stripe/onboard`, which creates a Stripe Express
   account and redirects to Stripe's hosted onboarding.
3. Once onboarded, future `disburse-payouts` calls create real `transfers`
   to that creator's connected account.

Stripe Connect handles KYC, tax forms, and payout methods per-country —
this app deliberately does not reimplement any of that.

## Anti-fraud notes (MVP-level, not production-hardened)

- **Votes**: one per (submission, user) at the DB level. Bounded by "how
  cheap is it to create accounts," which is the same bound every free-tier
  voting platform has. Add email verification, CAPTCHA on registration, or
  per-IP rate limits on `/api/auth/register` before running a
  real-money contest at scale.
- **Views**: deduped per (submission, viewer) within a rolling window
  (12h). This stops naive refresh-spam but not a distributed botnet — a
  production deployment should add device fingerprinting, IP reputation
  checks, and anomaly detection (e.g. flag submissions whose view curve
  spikes implausibly) before trusting view counts with real payouts.
- **Submissions**: auto-approved by default (`Submission.status`). Flip the
  default to `PENDING` and add a moderation queue/route before opening a
  challenge to the public, especially one with real prize money attached.

See `docs/LEGAL_AND_TRUST_SAFETY.md` for the non-technical side of this.
