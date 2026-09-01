import assert from "node:assert/strict";
import { test } from "node:test";
import { PREVIEW_RULES, ruleId } from "./index.ts";

test("rule ids stay human-readable and prefixed", () => {
  assert.equal(ruleId("tool", 4), "HMX-TOOL-004");
  assert.equal(PREVIEW_RULES.gatewayCoverage, "HMX-TOOL-004");
});
