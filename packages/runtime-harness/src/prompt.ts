import { createHash } from "node:crypto";
import { validate, type Prompt } from "@humanmax/contracts";
import { assertSupportedOutputSchema, canonicalJson, validateStructuredOutput } from "./output-schema.ts";

export type PromptMessage = Readonly<{ role: "system" | "user" | "assistant"; content: string }>;
export type ComposedPrompt = Readonly<{ messages: readonly PromptMessage[]; digest: string; promptId: string; promptVersion: string }>;

/** Composition is deterministic; task text is never interpolated into a trusted role. */
export function composePrompt(input: {
  prompt: Prompt;
  variables: Record<string, unknown>;
  outputSchema: unknown;
}): ComposedPrompt {
  const result = validate("Prompt", input.prompt);
  if (!result.ok) throw new Error(`prompt-invalid: ${result.errors.join("; ")}`);
  assertSupportedOutputSchema(input.outputSchema);
  const names = new Set(input.prompt.spec.variables.map(v => v.name));
  if (Object.keys(input.variables).some(key => !names.has(key)) ||
      [...names].some(name => typeof input.variables[name] !== "string" || (input.variables[name] as string).length === 0)) {
    throw new Error("prompt-variables-invalid");
  }
  for (const example of input.prompt.spec.examples) {
    if (!validateStructuredOutput(input.outputSchema, example.output).ok) throw new Error("prompt-example-output-invalid");
  }
  const system = [input.prompt.spec.role, ...input.prompt.spec.instructions,
    ...input.prompt.spec.toolGuidance, ...input.prompt.spec.recovery].join("\n");
  const messages: PromptMessage[] = [
    { role: "system", content: "Runtime boundary: tool proposals and completion require independent validation and action gating." },
    { role: "system", content: system },
    ...input.prompt.spec.examples.flatMap(example => [
      { role: "user" as const, content: example.input },
      { role: "assistant" as const, content: canonicalJson(example.output) },
    ]),
    { role: "user", content: input.variables.objective as string },
    ...[...names].filter(name => name !== "objective").sort().map(name => ({
      role: "user" as const,
      content: `Task data [${name}]: ${input.variables[name] as string}`,
    })),
  ];
  const digest = `sha256:${createHash("sha256").update(canonicalJson({ prompt: input.prompt, outputSchema: input.outputSchema })).digest("hex")}`;
  return { messages, digest, promptId: input.prompt.metadata.id, promptVersion: input.prompt.metadata.version };
}
