import { findingId } from "./finding-id.ts";
import type {
  Finding,
  HarnessProject,
  RiskException,
  Tool,
} from "./types.ts";

export function previewProject(): HarnessProject {
  return {
    apiVersion: "humanmax.ai/harness/v1alpha1",
    kind: "HarnessProject",
    metadata: {
      projectId: "customer-service-agent",
      owners: [{ team: "TODO" }],
    },
    spec: {
      generator: {
        version: "0.0.0",
        template: "tool-agent",
        language: "typescript",
        modelAdapter: "generic",
      },
      profiles: ["base"],
      autonomy: "assisted",
      runtime: {
        defaultBudgets: {
          maxSteps: 12,
          maxToolCalls: 8,
          timeoutSeconds: 120,
        },
        undeclaredEffect: "deny",
        productionEnforcement: "unconfigured",
        enforcementAdapter: "local-review",
      },
      include: ["src/**", "evals/**", "tests/**"],
      exclude: [
        "node_modules/**",
        "dist/**",
        ".git/**",
        ".humanmax/evidence/**",
      ],
      ci: {
        failOn: "high",
        unknownAsFailureFor: ["critical", "high"],
      },
    },
  };
}

export function previewTool(): Tool {
  return {
    apiVersion: "humanmax.ai/harness/v1alpha1",
    kind: "Tool",
    metadata: { id: "crm-customer-update" },
    spec: {
      effectClass: "reversible-write",
      gateway: "required",
      inputSchemaRef: "#/schemas/crm-customer-update-input",
      outputSchemaRef: "#/schemas/crm-customer-update-output",
      resourceScope: "crm.customer",
      idempotency: "required",
    },
  };
}

export function failFinding(): Finding {
  const subject = { type: "tool", id: "crm-customer-update" };
  const location = {
    file: ".humanmax/tools/crm-update.tool.yaml",
    line: 14,
  };
  return {
    apiVersion: "humanmax.ai/finding/v1alpha1",
    kind: "Finding",
    findingId: findingId({
      ruleId: "HMX-TOOL-004",
      subject,
      location,
    }),
    ruleId: "HMX-TOOL-004",
    ruleVersion: "1.2.0",
    pack: { id: "base", version: "0.1.0" },
    result: "FAIL",
    severity: "high",
    confidence: "deterministic",
    title: "Effectful tool has no declared approval policy",
    message:
      "crm-customer-update is declared as a reversible write but has no disposition or approval mapping.",
    subject,
    locations: [location],
    evidence: [{ type: "declaration", ref: "sha256:abc" }],
    controlRefs: ["base.effectful-action-approval"],
    remediation: {
      classification: "review-required",
      summary: "Declare the runtime disposition and eligible approval role.",
      requiredFields: ["defaultDisposition", "eligibleApproverRoles"],
    },
    governanceStatus: "open",
  };
}

export function approvedException(): RiskException {
  return {
    apiVersion: "humanmax.ai/exception/v1alpha1",
    kind: "RiskException",
    metadata: {
      id: "exception_preview",
      createdAt: "2026-08-28",
      expiresAt: "2026-10-28",
    },
    spec: {
      ruleId: "HMX-TOOL-004",
      subject: { type: "tool", id: "crm-customer-update" },
      owner: "customer-operations",
      approver: "operational-risk-officer",
      rationale:
        "Temporary legacy workflow while gateway integration is completed",
      compensatingControls: [
        "Daily manual reconciliation",
        "Restricted service credential",
      ],
      evidenceRefs: ["evidence://change-ticket/CHG-1234"],
      reviewStatus: "approved",
    },
  };
}
