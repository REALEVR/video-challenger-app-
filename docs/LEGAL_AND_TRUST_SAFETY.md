# Legal & Trust/Safety — read before running this with real money

This is engineering-scoped guidance, not legal advice. Talk to an actual
lawyer in every jurisdiction you plan to operate in before running
real-money contests, especially ones open to global participants. A few
things that will matter and are **not** solved by this codebase:

## "Contest" vs. "lottery" / "gambling"

Paying people based on audience votes or views is generally treated as a
**skill contest**, not a game of chance — but the line depends on local
law, and requiring payment/purchase to enter (an "entry fee") can tip a
contest into sweepstakes/lottery regulation in many jurisdictions (notably
the US, where many states require a free "alternative method of entry" if
there's any fee or purchase requirement). This MVP has no entry fee by
design; if you add one, get legal review first.

## Money movement: KYC/AML, tax reporting, sanctions screening

Stripe Connect (used here) handles identity verification (KYC), basic
sanctions screening, and generates the relevant tax forms (e.g. 1099-K/NEC
in the US) for connected accounts in supported countries. That coverage is
why this app builds on Connect rather than moving money directly — do not
try to pay creators via a bank transfer/PayPal-style integration you wrote
yourself without independently solving all of that.

Paying a truly global audience means Stripe Connect's country coverage is
itself a real constraint — creators in countries Stripe (or your chosen
processor) doesn't support can win a challenge but can't be paid until you
add another payout rail for them. Decide up front how you'll handle that
gap (hold the balance, alternate processor, wire transfer with manual KYC)
rather than discovering it at payout time.

## Minors

Nothing here checks age. If minors can plausibly participate (very likely
for a TikTok-style video app), you need an age-gate and, in the US, COPPA
compliance for any user data collection from under-13s, plus
country-specific rules elsewhere (e.g. GDPR-K in the EU/UK). This is a
build-before-launch requirement, not a nice-to-have.

## Content moderation & liability

- **CSAM / illegal content**: any UGC video platform must have a
  moderation and reporting pipeline, and in the US, a designated agent
  registered with the Copyright Office (DMCA) and NCMEC CyberTipline
  reporting for any suspected CSAM. This MVP has a `status` field for
  moderation (`PENDING`/`APPROVED`/`REJECTED`) but ships with
  auto-approval on and no actual review pipeline — you must build one
  before accepting public uploads at scale.
- **Copyright**: users uploading dance/audio content set to popular music
  raises the same music-licensing questions TikTok/Reels solve with label
  deals. This app doesn't attempt that — assume anything with copyrighted
  audio is a takedown risk until you've addressed it.
- **Right of publicity / consent**: video of real people (especially
  minors, especially without consent) is a recurring UGC risk. Terms of
  Service should require uploaders to have the rights/consents needed.

## Voting integrity claims

Don't market this as "fraud-proof" or "one person, one vote" without the
production hardening described in `docs/PAYOUT_MODEL.md` — as shipped, the
anti-fraud bar is "requires a free account," which stops casual
ballot-stuffing but not a motivated bad actor. Overstating integrity to
participants who have real money riding on the outcome is itself a
liability (unfair/deceptive practices).

## What this repo does give you

- A clear, auditable payout computation (`docs/PAYOUT_MODEL.md`) — anyone
  can verify a payout was computed correctly from the recorded views/votes.
- A `SIMULATED` payout state so you can run the entire product loop, get
  user feedback, and validate the mechanic before a single real dollar
  moves.
- A moderation status field and vote/view dedup as a foundation to build
  the above on top of — not a substitute for doing it.
