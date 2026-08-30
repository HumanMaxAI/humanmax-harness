export type EnforcementOutcome =
  | "ALLOW"
  | "REQUIRE_REVIEW"
  | "DENY"
  | "UNAVAILABLE";

/**
 * Development and production-unconfigured adapters only.
 * This package provides mechanics and a seam. It does not issue production authority.
 */
export function productionEnforcementState(): "unconfigured" {
  return "unconfigured";
}
