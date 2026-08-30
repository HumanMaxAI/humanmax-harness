import { RESULT_STATES, type ResultState } from "@humanmax/contracts";

export { RESULT_STATES, type ResultState };

/**
 * Deterministic inspection and rule evaluation.
 * This package must not grow network, filesystem-write, or model dependencies.
 */
export function isResultState(value: string): value is ResultState {
  return (RESULT_STATES as readonly string[]).includes(value);
}
