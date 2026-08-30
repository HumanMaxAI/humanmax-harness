import assert from "node:assert/strict";
import { test } from "node:test";
import { isResultState } from "./index.ts";

test("unknown is a result state and not a pass", () => {
  assert.equal(isResultState("UNKNOWN"), true);
  assert.equal(isResultState("PASS"), true);
  assert.equal(isResultState("ok"), false);
});
