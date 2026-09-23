import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { checkCodeqlSarif } from "./check-codeql-sarif.mjs";

function report(runs) {
  const root = mkdtempSync(join(tmpdir(), "humanmax-codeql-"));
  mkdirSync(join(root, "nested"));
  writeFileSync(join(root, "nested/results.sarif"), JSON.stringify({ version: "2.1.0", runs }));
  return root;
}

test("a valid CodeQL report with no alerts passes", () => {
  assert.deepEqual(checkCodeqlSarif(report([{ tool: {}, results: [] }])), { files: 1, alerts: 0 });
});

test("any CodeQL alert blocks the release", () => {
  const root = report([{ tool: {}, results: [{ ruleId: "js/example" }] }]);
  assert.throws(() => checkCodeqlSarif(root), /CodeQL reported 1 alert/);
});

test("missing and malformed reports fail closed", () => {
  const empty = mkdtempSync(join(tmpdir(), "humanmax-codeql-empty-"));
  assert.throws(() => checkCodeqlSarif(empty), /no SARIF reports/);
  const malformed = report([{ tool: {}, results: "not-an-array" }]);
  assert.throws(() => checkCodeqlSarif(malformed), /invalid SARIF/);
});
