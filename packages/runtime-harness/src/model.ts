import type { PromptMessage } from "./prompt.ts";

type ModelStep =
  | { kind: "tool-call"; toolId: string; input: unknown }
  | { kind: "candidate-answer"; output: unknown }
  | { kind: "blocked"; reasonCodes: string[] };
export type { ModelStep };
export type ModelRequest = Readonly<{
  messages: readonly PromptMessage[];
  outputSchema: unknown;
  signal?: AbortSignal;
}>;
export interface ModelAdapter { next(request: ModelRequest): Promise<ModelStep> }

export function validateModelStep(value: unknown): { ok: true; value: ModelStep } | { ok: false; reasonCodes: string[] } {
  if (typeof value !== "object" || value === null || Array.isArray(value) || !("kind" in value)) return { ok: false, reasonCodes: ["model-step-invalid"] };
  const record = value as Record<string, unknown>;
  const exact = (keys: string[]) => Object.keys(record).every(k => keys.includes(k)) && keys.every(k => Object.hasOwn(record, k));
  const good = record.kind === "tool-call" ? exact(["kind", "toolId", "input"]) && typeof record.toolId === "string" && record.toolId.length > 0 :
    record.kind === "candidate-answer" ? exact(["kind", "output"]) :
    record.kind === "blocked" ? exact(["kind", "reasonCodes"]) && Array.isArray(record.reasonCodes) && record.reasonCodes.length > 0 && record.reasonCodes.length <= 8 && record.reasonCodes.every(x => typeof x === "string" && /^[a-z][a-z0-9-]{0,63}$/.test(x)) : false;
  return good ? { ok: true, value: value as ModelStep } : { ok: false, reasonCodes: ["model-step-invalid"] };
}

/** Offline fixture boundary. It does not approve or execute tool proposals. */
export class DeterministicFixtureModel implements ModelAdapter {
  private readonly output: unknown;
  constructor(output: unknown) { this.output = output; }
  async next(request: ModelRequest): Promise<ModelStep> {
    if (request.signal?.aborted) throw new Error("model-call-cancelled");
    return { kind: "candidate-answer", output: this.output };
  }
}
