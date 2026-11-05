/**
 * Pure ranking logic for a challenge leaderboard.
 *
 * The score mirrors how payouts are computed (see computeChallengePayouts in
 * ./payout.ts) so the public ranking never disagrees with who gets paid most:
 * VIEWS and VOTES rank by that metric alone, HYBRID by the average of a
 * submission's share of all views and share of all votes. Unknown models fall
 * back to VIEWS, as payout computation does.
 *
 * Ties use standard competition ranking (1, 1, 3): equal scores share a rank
 * and the next rank is skipped. The metric the model does not rank by only
 * orders rows within a shared rank; it never separates ranks.
 */

export interface RankableSubmission {
  id: string;
  viewCount: number;
  voteCount: number;
}

export type RankedSubmission<T extends RankableSubmission> = T & { rank: number; score: number };

/** Shares are float divisions, so mathematically equal scores can differ in the last bit. */
const SCORE_EPSILON = 1e-9;

export function rankSubmissions<T extends RankableSubmission>(
  submissions: readonly T[],
  payoutModel: string,
): RankedSubmission<T>[] {
  const totalViews = submissions.reduce((sum, s) => sum + s.viewCount, 0);
  const totalVotes = submissions.reduce((sum, s) => sum + s.voteCount, 0);

  const scoreOf = (s: T): number => {
    const viewShare = totalViews > 0 ? s.viewCount / totalViews : 0;
    const voteShare = totalVotes > 0 ? s.voteCount / totalVotes : 0;
    switch (payoutModel) {
      case "VOTES":
        return voteShare;
      case "HYBRID":
        return (viewShare + voteShare) / 2;
      case "VIEWS":
      default:
        return viewShare;
    }
  };

  // Secondary metric for tiebreaks: the one the model does NOT rank by.
  const tiebreak = (s: T): number => (payoutModel === "VOTES" ? s.viewCount : s.voteCount);

  const scored = submissions
    .map((s) => ({ s, score: scoreOf(s) }))
    .sort((a, b) => {
      const diff = b.score - a.score;
      return Math.abs(diff) > SCORE_EPSILON ? diff : tiebreak(b.s) - tiebreak(a.s);
    });

  let rank = 0;
  return scored.map(({ s, score }, i) => {
    const prev = scored[i - 1];
    const isTie = prev !== undefined && Math.abs(prev.score - score) <= SCORE_EPSILON;
    if (!isTie) rank = i + 1;
    return { ...s, rank, score };
  });
}
