import assert from "node:assert/strict";
import { test } from "node:test";
import {
  failFinding,
  RESULT_STATES,
  type CliResponse,
  type Finding,
  type ResultState,
  type Severity,
} from "@humanmax/contracts";
import { CliError } from "./errors.ts";
import { sarifKind, sarifLevel, toSarif } from "./sarif.ts";

function finding(
  result: ResultState,
  severity: Severity = "high",
  overrides: Partial<Finding> = {},
): Finding {
  const base = failFinding();
  return {
    ...base,
    findingId: `${base.findingId}-${result}-${severity}`,
    result,
    severity,
    evidence: result === "PASS" ? base.evidence : [],
    ...overrides,
  };
}

function response(findings: Finding[], status: CliResponse["status"]): CliResponse {
  const summary = {
    pass: findings.filter((item) => item.result === "PASS").length,
    fail: findings.filter((item) => item.result === "FAIL").length,
    unknown: findings.filter((item) => item.result === "UNKNOWN").length,
    needsHumanReview: findings.filter((item) => item.result === "NEEDS_HUMAN_REVIEW")
      .length,
  };
  return {
    apiVersion: "humanmax.ai/cli-response/v1alpha1",
    kind: "CliResponse",
    command: "check",
    status,
    versions: { cli: "1.2.3", core: "1.2.4", contracts: "1.2.5" },
    project: {
      root: "/tmp/demo",
      configDigest: "sha256:config",
      packLockDigest: "sha256:lock",
    },
    summary,
    results: findings,
    coverage: {
      skippedPaths: [],
      limitations: [
        "Preview does not claim production enforcement or certification.",
      ],
    },
  };
}

test("every result state maps to a SARIF kind that is only 'pass' for PASS", () => {
  assert.equal(sarifKind("PASS"), "pass");
  for (const state of RESULT_STATES) {
    if (state === "PASS") continue;
    assert.notEqual(sarifKind(state), "pass");
  }
});

test("FAIL is always error level and non-PASS states are never silenced", () => {
  assert.equal(sarifLevel("FAIL", "info"), "error");
  assert.equal(sarifLevel("FAIL", "critical"), "error");
  assert.equal(sarifLevel("UNKNOWN", "high"), "error");
  assert.equal(sarifLevel("UNKNOWN", "critical"), "error");
  assert.equal(sarifLevel("UNKNOWN", "medium"), "warning");
  assert.equal(sarifLevel("NEEDS_HUMAN_REVIEW", "critical"), "error");
  assert.equal(sarifLevel("NEEDS_HUMAN_REVIEW", "low"), "warning");
  assert.equal(sarifLevel("PASS", "critical"), "none");
  for (const state of RESULT_STATES) {
    if (state === "PASS") continue;
    for (const severity of ["info", "low", "medium", "high", "critical"] as const) {
      const level = sarifLevel(state, severity);
      assert.ok(
        level === "warning" || level === "error",
        `${state}/${severity} produced ${level}`,
      );
    }
  }
});

test("SARIF derives from exactly the same finding set as the JSON envelope", () => {
  const findings = [
    finding("PASS", "medium"),
    finding("FAIL", "high"),
    finding("UNKNOWN", "medium"),
    finding("NEEDS_HUMAN_REVIEW", "low"),
  ];
  const body = response(findings, "failed");
  const log = toSarif(body);
  const run = log.runs[0];
  assert.ok(run);
  assert.equal(log.version, "2.1.0");
  assert.equal(run.results.length, body.results.length);
  assert.deepEqual(
    run.results.map((result) => result.partialFingerprints.humanmaxFindingId),
    findings.map((item) => item.findingId),
  );
  assert.deepEqual(run.properties.resultStates, {
    PASS: 1,
    FAIL: 1,
    UNKNOWN: 1,
    NEEDS_HUMAN_REVIEW: 1,
  });
  assert.deepEqual(run.properties.summary, body.summary);
});

test("no non-PASS finding can be read as a pass in SARIF", () => {
  const findings = [
    finding("FAIL", "high"),
    finding("UNKNOWN", "medium"),
    finding("UNKNOWN", "critical"),
    finding("NEEDS_HUMAN_REVIEW", "low"),
  ];
  const log = toSarif(response(findings, "failed"));
  const run = log.runs[0];
  assert.ok(run);
  assert.equal(run.results.length, findings.length);
  for (const [index, result] of run.results.entries()) {
    const source = findings[index];
    assert.ok(source);
    assert.notEqual(result.kind, "pass");
    assert.notEqual(result.level, "none");
    assert.notEqual(result.level, "note");
    assert.equal(result.properties.humanmaxResult, source.result);
    assert.match(result.message.text, new RegExp(`^${source.result}: `));
  }
  assert.equal(run.invocations[0]?.executionSuccessful, false);
});

test("FAIL surfaces as an error-level SARIF result", () => {
  const log = toSarif(response([finding("FAIL", "low")], "failed"));
  const result = log.runs[0]?.results[0];
  assert.equal(result?.kind, "fail");
  assert.equal(result?.level, "error");
});

test("PASS keeps SARIF's satisfied-condition kind", () => {
  const log = toSarif(response([finding("PASS", "medium")], "completed"));
  const run = log.runs[0];
  assert.equal(run?.results[0]?.kind, "pass");
  assert.equal(run?.results[0]?.level, "none");
  assert.equal(run?.invocations[0]?.executionSuccessful, true);
});

test("rule id, finding id, severity and locations survive the mapping", () => {
  const source = finding("FAIL", "critical");
  const log = toSarif(response([source], "failed"));
  const run = log.runs[0];
  const result = run?.results[0];
  assert.ok(run && result);
  assert.equal(result.ruleId, source.ruleId);
  assert.equal(run.tool.driver.rules[result.ruleIndex]?.id, source.ruleId);
  assert.equal(result.properties.findingId, source.findingId);
  assert.equal(result.partialFingerprints.humanmaxFindingId, source.findingId);
  assert.equal(result.properties.humanmaxSeverity, "critical");
  assert.equal(
    result.locations?.[0]?.physicalLocation.artifactLocation.uri,
    source.locations[0]?.file,
  );
  assert.equal(
    result.locations?.[0]?.physicalLocation.region?.startLine,
    source.locations[0]?.line,
  );
});

test("the coverage limitation survives in SARIF", () => {
  const body = response([finding("PASS", "medium")], "completed");
  const log = toSarif(body);
  assert.deepEqual(log.runs[0]?.properties.coverage, body.coverage);
  assert.match(
    JSON.stringify(log),
    /Preview does not claim production enforcement or certification\./,
  );
});

test("SARIF output carries the reported versions and no ANSI text", () => {
  const log = toSarif(response([finding("FAIL", "high")], "failed"));
  assert.equal(log.runs[0]?.tool.driver.version, "1.2.3");
  assert.deepEqual(log.runs[0]?.properties.versions, {
    cli: "1.2.3",
    core: "1.2.4",
    contracts: "1.2.5",
  });
  assert.doesNotMatch(JSON.stringify(log), /\u001b\[/);
});

test("a non-finding result is an internal error, not an empty SARIF run", () => {
  const body = response([], "completed");
  const broken: CliResponse = { ...body, results: [{ runner: "npm test" }] };
  assert.throws(
    () => toSarif(broken),
    (error: unknown) => error instanceof CliError && error.kind === "internal",
  );
});
