import assert from "node:assert/strict";
import { test } from "node:test";
import { productionEnforcementState } from "./index.ts";

test("generated runtime does not imply production enforcement", () => {
  assert.equal(productionEnforcementState(), "unconfigured");
});
