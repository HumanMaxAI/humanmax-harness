import {
  isEffectful,
  type EnforcementDecision,
  type ProposedAction,
} from "@humanmax/contracts";

export type EnforcementContext = {
  productionEnforcement: "unconfigured";
};

export interface EnforcementAdapter {
  readonly id: string;
  assess(
    action: ProposedAction,
    context: EnforcementContext,
  ): Promise<EnforcementDecision>;
}

export class LocalReviewAdapter implements EnforcementAdapter {
  readonly id = "local-review";

  async assess(
    action: ProposedAction,
    _context: EnforcementContext,
  ): Promise<EnforcementDecision> {
    if (!isEffectful(action.effectClass)) {
      return { outcome: "ALLOW" };
    }
    return {
      outcome: "REQUIRE_REVIEW",
      reviewRef: `review_${action.runId}_${action.toolId}`,
    };
  }
}

export class DenyAllProductionAdapter implements EnforcementAdapter {
  readonly id = "deny-all-production";

  async assess(
    _action: ProposedAction,
    _context: EnforcementContext,
  ): Promise<EnforcementDecision> {
    return {
      outcome: "DENY",
      reasonCodes: ["production-enforcement-unconfigured"],
    };
  }
}
