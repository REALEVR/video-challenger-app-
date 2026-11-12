import { test } from "node:test";
import assert from "node:assert/strict";
import { challengePhase } from "../src/lib/challengePhase";

// Fixed clock: submissions close at noon, voting closes at 18:00.
const SUBMISSION_DEADLINE = new Date("2026-11-12T12:00:00Z");
const VOTING_DEADLINE = new Date("2026-11-12T18:00:00Z");
const BEFORE_SUBMISSIONS_CLOSE = new Date("2026-11-12T09:00:00Z");
const DURING_VOTING = new Date("2026-11-12T15:00:00Z");
const AFTER_VOTING = new Date("2026-11-12T20:00:00Z");

function challenge(status: string) {
  return { status, submissionDeadline: SUBMISSION_DEADLINE, votingDeadline: VOTING_DEADLINE };
}

test("an OPEN challenge before its submission deadline is taking submissions", () => {
  assert.equal(challengePhase(challenge("OPEN"), BEFORE_SUBMISSIONS_CLOSE), "SUBMISSIONS_OPEN");
});

test("an OPEN challenge past its submission deadline is effectively in voting", () => {
  // The creator never clicked "close submissions", but the deadline has passed
  // and votes.routes already accepts votes on OPEN challenges until votingDeadline.
  assert.equal(challengePhase(challenge("OPEN"), DURING_VOTING), "VOTING_OPEN");
});

test("an OPEN or VOTING challenge past its voting deadline is awaiting results", () => {
  assert.equal(challengePhase(challenge("OPEN"), AFTER_VOTING), "AWAITING_RESULTS");
  assert.equal(challengePhase(challenge("VOTING"), AFTER_VOTING), "AWAITING_RESULTS");
});

test("a VOTING challenge is voting even before the submission deadline", () => {
  // Creator closed submissions early — the stored status wins over the clock.
  assert.equal(challengePhase(challenge("VOTING"), BEFORE_SUBMISSIONS_CLOSE), "VOTING_OPEN");
});

test("deadlines are inclusive, matching the submission and vote routes", () => {
  assert.equal(challengePhase(challenge("OPEN"), SUBMISSION_DEADLINE), "SUBMISSIONS_OPEN");
  assert.equal(challengePhase(challenge("VOTING"), VOTING_DEADLINE), "VOTING_OPEN");
});

test("terminal and draft statuses ignore the clock", () => {
  for (const now of [BEFORE_SUBMISSIONS_CLOSE, DURING_VOTING, AFTER_VOTING]) {
    assert.equal(challengePhase(challenge("DRAFT"), now), "DRAFT");
    assert.equal(challengePhase(challenge("CLOSED"), now), "CLOSED");
    assert.equal(challengePhase(challenge("PAID"), now), "PAID");
  }
});

test("accepts ISO strings as well as Dates for deadlines", () => {
  const c = {
    status: "OPEN",
    submissionDeadline: SUBMISSION_DEADLINE.toISOString(),
    votingDeadline: VOTING_DEADLINE.toISOString(),
  };
  assert.equal(challengePhase(c, DURING_VOTING), "VOTING_OPEN");
});

test("an unknown stored status is reported, not guessed", () => {
  assert.throws(() => challengePhase(challenge("ARCHIVED"), DURING_VOTING), /Unknown challenge status/);
});

test("an unparseable deadline is reported, not treated as passed", () => {
  const c = { status: "OPEN", submissionDeadline: "not a date", votingDeadline: VOTING_DEADLINE };
  assert.throws(() => challengePhase(c, DURING_VOTING), /Invalid challenge deadline/);
});
