import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { runEvals } from "./evals.ts";

function fixture(t: { after(fn: () => void): void }, files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "humanmax-evals-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "evals"));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(root, "evals", name), text);
  return root;
}

test("eval execution preserves every contract result state", (t) => {
  const root = fixture(t, Object.fromEntries(["PASS", "FAIL", "UNKNOWN", "NEEDS_HUMAN_REVIEW"].map(result => [
    `${result}.eval.ts`, `console.log('local output'); export async function evaluate() { return '${result}'; }`,
  ])));
  const results = runEvals(root);
  assert.deepEqual(results.map(r => r.result).sort(), ["FAIL", "NEEDS_HUMAN_REVIEW", "PASS", "UNKNOWN"]);
});

test("throwing and rejected evals fail; missing/invalid implementations stay UNKNOWN", (t) => {
  const root = fixture(t, {
    "throw.eval.ts": 'throw new Error("private-payload");',
    "reject.eval.ts": 'export async function evaluate() { throw new Error("private-payload"); }',
    "legacy.eval.ts": 'export const example = { resultWhenFailed: "FAIL" };',
    "invalid.eval.ts": 'export function evaluate() { return "green"; }',
  });
  const results = runEvals(root);
  assert.deepEqual(results.map(r => r.result), ["UNKNOWN", "UNKNOWN", "FAIL", "FAIL"]);
  assert.doesNotMatch(JSON.stringify(results), /private-payload/);
});

test("no eval evidence remains UNKNOWN", (t) => {
  assert.equal(runEvals(fixture(t, {}))[0]?.result, "UNKNOWN");
});

test("linked eval code is refused before import", (t) => {
  const root = fixture(t, {});
  const outside = join(root, "outside.ts");
  writeFileSync(outside, 'throw new Error("must-not-load");');
  symlinkSync(outside, join(root, "evals/linked.eval.ts"));
  const result = runEvals(root);
  assert.equal(result[0]?.result, "FAIL");
  assert.doesNotMatch(JSON.stringify(result), /must-not-load/);
});

test("early exit and excessive output never produce PASS", (t) => {
  const root = fixture(t, {
    "exit.eval.ts": 'process.exit(0);',
    "output.eval.ts": 'import { writeSync } from "node:fs"; while (true) writeSync(1, "x".repeat(65536));',
  });
  assert.deepEqual(runEvals(root).map(r => r.result), ["UNKNOWN", "UNKNOWN"]);
});

test("an eval that ignores termination is killed within its execution limit", (t) => {
  const root = fixture(t, {
    "hang.eval.ts": 'process.on("SIGTERM", () => {}); export function evaluate() { return new Promise(() => { setInterval(() => {}, 1000); }); }',
  });
  const started = Date.now();
  const result = runEvals(root);
  assert.equal(result[0]?.result, "UNKNOWN");
  assert.match(result[0]?.reason ?? "", /execution\/output limits/);
  assert.ok(Date.now() - started < 20_000);
});
