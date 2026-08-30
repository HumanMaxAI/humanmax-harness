import assert from "node:assert/strict";
import { test } from "node:test";
import { defaultCreateOptions } from "./index.ts";

test("preview default path does not include sg-core", () => {
  const options = defaultCreateOptions();
  assert.deepEqual(options.profiles, ["base"]);
  assert.equal(options.template, "tool-agent");
});
