import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FINDING_API_VERSION,
  HARNESS_API_VERSION,
  PRODUCTION_ENFORCEMENT_STATES,
  RESULT_STATES,
  requiredGateway,
} from "./index.ts";

test("public contract identifiers stay stable", () => {
  assert.equal(HARNESS_API_VERSION, "humanmax.ai/harness/v1alpha1");
  assert.equal(FINDING_API_VERSION, "humanmax.ai/finding/v1alpha1");
});

test("result states do not include a silent pass", () => {
  assert.deepEqual(RESULT_STATES, [
    "PASS",
    "FAIL",
    "UNKNOWN",
    "NEEDS_HUMAN_REVIEW",
  ]);
});

test("Layer 01 production enforcement has no enforced state", () => {
  assert.deepEqual(PRODUCTION_ENFORCEMENT_STATES, ["unconfigured"]);
});

test("write tools require the action gateway", () => {
  assert.equal(requiredGateway("reversible-write"), "required");
  assert.equal(requiredGateway("read"), "not-applicable");
});
