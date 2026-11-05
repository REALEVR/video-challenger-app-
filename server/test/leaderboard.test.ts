import { test } from "node:test";
import assert from "node:assert/strict";
import { rankSubmissions } from "../src/lib/leaderboard";

const sub = (id: string, viewCount: number, voteCount: number) => ({ id, viewCount, voteCount });

test("VIEWS ranks by views; equal views share a rank, ordered by votes", () => {
  const out = rankSubmissions([sub("a", 10, 1), sub("b", 50, 0), sub("c", 10, 5)], "VIEWS");
  assert.deepEqual(out.map((r) => [r.id, r.rank]), [["b", 1], ["c", 2], ["a", 2]]);
});

test("VOTES ranks by votes, then views as tiebreak", () => {
  const out = rankSubmissions([sub("a", 100, 1), sub("b", 5, 3), sub("c", 9, 3)], "VOTES");
  assert.deepEqual(out.map((r) => r.id), ["c", "b", "a"]);
});

test("HYBRID averages the view share and vote share", () => {
  // a: 90% of views, 10% of votes -> 0.5; b: 10% views, 90% votes -> 0.5; c: 0/0 -> 0
  const out = rankSubmissions([sub("a", 90, 1), sub("b", 10, 9), sub("c", 0, 0)], "HYBRID");
  assert.deepEqual(out.map((r) => r.rank), [1, 1, 3]);
  assert.equal(out[2].id, "c");
});

test("exact ties share a rank and the next rank skips (1,1,3)", () => {
  const out = rankSubmissions([sub("a", 5, 5), sub("b", 5, 5), sub("c", 1, 1)], "VIEWS");
  assert.deepEqual(out.map((r) => r.rank), [1, 1, 3]);
});

test("empty input and all-zero input do not divide by zero", () => {
  assert.deepEqual(rankSubmissions([], "HYBRID"), []);
  const out = rankSubmissions([sub("a", 0, 0), sub("b", 0, 0)], "HYBRID");
  assert.deepEqual(out.map((r) => r.rank), [1, 1]);
  assert.ok(out.every((r) => r.score === 0));
});

test("unknown payout model falls back to VIEWS, matching payout computation", () => {
  const out = rankSubmissions([sub("a", 1, 9), sub("b", 2, 0)], "WEIRD");
  assert.equal(out[0].id, "b");
});

test("does not mutate its input", () => {
  const input = [sub("a", 1, 0), sub("b", 2, 0)];
  rankSubmissions(input, "VIEWS");
  assert.deepEqual(input.map((s) => s.id), ["a", "b"]);
});
