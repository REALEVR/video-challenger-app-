import { test } from "node:test";
import assert from "node:assert/strict";
import { AUTO_HIDE_REPORT_THRESHOLD, shouldAutoHide } from "./moderation";

test("hides an approved submission once the reporter threshold is reached", () => {
  assert.equal(
    shouldAutoHide({ status: "APPROVED", distinctReporters: AUTO_HIDE_REPORT_THRESHOLD, latestReason: "SPAM" }),
    true
  );
});

test("keeps an approved submission visible below the threshold", () => {
  assert.equal(
    shouldAutoHide({ status: "APPROVED", distinctReporters: AUTO_HIDE_REPORT_THRESHOLD - 1, latestReason: "SPAM" }),
    false
  );
});

test("a single minor-safety report hides immediately", () => {
  assert.equal(shouldAutoHide({ status: "APPROVED", distinctReporters: 1, latestReason: "MINOR_SAFETY" }), true);
});

test("never changes a submission that is not APPROVED", () => {
  for (const status of ["PENDING", "REJECTED"]) {
    assert.equal(shouldAutoHide({ status, distinctReporters: 99, latestReason: "MINOR_SAFETY" }), false, status);
  }
});
