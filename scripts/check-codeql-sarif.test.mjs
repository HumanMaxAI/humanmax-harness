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
  const root = report([{ tool: {}, results: [{
    ruleId: "js/example",
    message: { text: "source-derived detail must stay out of logs" },
    locations: [{ physicalLocation: {
      artifactLocation: { uri: "packages/example.ts" },
      region: { startLine: 42 },
    } }],
  }] }]);
  assert.throws(
    () => checkCodeqlSarif(root),
    (error) => {
      assert.match(error.message, /CodeQL reported 1 alert/);
      assert.match(error.message, /CodeQL finding: \{"ruleId":"js\/example","path":"packages\/example\.ts","line":42\}/);
      assert.doesNotMatch(error.message, /source-derived detail/);
      return true;
    },
  );
});

test("finding diagnostics are bounded and control characters cannot create workflow commands", () => {
  const results = Array.from({ length: 25 }, (_, index) => ({
    ruleId: `js/example-${index}\n::error::injected`,
    locations: [{ physicalLocation: { artifactLocation: { uri: `path-${"x".repeat(300)}` } } }],
  }));
  assert.throws(
    () => checkCodeqlSarif(report([{ tool: {}, results } ])),
    (error) => {
      assert.match(error.message, /CodeQL reported 25 alert/);
      assert.match(error.message, /CodeQL findings omitted: 5/);
      assert.doesNotMatch(error.message, /\n::error::/);
      assert.ok(error.message.length < 8_000);
      return true;
    },
  );
});

test("missing and malformed reports fail closed", () => {
  const empty = mkdtempSync(join(tmpdir(), "humanmax-codeql-empty-"));
  assert.throws(() => checkCodeqlSarif(empty), /no SARIF reports/);
  const malformed = report([{ tool: {}, results: "not-an-array" }]);
  assert.throws(() => checkCodeqlSarif(malformed), /invalid SARIF/);
});
