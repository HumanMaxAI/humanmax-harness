import assert from "node:assert/strict";
import { test } from "node:test";
import { previewCommands } from "./index.ts";

test("preview CLI surface stays thin", () => {
  assert.deepEqual(previewCommands(), [
    "dev",
    "add",
    "generate",
    "upgrade",
    "test",
    "doctor",
    "check",
  ]);
});
