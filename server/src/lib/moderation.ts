import type { ReportReason, SubmissionStatus } from "../types";

/**
 * Distinct reporters needed to pull an APPROVED submission out of public
 * listings and back into the PENDING review queue.
 *
 * Deliberately low: listings only show APPROVED submissions, so hiding is the
 * cheap, reversible action an admin can undo in one call. Set higher and a
 * genuinely harmful video stays in the feed for longer while nobody reviews it.
 */
export const AUTO_HIDE_REPORT_THRESHOLD = 3;

/**
 * Reasons serious enough that a single report hides the video pending review.
 * Leaving suspected child-safety content up until two more people also see it
 * is not an acceptable trade-off (see docs/LEGAL_AND_TRUST_SAFETY.md).
 */
export const IMMEDIATE_HIDE_REASONS: ReadonlySet<ReportReason> = new Set<ReportReason>(["MINOR_SAFETY"]);

export interface AutoHideInput {
  status: SubmissionStatus | string;
  distinctReporters: number;
  latestReason: ReportReason;
}

/**
 * Whether a newly-filed report should move the submission to PENDING.
 *
 * Only ever moves APPROVED -> PENDING. A submission an admin has already
 * REJECTED stays rejected, and one already PENDING has nothing to change —
 * so this can never be used to un-reject something.
 */
export function shouldAutoHide({ status, distinctReporters, latestReason }: AutoHideInput): boolean {
  if (status !== "APPROVED") return false;
  if (IMMEDIATE_HIDE_REASONS.has(latestReason)) return true;
  return distinctReporters >= AUTO_HIDE_REPORT_THRESHOLD;
}
