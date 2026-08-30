import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { validate } from "./validate.ts";

const schemas = join(dirname(fileURLToPath(import.meta.url)), "../schemas");

test("language-neutral JSON Schema files are published", () => {
  for (const name of [
    "harness-project.schema.json",
    "tool.schema.json",
    "finding.schema.json",
    "risk-exception.schema.json",
    "rule-metadata.schema.json",
  ]) {
    assert.equal(existsSync(join(schemas, name)), true, name);
  }
});

test("missing evidence cannot be declared a pass in rule metadata", () => {
  const result = validate("HarnessRuleMetadata", {
    apiVersion: "humanmax.ai/rule/v1alpha1",
    kind: "HarnessRuleMetadata",
    id: "HMX-TOOL-004",
    version: "1.2.0",
    title: "Effectful tool requires disposition",
    family: "authority",
    defaultSeverity: "high",
    appliesTo: ["tool"],
    requiresEvidence: ["tool.effectClass"],
    resultWhenMissing: "PASS",
    remediationClass: "review-required",
    controlRefs: ["base.effectful-action-approval"],
  });
  assert.equal(result.ok, false);
});
