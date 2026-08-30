export const HARNESS_API_VERSION = "humanmax.ai/harness/v1alpha1" as const;
export const FINDING_API_VERSION = "humanmax.ai/finding/v1alpha1" as const;
export const PACK_LOCK_API_VERSION = "humanmax.ai/pack-lock/v1alpha1" as const;
export const EVIDENCE_API_VERSION = "humanmax.ai/evidence/v1alpha1" as const;

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
