import {
  RESULT_STATES,
  validate,
  type CliResponse,
  type Finding,
  type ResultState,
  type Severity,
} from "@humanmax/contracts";
import { internalError } from "./errors.ts";

export const SARIF_VERSION = "2.1.0" as const;
export const SARIF_SCHEMA_URI =
  "https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json";

export type SarifLevel = "none" | "note" | "warning" | "error";
export type SarifKind = "pass" | "fail";

export type SarifMessage = { text: string };

export type SarifLocation = {
  physicalLocation: {
    artifactLocation: { uri: string; uriBaseId: string };
    region?: { startLine: number };
  };
};

export type SarifReportingDescriptor = {
  id: string;
  shortDescription: SarifMessage;
  fullDescription: SarifMessage;
  defaultConfiguration: { level: SarifLevel };
  helpUri?: string;
  properties: Record<string, unknown>;
};

export type SarifResult = {
  ruleId: string;
  ruleIndex: number;
  kind: SarifKind;
  level: SarifLevel;
  message: SarifMessage;
  locations?: SarifLocation[];
  partialFingerprints: Record<string, string>;
  properties: Record<string, unknown>;
};

export type SarifRun = {
  tool: {
    driver: {
      name: string;
      fullName: string;
      version: string;
      informationUri: string;
      rules: SarifReportingDescriptor[];
    };
  };
  invocations: Array<{
    executionSuccessful: boolean;
    properties: Record<string, unknown>;
  }>;
  results: SarifResult[];
  properties: Record<string, unknown>;
};

export type SarifLog = {
  $schema: string;
  version: typeof SARIF_VERSION;
  runs: SarifRun[];
};

/**
 * SARIF only treats `kind: "pass"` as a satisfied condition. UNKNOWN and
 * NEEDS_HUMAN_REVIEW are not satisfied conditions, and SARIF forces `level` to
 * "none" whenever `kind` is not "fail" — which most consumers render as no
 * problem at all. Mapping them to `kind: "fail"` keeps them visible and keeps
 * the exact state in `properties.humanmaxResult`, rather than letting a
 * consumer read absent evidence as a pass.
 */
export function sarifKind(result: ResultState): SarifKind {
  return result === "PASS" ? "pass" : "fail";
}

export function sarifLevel(result: ResultState, severity: Severity): SarifLevel {
  if (result === "PASS") {
    return "none";
  }
  if (result === "FAIL") {
    return "error";
  }
  return severity === "high" || severity === "critical" ? "error" : "warning";
}

export function toSarif(response: CliResponse): SarifLog {
  const findings = response.results.map(asFinding);
  const rules = describeRules(findings);
  const ruleIndex = new Map(rules.map((rule, index) => [rule.id, index]));
  return {
    $schema: SARIF_SCHEMA_URI,
    version: SARIF_VERSION,
    runs: [
      {
        tool: {
          driver: {
            name: "humanmax",
            fullName: "HumanMax Agent Harness (Preview)",
            version: response.versions.cli,
            informationUri: "https://github.com/HumanMaxAI/humanmax-harness",
            rules,
          },
        },
        invocations: [
          {
            executionSuccessful: response.status === "completed",
            properties: {
              command: response.command,
              status: response.status,
            },
          },
        ],
        results: findings.map((finding) =>
          toSarifResult(finding, ruleIndex.get(finding.ruleId) ?? 0),
        ),
        properties: {
          command: response.command,
          status: response.status,
          versions: response.versions,
          project: response.project,
          summary: response.summary,
          resultStates: countStates(findings),
          coverage: response.coverage,
          resultStateMapping: {
            PASS: "kind=pass, level=none",
            FAIL: "kind=fail, level=error",
            UNKNOWN: "kind=fail, level=error|warning; absence of evidence is not a pass",
            NEEDS_HUMAN_REVIEW: "kind=fail, level=error|warning; a human decision is outstanding",
          },
        },
      },
    ],
  };
}

function toSarifResult(finding: Finding, ruleIndex: number): SarifResult {
  const locations = finding.locations.map(toSarifLocation);
  const result: SarifResult = {
    ruleId: finding.ruleId,
    ruleIndex,
    kind: sarifKind(finding.result),
    level: sarifLevel(finding.result, finding.severity),
    message: {
      text: `${finding.result}: ${finding.title}. ${finding.message}`,
    },
    partialFingerprints: { humanmaxFindingId: finding.findingId },
    properties: {
      humanmaxResult: finding.result,
      humanmaxSeverity: finding.severity,
      findingId: finding.findingId,
      confidence: finding.confidence,
      pack: finding.pack,
      ruleVersion: finding.ruleVersion,
      subject: finding.subject,
      controlRefs: finding.controlRefs,
      remediation: finding.remediation,
      governanceStatus: finding.governanceStatus ?? "open",
    },
  };
  if (locations.length > 0) {
    result.locations = locations;
  }
  return result;
}

function toSarifLocation(location: Finding["locations"][number]): SarifLocation {
  const physicalLocation: SarifLocation["physicalLocation"] = {
    artifactLocation: { uri: location.file, uriBaseId: "SRCROOT" },
  };
  if (typeof location.line === "number") {
    physicalLocation.region = { startLine: location.line };
  }
  return { physicalLocation };
}

function describeRules(findings: Finding[]): SarifReportingDescriptor[] {
  const rules = new Map<string, SarifReportingDescriptor>();
  for (const finding of findings) {
    const existing = rules.get(finding.ruleId);
    if (!existing) {
      const descriptor: SarifReportingDescriptor = {
        id: finding.ruleId,
        shortDescription: {
          text: `HumanMax rule ${finding.ruleId} from pack ${finding.pack.id}@${finding.pack.version}.`,
        },
        fullDescription: {
          text: "Each result carries its HumanMax state in properties.humanmaxResult. PASS, FAIL, UNKNOWN and NEEDS_HUMAN_REVIEW are distinct states; only PASS is a satisfied condition.",
        },
        defaultConfiguration: { level: severityLevel(finding.severity) },
        properties: {
          humanmaxSeverity: finding.severity,
          pack: finding.pack,
          ruleVersion: finding.ruleVersion,
          controlRefs: finding.controlRefs,
        },
      };
      if (finding.documentationUri) {
        descriptor.helpUri = finding.documentationUri;
      }
      rules.set(finding.ruleId, descriptor);
      continue;
    }
    const level = severityLevel(finding.severity);
    if (levelRank(level) > levelRank(existing.defaultConfiguration.level)) {
      existing.defaultConfiguration.level = level;
      existing.properties.humanmaxSeverity = finding.severity;
    }
  }
  return [...rules.values()];
}

function severityLevel(severity: Severity): SarifLevel {
  if (severity === "high" || severity === "critical") {
    return "error";
  }
  if (severity === "medium") {
    return "warning";
  }
  return "note";
}

function levelRank(level: SarifLevel): number {
  return ["none", "note", "warning", "error"].indexOf(level);
}

function countStates(findings: Finding[]): Record<ResultState, number> {
  const counts = Object.fromEntries(
    RESULT_STATES.map((state) => [state, 0]),
  ) as Record<ResultState, number>;
  for (const finding of findings) {
    counts[finding.result] += 1;
  }
  return counts;
}

function asFinding(result: unknown): Finding {
  const checked = validate("Finding", result);
  if (!checked.ok) {
    throw internalError(
      `SARIF output requires Finding results: ${checked.errors.join("; ")}`,
    );
  }
  return checked.value;
}
