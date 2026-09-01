import {
  isEffectful,
  validate,
  type Finding,
  type ResultState,
} from "@humanmax/contracts";
import { PREVIEW_RULES, makeFinding } from "@humanmax/findings";

export type EvaluationInput = {
  project?: unknown;
  tools?: unknown[];
  packLock?: unknown;
  generatorLock?: {
    files?: Record<string, { class?: string; digest?: string }>;
  };
  fileDigests?: Record<string, string>;
};

export type EvaluationSummary = {
  pass: number;
  fail: number;
  unknown: number;
  needsHumanReview: number;
};

export type EvaluationResult = {
  findings: Finding[];
  summary: EvaluationSummary;
};

export function evaluate(input: EvaluationInput): EvaluationResult {
  const findings: Finding[] = [];
  findings.push(projectFinding(input.project));
  findings.push(packFinding(input.packLock));
  for (const tool of input.tools ?? []) {
    findings.push(toolFinding(tool));
  }
  if (input.generatorLock) {
    findings.push(generatorFinding(input.generatorLock, input.fileDigests));
  }
  return { findings, summary: summarise(findings) };
}

export function summarise(findings: Finding[]): EvaluationSummary {
  const summary: EvaluationSummary = {
    pass: 0,
    fail: 0,
    unknown: 0,
    needsHumanReview: 0,
  };
  for (const finding of findings) {
    const key = resultKey(finding.result);
    summary[key] += 1;
  }
  return summary;
}

function resultKey(result: ResultState): keyof EvaluationSummary {
  if (result === "PASS") return "pass";
  if (result === "FAIL") return "fail";
  if (result === "NEEDS_HUMAN_REVIEW") return "needsHumanReview";
  return "unknown";
}

function projectFinding(project: unknown): Finding {
  const subject = { type: "project", id: "harness" };
  const locations = [{ file: ".humanmax/project.yaml" }];
  if (project === undefined) {
    return makeFinding({
      ruleId: PREVIEW_RULES.productionEnforcement,
      result: "UNKNOWN",
      severity: "high",
      confidence: "unassessed",
      title: "Production enforcement is not evidenced",
      message:
        "No HarnessProject document was supplied. Absence of evidence is not a pass.",
      subject,
      locations,
      remediation: {
        classification: "review-required",
        summary: "Provide .humanmax/project.yaml before claiming a check result.",
      },
    });
  }
  const checked = validate("HarnessProject", project);
  if (!checked.ok) {
    return makeFinding({
      ruleId: PREVIEW_RULES.productionEnforcement,
      result: "FAIL",
      severity: "high",
      confidence: "deterministic",
      title: "Harness project document is invalid",
      message: checked.errors.join("; "),
      subject,
      locations,
      evidence: [{ type: "validation", ref: "HarnessProject" }],
      remediation: {
        classification: "review-required",
        summary: "Fix the project document so production stays unconfigured.",
      },
    });
  }
  return makeFinding({
    ruleId: PREVIEW_RULES.productionEnforcement,
    result: "PASS",
    severity: "high",
    confidence: "deterministic",
    title: "Production enforcement is unconfigured",
    message:
      "Layer 01 production enforcement is unconfigured. This is not production authority.",
    subject: { type: "project", id: checked.value.metadata.projectId },
    locations,
    evidence: [
      {
        type: "declaration",
        ref: `productionEnforcement:${checked.value.spec.runtime.productionEnforcement}`,
      },
    ],
    remediation: {
      classification: "none",
      summary: "Keep productionEnforcement unconfigured in Preview.",
    },
  });
}

function packFinding(packLock: unknown): Finding {
  const subject = { type: "pack", id: "base" };
  const locations = [{ file: ".humanmax/packs.lock" }];
  if (packLock === undefined) {
    return makeFinding({
      ruleId: PREVIEW_RULES.packLock,
      result: "UNKNOWN",
      severity: "medium",
      confidence: "unassessed",
      title: "Pack lock is missing",
      message: "No PackLock document was supplied. Absence of evidence is not a pass.",
      subject,
      locations,
      remediation: {
        classification: "review-required",
        summary: "Commit .humanmax/packs.lock with a digest-locked base pack.",
      },
    });
  }
  const checked = validate("PackLock", packLock);
  if (!checked.ok) {
    return makeFinding({
      ruleId: PREVIEW_RULES.packLock,
      result: "FAIL",
      severity: "high",
      confidence: "deterministic",
      title: "Pack lock is invalid",
      message: checked.errors.join("; "),
      subject,
      locations,
      evidence: [{ type: "validation", ref: "PackLock" }],
      remediation: {
        classification: "review-required",
        summary: "Restore a valid packs.lock. Do not continue without a digest.",
      },
    });
  }
  const base = checked.value.packs.find((pack) => pack.id === "base");
  if (!base) {
    return makeFinding({
      ruleId: PREVIEW_RULES.packLock,
      result: "FAIL",
      severity: "high",
      confidence: "deterministic",
      title: "Base pack is not locked",
      message: "PackLock does not include the required base pack.",
      subject,
      locations,
      evidence: [{ type: "declaration", ref: "PackLock" }],
      remediation: {
        classification: "review-required",
        summary: "Lock the base pack by digest.",
      },
    });
  }
  return makeFinding({
    ruleId: PREVIEW_RULES.packLock,
    result: "PASS",
    severity: "medium",
    confidence: "deterministic",
    title: "Base pack is digest-locked",
    message: `base@${base.version} is locked at ${base.digest}. Preview packs are unsigned.`,
    subject,
    locations,
    evidence: [{ type: "digest", ref: base.digest }],
    remediation: {
      classification: "none",
      summary: "Keep the base pack digest lock.",
    },
  });
}

function toolFinding(tool: unknown): Finding {
  const locations = [{ file: ".humanmax/tools" }];
  const checked = validate("Tool", tool);
  if (!checked.ok) {
    const id =
      tool &&
      typeof tool === "object" &&
      "metadata" in tool &&
      tool.metadata &&
      typeof tool.metadata === "object" &&
      "id" in tool.metadata &&
      typeof tool.metadata.id === "string"
        ? tool.metadata.id
        : "unknown-tool";
    return makeFinding({
      ruleId: PREVIEW_RULES.gatewayCoverage,
      result: "FAIL",
      severity: "high",
      confidence: "deterministic",
      title: "Tool declaration is invalid or bypasses the gateway",
      message: checked.errors.join("; "),
      subject: { type: "tool", id },
      locations,
      evidence: [{ type: "validation", ref: "Tool" }],
      remediation: {
        classification: "review-required",
        summary: "Declare effectful tools with gateway required. Do not add a second registry.",
      },
    });
  }
  const effectful = isEffectful(checked.value.spec.effectClass);
  return makeFinding({
    ruleId: PREVIEW_RULES.gatewayCoverage,
    result: "PASS",
    severity: "high",
    confidence: "deterministic",
    title: effectful
      ? "Effectful tool requires the action gateway"
      : "Read tool does not skip the registry",
    message: `${checked.value.metadata.id} is declared with gateway ${checked.value.spec.gateway}.`,
    subject: { type: "tool", id: checked.value.metadata.id },
    locations: [{ file: `.humanmax/tools/${checked.value.metadata.id}.tool.yaml` }],
    evidence: [
      {
        type: "declaration",
        ref: `${checked.value.metadata.id}:${checked.value.spec.gateway}`,
      },
    ],
    remediation: {
      classification: "none",
      summary: "Keep effectful calls behind the action gateway.",
    },
  });
}

function generatorFinding(
  lock: { files?: Record<string, { class?: string; digest?: string }> },
  fileDigests?: Record<string, string>,
): Finding {
  const subject = { type: "generator", id: "lock" };
  const locations = [{ file: ".humanmax/generator.lock" }];
  const files = lock.files ?? {};
  const paths = Object.keys(files);
  if (paths.length === 0) {
    return makeFinding({
      ruleId: PREVIEW_RULES.generatorLock,
      result: "UNKNOWN",
      severity: "medium",
      confidence: "unassessed",
      title: "Generator lock has no file evidence",
      message: "generator.lock listed no files. Absence of evidence is not a pass.",
      subject,
      locations,
      remediation: {
        classification: "review-required",
        summary: "Regenerate the project so generator.lock records file digests.",
      },
    });
  }
  const mismatches: string[] = [];
  const missing: string[] = [];
  for (const path of paths) {
    const expected = files[path]?.digest;
    const actual = fileDigests?.[path];
    if (!expected) {
      missing.push(path);
      continue;
    }
    if (!actual) {
      missing.push(path);
      continue;
    }
    if (actual !== expected) {
      mismatches.push(path);
    }
  }
  if (mismatches.length > 0) {
    return makeFinding({
      ruleId: PREVIEW_RULES.generatorLock,
      result: "FAIL",
      severity: "high",
      confidence: "deterministic",
      title: "Generated files do not match the lock",
      message: `Digest mismatch: ${mismatches.join(", ")}`,
      subject,
      locations,
      evidence: mismatches.map((path) => ({ type: "digest", ref: path })),
      remediation: {
        classification: "review-required",
        summary: "Inspect the diff with upgrade --dry-run. Do not silently overwrite user-owned files.",
      },
    });
  }
  if (missing.length > 0) {
    return makeFinding({
      ruleId: PREVIEW_RULES.generatorLock,
      result: "UNKNOWN",
      severity: "medium",
      confidence: "unassessed",
      title: "Generator lock could not be fully compared",
      message: `No current digest for: ${missing.join(", ")}`,
      subject,
      locations,
      remediation: {
        classification: "review-required",
        summary: "Read the locked files before treating generate --check as a pass.",
      },
    });
  }
  return makeFinding({
    ruleId: PREVIEW_RULES.generatorLock,
    result: "PASS",
    severity: "medium",
    confidence: "deterministic",
    title: "Generator lock matches current files",
    message: `${paths.length} locked files match their recorded digests.`,
    subject,
    locations,
    evidence: [{ type: "digest", ref: `files:${paths.length}` }],
    remediation: {
      classification: "none",
      summary: "Keep generator.lock as the upgrade baseline.",
    },
  });
}
