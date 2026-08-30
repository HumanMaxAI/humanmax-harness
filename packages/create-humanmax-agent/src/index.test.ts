import assert from "node:assert/strict";
import { test } from "node:test";
import { bootstrapDefaults } from "./index.ts";

test("bootstrap defaults stay on the preview path", () => {
  const defaults = bootstrapDefaults();
  assert.equal(defaults.template, "tool-agent");
  assert.equal(defaults.language, "typescript");
});
