export type VotingWindow = { status: string; votingDeadline: Date };

export const VOTABLE_STATUSES = ["OPEN", "VOTING"] as const;

// Single definition of "can votes change right now?", shared by casting and
// withdrawing. `now` is injectable so the deadline boundary can be tested
// without faking timers.
export function isVotingOpen(challenge: VotingWindow | null, now: Date = new Date()): boolean {
  return Boolean(
    challenge &&
      (VOTABLE_STATUSES as readonly string[]).includes(challenge.status) &&
      now <= challenge.votingDeadline,
  );
}
