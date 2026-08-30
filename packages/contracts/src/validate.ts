import {
  AUTONOMY_TIERS,
  CONFIDENCES,
  DOCUMENT_KINDS,
  EFFECT_CLASSES,
  GATEWAY_MODES,
  PREVIEW_ENFORCEMENT_ADAPTERS,
  PREVIEW_LANGUAGES,
  PREVIEW_TEMPLATES,
  PRODUCTION_ENFORCEMENT_STATES,
  REMEDIATION_CLASSES,
  RESULT_STATES,
  SEVERITIES,
  isEffectful,
  requiredGateway,
  type DocumentKind,
} from "./identifiers.ts";
import type {
  DocumentFor,
  Finding,
  RiskException,
  ValidateOptions,
  ValidationResult,
} from "./types.ts";

function fail(errors: string[]): ValidationResult<never> {
  return { ok: false, errors };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => isString(item));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

function requireKind(
  document: Record<string, unknown>,
  kind: DocumentKind,
  apiVersion: string,
  errors: string[],
): void {
  if (document.kind !== kind) {
    errors.push(`kind must be ${kind}`);
  }
  if (document.apiVersion !== apiVersion) {
    errors.push(`apiVersion must be ${apiVersion}`);
  }
}

function nested(
  value: unknown,
  path: string,
  errors: string[],
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    errors.push(`${path} must be an object`);
    return undefined;
  }
  return value;
}

export function validate<K extends DocumentKind>(
  kind: K,
  document: unknown,
  options: ValidateOptions = {},
): ValidationResult<DocumentFor<K>> {
  if (!isRecord(document)) {
    return fail(["document must be an object"]);
  }
  if (!DOCUMENT_KINDS.includes(kind)) {
    return fail([`unknown kind ${kind}`]);
  }

  const errors: string[] = [];
  switch (kind) {
    case "HarnessProject":
      validateProject(document, errors);
      break;
    case "Agent":
      validateAgent(document, errors);
      break;
    case "Tool":
      validateTool(document, errors);
      break;
    case "Finding":
      validateFinding(document, errors);
      break;
    case "RiskException":
      validateException(document, errors, options.now);
      break;
    case "PackLock":
      validatePackLock(document, errors);
      break;
    case "HarnessEvidenceManifest":
      validateEvidence(document, errors);
      break;
    case "CliResponse":
      validateCliResponse(document, errors);
      break;
    case "HarnessRuleMetadata":
      validateRule(document, errors);
      break;
    default:
      errors.push(`unsupported kind`);
  }

  if (errors.length > 0) {
    return fail(errors);
  }
  return { ok: true, value: document as DocumentFor<K> };
}

function validateProject(document: Record<string, unknown>, errors: string[]): void {
  requireKind(document, "HarnessProject", "humanmax.ai/harness/v1alpha1", errors);
  const metadata = nested(document.metadata, "metadata", errors);
  if (metadata && !isString(metadata.projectId)) {
    errors.push("metadata.projectId is required");
  }
  const spec = nested(document.spec, "spec", errors);
  if (!spec) {
    return;
  }
  const generator = nested(spec.generator, "spec.generator", errors);
  if (generator) {
    if (!oneOf(generator.template, PREVIEW_TEMPLATES)) {
      errors.push("spec.generator.template must be a Preview template");
    }
    if (!oneOf(generator.language, PREVIEW_LANGUAGES)) {
      errors.push("spec.generator.language must be typescript in Preview");
    }
    if (!isString(generator.version) || !isString(generator.modelAdapter)) {
      errors.push("spec.generator.version and modelAdapter are required");
    }
  }
  if (!isStringArray(spec.profiles) || !spec.profiles.includes("base")) {
    errors.push("spec.profiles must include base");
  }
  if (!oneOf(spec.autonomy, AUTONOMY_TIERS)) {
    errors.push("spec.autonomy is invalid");
  }
  const runtime = nested(spec.runtime, "spec.runtime", errors);
  if (runtime) {
    if (!oneOf(runtime.productionEnforcement, PRODUCTION_ENFORCEMENT_STATES)) {
      errors.push("spec.runtime.productionEnforcement cannot claim enforcement");
    }
    if (!oneOf(runtime.enforcementAdapter, PREVIEW_ENFORCEMENT_ADAPTERS)) {
      errors.push("spec.runtime.enforcementAdapter is not a Preview adapter");
    }
    if (runtime.undeclaredEffect !== "deny") {
      errors.push("spec.runtime.undeclaredEffect must be deny");
    }
    const budgets = nested(runtime.defaultBudgets, "spec.runtime.defaultBudgets", errors);
    if (budgets) {
      for (const key of ["maxSteps", "maxToolCalls", "timeoutSeconds"] as const) {
        if (!isNumber(budgets[key]) || budgets[key] <= 0) {
          errors.push(`spec.runtime.defaultBudgets.${key} must be a positive number`);
        }
      }
    }
  }
  if (!isStringArray(spec.include) || !isStringArray(spec.exclude)) {
    errors.push("spec.include and spec.exclude must be string arrays");
  }
  const ci = nested(spec.ci, "spec.ci", errors);
  if (ci && !oneOf(ci.failOn, SEVERITIES)) {
    errors.push("spec.ci.failOn is invalid");
  }
}

function validateAgent(document: Record<string, unknown>, errors: string[]): void {
  requireKind(document, "Agent", "humanmax.ai/harness/v1alpha1", errors);
  const metadata = nested(document.metadata, "metadata", errors);
  if (metadata) {
    if (!isString(metadata.id) || !isString(metadata.version)) {
      errors.push("metadata.id and metadata.version are required");
    }
    const owners = nested(metadata.owners, "metadata.owners", errors);
    if (owners) {
      for (const role of ["business", "technical", "risk"]) {
        if (!isString(owners[role])) {
          errors.push(`metadata.owners.${role} is required`);
        }
      }
    }
  }
  const spec = nested(document.spec, "spec", errors);
  if (!spec) {
    return;
  }
  if (!isString(spec.purpose)) {
    errors.push("spec.purpose is required");
  }
  if (!oneOf(spec.autonomyTier, AUTONOMY_TIERS)) {
    errors.push("spec.autonomyTier is invalid");
  }
  if (!isStringArray(spec.prohibitedActions) || !isStringArray(spec.tools)) {
    errors.push("spec.prohibitedActions and spec.tools must be string arrays");
  }
  if (!isString(spec.manualFallback) || !isString(spec.reviewExpiresAt)) {
    errors.push("spec.manualFallback and spec.reviewExpiresAt are required");
  }
}

function validateTool(document: Record<string, unknown>, errors: string[]): void {
  requireKind(document, "Tool", "humanmax.ai/harness/v1alpha1", errors);
  const metadata = nested(document.metadata, "metadata", errors);
  if (metadata && !isString(metadata.id)) {
    errors.push("metadata.id is required");
  }
  const spec = nested(document.spec, "spec", errors);
  if (!spec) {
    return;
  }
  if (!oneOf(spec.effectClass, EFFECT_CLASSES)) {
    errors.push("spec.effectClass is invalid");
  }
  if (!oneOf(spec.gateway, GATEWAY_MODES)) {
    errors.push("spec.gateway is invalid");
  }
  if (
    oneOf(spec.effectClass, EFFECT_CLASSES) &&
    spec.gateway !== requiredGateway(spec.effectClass)
  ) {
    errors.push(
      isEffectful(spec.effectClass)
        ? "effectful tools must set spec.gateway to required"
        : "read/compute tools must set spec.gateway to not-applicable",
    );
  }
  if (!isString(spec.inputSchemaRef) || !isString(spec.outputSchemaRef)) {
    errors.push("spec.inputSchemaRef and spec.outputSchemaRef are required");
  }
  if (
    oneOf(spec.effectClass, EFFECT_CLASSES) &&
    isEffectful(spec.effectClass) &&
    spec.idempotency !== "required"
  ) {
    errors.push("write tools must declare spec.idempotency required");
  }
}

function validateFinding(document: Record<string, unknown>, errors: string[]): void {
  requireKind(document, "Finding", "humanmax.ai/finding/v1alpha1", errors);
  if (!isString(document.findingId) || !isString(document.ruleId)) {
    errors.push("findingId and ruleId are required");
  }
  if (!oneOf(document.result, RESULT_STATES)) {
    errors.push("result must be PASS, FAIL, UNKNOWN, or NEEDS_HUMAN_REVIEW");
  }
  if (!oneOf(document.severity, SEVERITIES)) {
    errors.push("severity is invalid");
  }
  if (!oneOf(document.confidence, CONFIDENCES)) {
    errors.push("confidence is invalid");
  }
  if (!isString(document.title) || !isString(document.message)) {
    errors.push("title and message are required");
  }
  const subject = nested(document.subject, "subject", errors);
  if (subject && (!isString(subject.type) || !isString(subject.id))) {
    errors.push("subject.type and subject.id are required");
  }
  if (!Array.isArray(document.locations)) {
    errors.push("locations must be an array");
  }
  if (!Array.isArray(document.evidence)) {
    errors.push("evidence must be an array");
  } else if (document.result === "PASS" && document.evidence.length === 0) {
    errors.push("PASS requires at least one evidence item");
  }
  const pack = nested(document.pack, "pack", errors);
  if (pack && (!isString(pack.id) || !isString(pack.version))) {
    errors.push("pack.id and pack.version are required");
  }
  const remediation = nested(document.remediation, "remediation", errors);
  if (remediation && !oneOf(remediation.classification, REMEDIATION_CLASSES)) {
    errors.push("remediation.classification is invalid");
  }
}

function validateException(
  document: Record<string, unknown>,
  errors: string[],
  now = todayUtc(),
): void {
  requireKind(document, "RiskException", "humanmax.ai/exception/v1alpha1", errors);
  const metadata = nested(document.metadata, "metadata", errors);
  if (metadata) {
    if (!isString(metadata.id) || !isString(metadata.createdAt) || !isString(metadata.expiresAt)) {
      errors.push("metadata.id, createdAt and expiresAt are required");
    } else if (metadata.expiresAt < now) {
      errors.push("exception has expired");
    }
  }
  const spec = nested(document.spec, "spec", errors);
  if (!spec) {
    return;
  }
  for (const key of ["ruleId", "owner", "approver", "rationale"] as const) {
    if (!isString(spec[key])) {
      errors.push(`spec.${key} is required`);
    }
  }
  const subject = nested(spec.subject, "spec.subject", errors);
  if (subject && (!isString(subject.type) || !isString(subject.id))) {
    errors.push("spec.subject.type and spec.subject.id are required");
  }
  if (!isStringArray(spec.compensatingControls) || !isStringArray(spec.evidenceRefs)) {
    errors.push("spec.compensatingControls and spec.evidenceRefs must be string arrays");
  }
  if (spec.reviewStatus !== "proposed" && spec.reviewStatus !== "approved") {
    errors.push("spec.reviewStatus must be proposed or approved");
  }
}

function validatePackLock(document: Record<string, unknown>, errors: string[]): void {
  requireKind(document, "PackLock", "humanmax.ai/pack-lock/v1alpha1", errors);
  if (!Array.isArray(document.packs) || document.packs.length === 0) {
    errors.push("packs must contain at least one locked pack");
    return;
  }
  for (const [index, pack] of document.packs.entries()) {
    if (!isRecord(pack)) {
      errors.push(`packs[${index}] must be an object`);
      continue;
    }
    if (!isString(pack.id) || !isString(pack.version) || !isString(pack.digest) || !isString(pack.publisherKeyId)) {
      errors.push(`packs[${index}] needs id, version, digest and publisherKeyId`);
    }
  }
}

function validateEvidence(document: Record<string, unknown>, errors: string[]): void {
  requireKind(
    document,
    "HarnessEvidenceManifest",
    "humanmax.ai/evidence/v1alpha1",
    errors,
  );
  if (!isString(document.generatedAt)) {
    errors.push("generatedAt is required");
  }
  const results = nested(document.results, "results", errors);
  if (results) {
    for (const key of ["pass", "fail", "unknown", "needsHumanReview"] as const) {
      if (!isNumber(results[key])) {
        errors.push(`results.${key} must be a number`);
      }
    }
  }
}

function validateCliResponse(document: Record<string, unknown>, errors: string[]): void {
  requireKind(document, "CliResponse", "humanmax.ai/cli-response/v1alpha1", errors);
  if (!isString(document.command)) {
    errors.push("command is required");
  }
  if (document.status !== "completed" && document.status !== "failed") {
    errors.push("status must be completed or failed");
  }
  if (typeof JSON.stringify(document) === "string" && /\u001b\[/.test(JSON.stringify(document))) {
    errors.push("CLI JSON must not contain ANSI sequences");
  }
}

function validateRule(document: Record<string, unknown>, errors: string[]): void {
  requireKind(document, "HarnessRuleMetadata", "humanmax.ai/rule/v1alpha1", errors);
  if (!isString(document.id) || !isString(document.version) || !isString(document.title)) {
    errors.push("id, version and title are required");
  }
  if (document.resultWhenMissing !== "UNKNOWN") {
    errors.push("resultWhenMissing must be UNKNOWN");
  }
  if (!oneOf(document.defaultSeverity, SEVERITIES)) {
    errors.push("defaultSeverity is invalid");
  }
  if (!oneOf(document.remediationClass, REMEDIATION_CLASSES)) {
    errors.push("remediationClass is invalid");
  }
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

export function applyException(finding: Finding, exception: RiskException): Finding {
  if (finding.ruleId !== exception.spec.ruleId) {
    throw new Error("exception ruleId does not match finding");
  }
  if (
    finding.subject.type !== exception.spec.subject.type ||
    finding.subject.id !== exception.spec.subject.id
  ) {
    throw new Error("exception subject does not match finding");
  }
  return {
    ...finding,
    governanceStatus: "accepted-risk",
  };
}
