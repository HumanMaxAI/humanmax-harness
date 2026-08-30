import type { ProductionEnforcementState } from "@humanmax/contracts";

/**
 * Layer 01 never claims production enforcement.
 */
export function productionEnforcementState(): ProductionEnforcementState {
  return "unconfigured";
}
