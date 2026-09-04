import assert from "node:assert/strict";
import { test } from "node:test";
import {
  packDigest,
  previewProject,
  previewTool,
  validate,
} from "@humanmax/contracts";
import { evaluate } from "./evaluate.ts";

test("missing project evidence is UNKNOWN, not PASS", () => {
  const result = evaluate({});
  const finding = result.findings.find((item) => item.ruleId === "HMX-PROJ-001");
  assert.ok(finding);
  assert.equal(finding.result, "UNKNOWN");
  assert.equal(result.summary.pass, 0);
});

test("preview project with unconfigured production PASSes enforcement rule", () => {
  const packEntries = [{ path: "pack.yaml", contents: "id: base\n" }];
  const result = evaluate({
    project: previewProject(),
    tools: [previewTool()],
    packLock: {
      apiVersion: "humanmax.ai/pack-lock/v1alpha1",
      kind: "PackLock",
      packs: [
        {
          id: "base",
          version: "0.0.0",
          digest: packDigest(packEntries),
          publisherKeyId: "humanmax-community-2026",
        },
      ],
    },
    packEntries,
  });
  const enforcement = result.findings.find((item) => item.ruleId === "HMX-PROJ-001");
  assert.equal(enforcement?.result, "PASS");
  assert.ok((enforcement?.evidence.length ?? 0) > 0);
  assert.equal(result.findings.some((item) => item.result === "FAIL"), false);
});

test("a write tool without a gateway FAILs and cannot be treated as PASS", () => {
  const tool = {
    ...previewTool(),
    spec: { ...previewTool().spec, gateway: "not-applicable" as const },
  };
  const result = evaluate({
    project: previewProject(),
    tools: [tool],
  });
  const finding = result.findings.find((item) => item.ruleId === "HMX-TOOL-004");
  assert.equal(finding?.result, "FAIL");
  assert.equal(finding?.result === "PASS", false);
});

test("missing pack lock is UNKNOWN", () => {
  const result = evaluate({ project: previewProject(), tools: [] });
  const finding = result.findings.find((item) => item.ruleId === "HMX-PACK-001");
  assert.equal(finding?.result, "UNKNOWN");
});

test("locked pack without file evidence is UNKNOWN, not PASS", () => {
  const result = evaluate({
    project: previewProject(),
    tools: [],
    packLock: {
      apiVersion: "humanmax.ai/pack-lock/v1alpha1",
      kind: "PackLock",
      packs: [
        {
          id: "base",
          version: "0.0.0",
          digest: "sha256:preview-unsigned",
          publisherKeyId: "humanmax-community-2026",
        },
      ],
    },
  });
  const finding = result.findings.find((item) => item.ruleId === "HMX-PACK-001");
  assert.equal(finding?.result, "UNKNOWN");
  assert.equal(finding?.result === "PASS", false);
});

test("a pack digest mismatch FAILs and stops other rules", () => {
  const packEntries = [{ path: "pack.yaml", contents: "id: base\n" }];
  const result = evaluate({
    project: previewProject(),
    tools: [previewTool()],
    packLock: {
      apiVersion: "humanmax.ai/pack-lock/v1alpha1",
      kind: "PackLock",
      packs: [
        {
          id: "base",
          version: "0.0.0",
          digest: `sha256:${"0".repeat(64)}`,
          publisherKeyId: "humanmax-community-2026",
        },
      ],
    },
    packEntries,
  });
  assert.equal(result.packTrustFailed, true);
  assert.equal(result.findings.length, 1);
  assert.equal(result.findings[0]?.ruleId, "HMX-PACK-001");
  assert.equal(result.findings[0]?.result, "FAIL");
});

test("lock digest mismatch FAILs generate-check", () => {
  const result = evaluate({
    project: previewProject(),
    tools: [],
    generatorLock: {
      files: {
        ".humanmax/project.yaml": {
          class: "canonical",
          digest: "sha256:expected",
        },
      },
    },
    fileDigests: {
      ".humanmax/project.yaml": "sha256:different",
    },
  });
  const finding = result.findings.find((item) => item.ruleId === "HMX-GEN-001");
  assert.equal(finding?.result, "FAIL");
});

test("emitted findings validate against the finding contract", () => {
  const result = evaluate({ project: previewProject(), tools: [previewTool()] });
  for (const finding of result.findings) {
    const checked = validate("Finding", finding);
    assert.equal(checked.ok, true, JSON.stringify(checked));
  }
});

test("bounded autonomy is NEEDS_HUMAN_REVIEW and not a pass", () => {
  const project = previewProject();
  project.spec.autonomy = "bounded";
  const result = evaluate({ project, tools: [previewTool()] });
  const finding = result.findings.find((item) => item.ruleId === "HMX-PROJ-001");
  assert.equal(finding?.result, "NEEDS_HUMAN_REVIEW");
  assert.notEqual(finding?.result, "PASS");
  assert.equal(result.summary.needsHumanReview, 1);
  assert.equal(result.summary.pass, 1);
  const checked = validate("Finding", finding);
  assert.equal(checked.ok, true, JSON.stringify(checked));
});

test("assisted preview project does not emit NEEDS_HUMAN_REVIEW", () => {
  const result = evaluate({ project: previewProject(), tools: [previewTool()] });
  assert.equal(
    result.findings.some((item) => item.result === "NEEDS_HUMAN_REVIEW"),
    false,
  );
});
