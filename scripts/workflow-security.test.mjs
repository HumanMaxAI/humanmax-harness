import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

test("publication is gated by an audit that fails on every advisory severity", () => {
  const workspaceJob = workflow.match(/\n  workspace:\n([\s\S]*?)\n  generated-project:/)?.[1];
  assert.ok(workspaceJob, "workspace job must exist before generated-project");
  assert.match(workspaceJob, /\n      - run: npm audit --audit-level=low\n/);
});

test("publication still requires both quality jobs", () => {
  const publishJob = workflow.match(/\n  publish:\n([\s\S]*)$/)?.[1];
  assert.ok(publishJob, "publish job must exist");
  assert.match(publishJob, /^    needs: \[workspace, generated-project\]$/m);
});
