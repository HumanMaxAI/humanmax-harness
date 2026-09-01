import {
  findingId,
  type Confidence,
  type Finding,
  type FileLocation,
  type RemediationClass,
  type ResultState,
  type Severity,
  type SubjectRef,
} from "@humanmax/contracts";

export const RULE_PREFIX = "HMX-" as const;

export function ruleId(family: string, number: number): string {
  const n = String(number).padStart(3, "0");
  return `${RULE_PREFIX}${family.toUpperCase()}-${n}`;
}

export const PREVIEW_RULES = {
  productionEnforcement: "HMX-PROJ-001",
  gatewayCoverage: "HMX-TOOL-004",
  packLock: "HMX-PACK-001",
  generatorLock: "HMX-GEN-001",
} as const;

export type FindingDraft = {
  ruleId: string;
  result: ResultState;
  severity: Severity;
  confidence: Confidence;
  title: string;
  message: string;
  subject: SubjectRef;
  locations: FileLocation[];
  evidence?: Finding["evidence"];
  remediation: {
    classification: RemediationClass;
    summary: string;
  };
};

export function makeFinding(draft: FindingDraft): Finding {
  const location = draft.locations[0];
  return {
    apiVersion: "humanmax.ai/finding/v1alpha1",
    kind: "Finding",
    findingId: findingId({
      ruleId: draft.ruleId,
      subject: draft.subject,
      location,
    }),
    ruleId: draft.ruleId,
    ruleVersion: "0.0.0",
    pack: { id: "base", version: "0.0.0" },
    result: draft.result,
    severity: draft.severity,
    confidence: draft.confidence,
    title: draft.title,
    message: draft.message,
    subject: draft.subject,
    locations: draft.locations,
    evidence: draft.evidence ?? [],
    controlRefs: ["base.preview"],
    remediation: draft.remediation,
    governanceStatus: "open",
  };
}
