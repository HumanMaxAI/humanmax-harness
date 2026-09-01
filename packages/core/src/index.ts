import { RESULT_STATES, type ResultState } from "@humanmax/contracts";
import { evaluate, summarise } from "./evaluate.ts";

export { RESULT_STATES, type ResultState, evaluate, summarise };
export type { EvaluationInput, EvaluationResult, EvaluationSummary } from "./evaluate.ts";

/**
 * Deterministic inspection and rule evaluation.
 * This package must not grow network, filesystem-write, or model dependencies.
 */
export function isResultState(value: string): value is ResultState {
  return (RESULT_STATES as readonly string[]).includes(value);
}
