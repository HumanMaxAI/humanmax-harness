import assert from "node:assert/strict";
import { test } from "node:test";
import { previewCommands, stripAnsi } from "./index.ts";

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

test("ANSI stripping stays linear for unterminated OSC input", () => {
  const uncontrolled = `${"\u001b]".repeat(100_000)}safe\u0000`;
  assert.equal(stripAnsi(uncontrolled).endsWith("safe"), true);
  assert.doesNotMatch(stripAnsi("\u001b[31mred\u001b[0m"), /\u001b/);
});
