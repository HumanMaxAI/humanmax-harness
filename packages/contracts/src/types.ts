import type {
  AutonomyTier,
  Confidence,
  DocumentKind,
  EffectClass,
  GatewayMode,
  GovernanceStatus,
  PreviewEnforcementAdapter,
  PreviewLanguage,
  PreviewTemplate,
  ProductionEnforcementState,
  RemediationClass,
  ResultState,
  Severity,
} from "./identifiers.ts";

export type SubjectRef = {
  type: string;
  id: string;
};

export type FileLocation = {
  file: string;
  line?: number;
};

export type HarnessProject = {
  apiVersion: "humanmax.ai/harness/v1alpha1";
  kind: "HarnessProject";
  metadata: {
    projectId: string;
    owners: Array<{ team: string }>;
  };
  spec: {
    generator: {
      version: string;
      template: PreviewTemplate;
      language: PreviewLanguage;
      modelAdapter: string;
    };
    profiles: string[];
    autonomy: AutonomyTier;
    runtime: {
      defaultBudgets: {
        maxSteps: number;
        maxToolCalls: number;
        timeoutSeconds: number;
      };
      undeclaredEffect: "deny";
      productionEnforcement: ProductionEnforcementState;
      enforcementAdapter: PreviewEnforcementAdapter;
    };
    include: string[];
    exclude: string[];
    ci: {
      failOn: Severity;
      unknownAsFailureFor: Severity[];
    };
  };
};

export type Agent = {
  apiVersion: "humanmax.ai/harness/v1alpha1";
  kind: "Agent";
  metadata: {
    id: string;
    version: string;
    owners: {
      business: string;
      technical: string;
      risk: string;
    };
  };
  spec: {
    purpose: string;
    autonomyTier: AutonomyTier;
    prohibitedActions: string[];
    tools: string[];
    manualFallback: string;
    reviewExpiresAt: string;
  };
};

export type Tool = {
  apiVersion: "humanmax.ai/harness/v1alpha1";
  kind: "Tool";
  metadata: {
    id: string;
  };
  spec: {
    effectClass: EffectClass;
    gateway: GatewayMode;
    inputSchemaRef: string;
    outputSchemaRef: string;
    resourceScope?: string;
    idempotency?: "required" | "not-applicable";
  };
};

export type FindingEvidence = {
  type: string;
  ref: string;
};

export type Finding = {
  apiVersion: "humanmax.ai/finding/v1alpha1";
  kind: "Finding";
  findingId: string;
  ruleId: string;
  ruleVersion: string;
  pack: {
    id: string;
    version: string;
  };
  result: ResultState;
  severity: Severity;
  confidence: Confidence;
  title: string;
  message: string;
  subject: SubjectRef;
  locations: FileLocation[];
  evidence: FindingEvidence[];
  controlRefs: string[];
  remediation: {
    classification: RemediationClass;
    summary: string;
    requiredFields?: string[];
  };
  documentationUri?: string;
  governanceStatus?: GovernanceStatus;
};

export type RiskException = {
  apiVersion: "humanmax.ai/exception/v1alpha1";
  kind: "RiskException";
  metadata: {
    id: string;
    createdAt: string;
    expiresAt: string;
  };
  spec: {
    ruleId: string;
    subject: SubjectRef;
    owner: string;
    approver: string;
    rationale: string;
    compensatingControls: string[];
    evidenceRefs: string[];
    reviewStatus: "proposed" | "approved";
  };
};

export type PackLock = {
  apiVersion: "humanmax.ai/pack-lock/v1alpha1";
  kind: "PackLock";
  packs: Array<{
    id: string;
    version: string;
    digest: string;
    publisherKeyId: string;
  }>;
};

export type HarnessEvidenceManifest = {
  apiVersion: "humanmax.ai/evidence/v1alpha1";
  kind: "HarnessEvidenceManifest";
  generatedAt: string;
  generator: {
    cliVersion: string;
    coreVersion: string;
    contractVersion: string;
  };
  project: {
    id: string;
    gitRevision: string;
    dirtyWorkingTree: boolean;
  };
  packs: {
    lockDigest: string;
  };
  results: {
    pass: number;
    fail: number;
    unknown: number;
    needsHumanReview: number;
  };
  artifacts: Array<{
    path: string;
    digest: string;
  }>;
};

export type CliResponse = {
  apiVersion: "humanmax.ai/cli-response/v1alpha1";
  kind: "CliResponse";
  command: string;
  status: "completed" | "failed";
  versions: {
    cli: string;
    core: string;
    contracts: string;
  };
  project: {
    root: string;
    configDigest: string;
    packLockDigest: string;
  };
  summary: {
    pass: number;
    fail: number;
    unknown: number;
    needsHumanReview: number;
  };
  results: unknown[];
  coverage: {
    skippedPaths: string[];
    limitations: string[];
  };
};

export type HarnessRuleMetadata = {
  apiVersion: "humanmax.ai/rule/v1alpha1";
  kind: "HarnessRuleMetadata";
  id: string;
  version: string;
  title: string;
  family: string;
  defaultSeverity: Severity;
  appliesTo: string[];
  requiresEvidence: string[];
  resultWhenMissing: "UNKNOWN";
  remediationClass: RemediationClass;
  controlRefs: string[];
};

export type ProposedAction = {
  toolId: string;
  agentId: string;
  runId: string;
  effectClass: EffectClass;
};

export type EnforcementDecision =
  | { outcome: "ALLOW"; authorization?: string }
  | { outcome: "REQUIRE_REVIEW"; reviewRef: string }
  | { outcome: "DENY"; reasonCodes: string[] }
  | { outcome: "UNAVAILABLE"; retryable: boolean };

export type HarnessDocument =
  | HarnessProject
  | Agent
  | Tool
  | Finding
  | RiskException
  | PackLock
  | HarnessEvidenceManifest
  | CliResponse
  | HarnessRuleMetadata;

export type ValidationSuccess<T> = { ok: true; value: T };
export type ValidationFailure = { ok: false; errors: string[] };
export type ValidationResult<T> = ValidationSuccess<T> | ValidationFailure;

export type ValidateOptions = {
  now?: string;
};

export type KindMap = {
  HarnessProject: HarnessProject;
  Agent: Agent;
  Tool: Tool;
  Finding: Finding;
  RiskException: RiskException;
  PackLock: PackLock;
  HarnessEvidenceManifest: HarnessEvidenceManifest;
  CliResponse: CliResponse;
  HarnessRuleMetadata: HarnessRuleMetadata;
};

export type DocumentFor<K extends DocumentKind> = KindMap[K];
