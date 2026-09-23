import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const workflow = readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8");

test("publication is gated by an audit that fails on every advisory severity", () => {
  const workspaceJob = workflow.match(/\n  workspace:\n([\s\S]*?)\n  generated-project:/)?.[1];
  assert.ok(workspaceJob, "workspace job must exist before generated-project");
  assert.match(workspaceJob, /\n      - run: npm audit --audit-level=low\n/);
});

test("publication requires every quality job", () => {
  const publishJob = workflow.match(/\n  publish:\n([\s\S]*)$/)?.[1];
  assert.ok(publishJob, "publish job must exist");
  assert.match(publishJob, /^    needs: \[workspace, generated-project, codeql\]$/m);
});

test("CodeQL runs security-extended analysis without release secrets", () => {
  const codeqlJob = workflow.match(/\n  codeql:\n([\s\S]*?)\n  publish:/)?.[1];
  assert.ok(codeqlJob, "CodeQL job must exist before publish");
  assert.match(codeqlJob, /contents: read/);
  assert.match(codeqlJob, /security-events: write/);
  assert.match(codeqlJob, /language: \[javascript-typescript, actions\]/);
  assert.match(codeqlJob, /github\/codeql-action\/init@v4/);
  assert.match(codeqlJob, /languages: \$\{\{ matrix\.language \}\}/);
  assert.match(codeqlJob, /build-mode: none/);
  assert.match(codeqlJob, /queries: security-extended/);
  assert.match(codeqlJob, /github\/codeql-action\/analyze@v4/);
  assert.match(codeqlJob, /node scripts\/check-codeql-sarif\.mjs/);
  assert.doesNotMatch(codeqlJob, /environment: prod|NPM_TOKEN|NODE_AUTH_TOKEN/);
});
