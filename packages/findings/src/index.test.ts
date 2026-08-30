import assert from "node:assert/strict";
import { test } from "node:test";
import { ruleId } from "./index.ts";

test("rule ids stay human-readable and prefixed", () => {
  assert.equal(ruleId("tool", 4), "HMX-TOOL-004");
});
