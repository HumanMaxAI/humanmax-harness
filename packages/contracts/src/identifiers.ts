export const HARNESS_API_VERSION = "humanmax.ai/harness/v1alpha1" as const;
export const FINDING_API_VERSION = "humanmax.ai/finding/v1alpha1" as const;
export const PACK_LOCK_API_VERSION = "humanmax.ai/pack-lock/v1alpha1" as const;
export const EVIDENCE_API_VERSION = "humanmax.ai/evidence/v1alpha1" as const;
export const CLI_RESPONSE_API_VERSION =
  "humanmax.ai/cli-response/v1alpha1" as const;
export const RULE_API_VERSION = "humanmax.ai/rule/v1alpha1" as const;
export const EXCEPTION_API_VERSION = "humanmax.ai/exception/v1alpha1" as const;

export const RESULT_STATES = [
  "PASS",
  "FAIL",
  "UNKNOWN",
  "NEEDS_HUMAN_REVIEW",
] as const;

export type ResultState = (typeof RESULT_STATES)[number];

export const PREVIEW_CLI_COMMANDS = [
  "dev",
  "add",
  "generate",
  "upgrade",
  "test",
  "doctor",
  "check",
] as const;

export type PreviewCliCommand = (typeof PREVIEW_CLI_COMMANDS)[number];

export const AUTONOMY_TIERS = ["read-only", "assisted", "bounded"] as const;
export type AutonomyTier = (typeof AUTONOMY_TIERS)[number];

export const EFFECT_CLASSES = [
  "read",
  "compute",
  "reversible-write",
  "irreversible-write",
] as const;
export type EffectClass = (typeof EFFECT_CLASSES)[number];

export const GATEWAY_MODES = ["required", "not-applicable"] as const;
export type GatewayMode = (typeof GATEWAY_MODES)[number];

export const PRODUCTION_ENFORCEMENT_STATES = ["unconfigured"] as const;
export type ProductionEnforcementState =
  (typeof PRODUCTION_ENFORCEMENT_STATES)[number];

export const PREVIEW_ENFORCEMENT_ADAPTERS = [
  "local-review",
  "deny-all-production",
] as const;
export type PreviewEnforcementAdapter =
  (typeof PREVIEW_ENFORCEMENT_ADAPTERS)[number];

export const SEVERITIES = [
  "info",
  "low",
  "medium",
  "high",
  "critical",
] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CONFIDENCES = [
  "deterministic",
  "declared",
  "inferred",
  "unassessed",
] as const;
export type Confidence = (typeof CONFIDENCES)[number];

export const REMEDIATION_CLASSES = [
  "safe",
  "review-required",
  "external",
  "none",
] as const;
export type RemediationClass = (typeof REMEDIATION_CLASSES)[number];

export const FILE_OWNERSHIP_CLASSES = [
  "generated",
  "mergeable",
  "canonical",
  "user-owned",
] as const;
export type FileOwnershipClass = (typeof FILE_OWNERSHIP_CLASSES)[number];

export const ENFORCEMENT_OUTCOMES = [
  "ALLOW",
  "REQUIRE_REVIEW",
  "DENY",
  "UNAVAILABLE",
] as const;
export type EnforcementOutcome = (typeof ENFORCEMENT_OUTCOMES)[number];

export const GOVERNANCE_STATUSES = ["open", "accepted-risk"] as const;
export type GovernanceStatus = (typeof GOVERNANCE_STATUSES)[number];

export const EXIT_CODES = {
  ok: 0,
  failed: 1,
  usage: 2,
  packTrust: 3,
  internal: 4,
} as const;

export const PREVIEW_TEMPLATES = ["minimal", "tool-agent"] as const;
export type PreviewTemplate = (typeof PREVIEW_TEMPLATES)[number];

export const PREVIEW_LANGUAGES = ["typescript"] as const;
export type PreviewLanguage = (typeof PREVIEW_LANGUAGES)[number];

export const DOCUMENT_KINDS = [
  "HarnessProject",
  "Agent",
  "Tool",
  "Finding",
  "RiskException",
  "PackLock",
  "HarnessEvidenceManifest",
  "CliResponse",
  "HarnessRuleMetadata",
] as const;

export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export function isEffectful(effectClass: EffectClass): boolean {
  return (
    effectClass === "reversible-write" || effectClass === "irreversible-write"
  );
}

export function requiredGateway(effectClass: EffectClass): GatewayMode {
  return isEffectful(effectClass) ? "required" : "not-applicable";
}
