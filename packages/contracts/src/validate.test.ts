import assert from "node:assert/strict";
import { test } from "node:test";
import { applyException, validate } from "./validate.ts";
import { previewProject, previewTool, failFinding, approvedException } from "./fixtures.ts";

test("preview project accepts local-review and unconfigured production", () => {
  const result = validate("HarnessProject", previewProject());
  assert.equal(result.ok, true);
});

test("project cannot claim production enforcement in Layer 01", () => {
  const project = previewProject();
  project.spec.runtime.productionEnforcement = "enforced";
  const result = validate("HarnessProject", project);
  assert.equal(result.ok, false);
});

test("effectful tool must declare gateway required", () => {
  const tool = previewTool();
  tool.spec.gateway = "not-applicable";
  const result = validate("Tool", tool);
  assert.equal(result.ok, false);
});

test("PASS finding without evidence is invalid", () => {
  const finding = failFinding();
  finding.result = "PASS";
  finding.evidence = [];
  const result = validate("Finding", finding);
  assert.equal(result.ok, false);
});

test("UNKNOWN remains a valid result and is not a pass", () => {
  const finding = failFinding();
  finding.result = "UNKNOWN";
  const result = validate("Finding", finding);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.notEqual(result.value.result, "PASS");
  }
});

test("exception without owner, approver, rationale or expiry is invalid", () => {
  const exception = approvedException();
  delete exception.spec.owner;
  const result = validate("RiskException", exception);
  assert.equal(result.ok, false);
});

test("expired exception is invalid", () => {
  const exception = approvedException();
  exception.metadata.expiresAt = "2020-01-01";
  const result = validate("RiskException", exception, {
    now: "2026-08-30",
  });
  assert.equal(result.ok, false);
});

test("exception never rewrites a finding result to PASS", () => {
  const finding = failFinding();
  const exception = approvedException();
  const governed = applyException(finding, exception);
  assert.equal(governed.result, "FAIL");
  assert.equal(governed.governanceStatus, "accepted-risk");
});

test("an incompatible apiVersion is rejected", () => {
  const project = previewProject();
  project.apiVersion = "humanmax.ai/harness/v0";
  const result = validate("HarnessProject", project);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some((error) => /apiVersion/.test(error)));
  }
});

test("an empty apiVersion is rejected", () => {
  const project = previewProject();
  project.apiVersion = "";
  const result = validate("HarnessProject", project);
  assert.equal(result.ok, false);
});

test("a budget of zero is rejected and one is accepted", () => {
  const zero = previewProject();
  zero.spec.runtime.defaultBudgets.maxSteps = 0;
  assert.equal(validate("HarnessProject", zero).ok, false);

  const one = previewProject();
  one.spec.runtime.defaultBudgets.maxSteps = 1;
  assert.equal(validate("HarnessProject", one).ok, true);
});
