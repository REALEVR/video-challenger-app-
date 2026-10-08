import { describe, expect, it } from "vitest";
import { isVotingOpen } from "../src/lib/votingWindow";

const deadline = new Date("2026-10-10T12:00:00Z");
const before = new Date("2026-10-10T11:59:59Z");
const after = new Date("2026-10-10T12:00:01Z");

describe("isVotingOpen", () => {
  it.each(["OPEN", "VOTING"])("is open before the deadline when status is %s", (status) => {
    expect(isVotingOpen({ status, votingDeadline: deadline }, before)).toBe(true);
  });

  it("is open exactly at the deadline", () => {
    expect(isVotingOpen({ status: "VOTING", votingDeadline: deadline }, deadline)).toBe(true);
  });

  it("is closed after the deadline", () => {
    expect(isVotingOpen({ status: "VOTING", votingDeadline: deadline }, after)).toBe(false);
  });

  it.each(["DRAFT", "CLOSED", "PAID", "unknown"])("is closed for status %s even before the deadline", (status) => {
    expect(isVotingOpen({ status, votingDeadline: deadline }, before)).toBe(false);
  });

  it("is closed when the challenge does not exist", () => {
    expect(isVotingOpen(null, before)).toBe(false);
  });

  it("defaults to the current time", () => {
    const future = new Date(Date.now() + 60_000);
    const past = new Date(Date.now() - 60_000);
    expect(isVotingOpen({ status: "OPEN", votingDeadline: future })).toBe(true);
    expect(isVotingOpen({ status: "OPEN", votingDeadline: past })).toBe(false);
  });
});
