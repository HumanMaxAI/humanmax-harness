import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isEffectful,
  requiredGateway,
  type EffectClass,
  type FileOwnershipClass,
} from "@humanmax/contracts";
import {
  defaultCreateOptions,
  fileDigest,
  type GenerateFile,
  type GeneratePlan,
  writeGeneratedFiles,
} from "./generate.ts";

export type AddRequest = {
  destination: string;
  id: string;
  dryRun?: boolean;
  apply?: boolean;
};

export type AddToolRequest = AddRequest & {
  effect: EffectClass;
};

function assertIdentifier(id: string): void {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) {
    throw new Error(`Invalid identifier: ${id}`);
  }
}

function camelName(id: string): string {
  const camel = id.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());
  return `${camel}Tool`;
}

export function addTool(request: AddToolRequest): GeneratePlan {
  assertIdentifier(request.id);
  const destination = request.destination;
  const yamlPath = `.humanmax/tools/${request.id}.tool.yaml`;
  if (existsSync(join(destination, yamlPath))) {
    throw new Error(`Tool identifier already exists: ${request.id}`);
  }

  const gateway = requiredGateway(request.effect);
  const idempotency = isEffectful(request.effect) ? "required" : "not-applicable";
  const yaml = `apiVersion: humanmax.ai/harness/v1alpha1
kind: Tool
metadata:
  id: ${request.id}
spec:
  effectClass: ${request.effect}
  gateway: ${gateway}
  inputSchemaRef: "#/schemas/${request.id}-input"
  outputSchemaRef: "#/schemas/${request.id}-output"
  idempotency: ${idempotency}
`;
  const constName = camelName(request.id);
  const toolsPath = join(destination, "src/tools.ts");
  const existingTools = existsSync(toolsPath)
    ? readFileSync(toolsPath, "utf8")
    : `import type { Tool } from "@humanmax/contracts";\n`;
  const toolsSource = `${existingTools.trimEnd()}

export const ${constName}: Tool = {
  apiVersion: "humanmax.ai/harness/v1alpha1",
  kind: "Tool",
  metadata: { id: "${request.id}" },
  spec: {
    effectClass: "${request.effect}",
    gateway: "${gateway}",
    inputSchemaRef: "#/schemas/${request.id}-input",
    outputSchemaRef: "#/schemas/${request.id}-output",
    ${isEffectful(request.effect) ? `resourceScope: "${request.id}",\n    ` : ""}idempotency: "${idempotency}",
  },
};
`;
  const testSource = `import assert from "node:assert/strict";
import { test } from "node:test";
import { createRuntime, LocalReviewAdapter } from "@humanmax/runtime-harness";
import { ${constName} } from "../src/tools.ts";

test("${request.id} stays on the action gateway", async () => {
  let executed = false;
  const runtime = createRuntime({ adapter: new LocalReviewAdapter() });
  runtime.registerTool(${constName}, async () => {
    executed = true;
    return { ok: true };
  });
  const run = runtime.startRun({
    agentId: "default",
    budgets: { maxSteps: 4, maxToolCalls: 2, timeoutSeconds: 30 },
  });
  const result = await runtime.invokeTool(run.id, "${request.id}", {});
  ${
    isEffectful(request.effect)
      ? `assert.equal(result.status, "review");
  assert.equal(executed, false);`
      : `assert.equal(result.status, "ok");
  assert.equal(executed, true);`
  }
});
`;

  const files: GenerateFile[] = [
    file(yamlPath, "canonical", yaml),
    file("src/tools.ts", "user-owned", toolsSource),
    file(`tests/${request.id}.test.ts`, "user-owned", testSource),
  ];

  const agentPath = join(destination, ".humanmax/agents/default.agent.yaml");
  if (existsSync(agentPath)) {
    const agent = readFileSync(agentPath, "utf8");
    if (!agent.includes(`- ${request.id}`)) {
      files.push(
        file(
          ".humanmax/agents/default.agent.yaml",
          "canonical",
          agent.replace(/tools:\n/, `tools:\n    - ${request.id}\n`),
        ),
      );
    }
  }

  const plan: GeneratePlan = {
    destination,
    name: request.id,
    options: defaultCreateOptions(),
    files,
    wrote: false,
  };
  if (request.dryRun) {
    return plan;
  }
  writeGeneratedFiles(destination, files);
  updateLock(destination, files);
  plan.wrote = true;
  return plan;
}

export function addEval(request: AddRequest): GeneratePlan {
  assertIdentifier(request.id);
  const destination = request.destination;
  const path = `evals/${request.id}.eval.ts`;
  if (existsSync(join(destination, path)) && !request.apply) {
    throw new Error(`Eval already exists: ${request.id}`);
  }
  const contents = `export const ${camelName(request.id).replace(/Tool$/, "Eval")} = {
  id: "${request.id}",
  resultWhenFailed: "FAIL",
  note: "Harness cannot rewrite FAIL, UNKNOWN, or NEEDS_HUMAN_REVIEW to PASS.",
};
`;
  const files = [file(path, "user-owned", contents)];
  const plan: GeneratePlan = {
    destination,
    name: request.id,
    options: defaultCreateOptions(),
    files,
    wrote: false,
  };
  if (request.dryRun) {
    return plan;
  }
  writeGeneratedFiles(destination, files);
  updateLock(destination, files);
  plan.wrote = true;
  return plan;
}

function file(
  path: string,
  ownership: FileOwnershipClass,
  contents: string,
): GenerateFile {
  return { path, ownership, contents };
}

function updateLock(destination: string, files: GenerateFile[]): void {
  const lockPath = join(destination, ".humanmax/generator.lock");
  if (!existsSync(lockPath)) {
    return;
  }
  const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
    files?: Record<string, { class: string; digest: string }>;
  };
  lock.files ??= {};
  for (const item of files) {
    lock.files[item.path] = {
      class: item.ownership,
      digest: fileDigest(item.contents),
    };
  }
  writeGeneratedFiles(destination, [
    file(
      ".humanmax/generator.lock",
      "generated",
      `${JSON.stringify(lock, null, 2)}\n`,
    ),
  ]);
}
