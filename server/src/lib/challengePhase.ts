import { CHALLENGE_STATUSES, type ChallengeStatus } from "../types";

/**
 * Where a challenge actually is in its lifecycle, right now.
 *
 * The stored `status` alone doesn't answer that. Moving OPEN → VOTING is a
 * manual click by the creator, and nothing moves a challenge on when its
 * deadlines pass. So a challenge can say OPEN hours after submissions closed,
 * while votes.routes is (correctly) already accepting votes on it. Clients that
 * branch on `status` then show "Submit" buttons that the server will refuse.
 *
 * `phase` combines the stored status with the clock so every client sees the
 * same answer the routes enforce:
 *
 *   DRAFT             not public yet
 *   SUBMISSIONS_OPEN  OPEN and at/before submissionDeadline
 *   VOTING_OPEN       VOTING, or OPEN past submissionDeadline, at/before votingDeadline
 *   AWAITING_RESULTS  voting has ended but payouts haven't been computed (→ CLOSED)
 *   CLOSED / PAID     terminal; reached only through the payout endpoints
 *
 * Deadlines are inclusive, matching submissions.routes (`now > deadline` is
 * the rejection) and votes.routes (`now <= votingDeadline` is the acceptance).
 *
 * This is derived on read rather than written back by a scheduler on purpose:
 * it needs no cron, can't drift from the clock, and leaves `status` meaning
 * "what the creator/admin has done", which the transition rules depend on.
 */
export type ChallengePhase =
  | "DRAFT"
  | "SUBMISSIONS_OPEN"
  | "VOTING_OPEN"
  | "AWAITING_RESULTS"
  | "CLOSED"
  | "PAID";

type PhaseInput = {
  status: string;
  submissionDeadline: Date | string;
  votingDeadline: Date | string;
};

function toTime(value: Date | string): number {
  const ms = new Date(value).getTime();
  // An Invalid Date compares false against everything, which would make every
  // deadline look "not passed yet". That's a data bug, so surface it.
  if (Number.isNaN(ms)) throw new Error(`Invalid challenge deadline: ${String(value)}`);
  return ms;
}

function isChallengeStatus(value: string): value is ChallengeStatus {
  return (CHALLENGE_STATUSES as readonly string[]).includes(value);
}

export function challengePhase(challenge: PhaseInput, now: Date = new Date()): ChallengePhase {
  const { status } = challenge;
  if (!isChallengeStatus(status)) throw new Error(`Unknown challenge status: ${status}`);
  if (status === "DRAFT" || status === "CLOSED" || status === "PAID") return status;

  const t = now.getTime();
  if (t > toTime(challenge.votingDeadline)) return "AWAITING_RESULTS";
  if (status === "VOTING") return "VOTING_OPEN";
  return t > toTime(challenge.submissionDeadline) ? "VOTING_OPEN" : "SUBMISSIONS_OPEN";
}

/** Attach `phase` to a challenge-shaped object without mutating it. */
export function withPhase<T extends PhaseInput>(challenge: T, now: Date = new Date()): T & { phase: ChallengePhase } {
  return { ...challenge, phase: challengePhase(challenge, now) };
}
