import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { FileOwnershipClass } from "@humanmax/contracts";
import { harnessDependencies, type DependencyMode } from "./dependencies.ts";
import { generatedPackFiles } from "./pack-lock.ts";

export const PREVIEW_TEMPLATE = "tool-agent" as const;
export const PREVIEW_PROFILE = "base" as const;
export const GENERATOR_VERSION = "0.2.1";

export function defaultCreateOptions() {
  return {
    language: "typescript" as const,
    template: PREVIEW_TEMPLATE,
    modelAdapter: "generic" as const,
    autonomy: "assisted" as const,
    profiles: [PREVIEW_PROFILE] as const,
    ci: "github" as const,
  };
}

export type CreateOptions = ReturnType<typeof defaultCreateOptions>;

export type GenerateFile = {
  path: string;
  contents: string;
  ownership: FileOwnershipClass;
};

export type GeneratePlan = {
  destination: string;
  name: string;
  options: CreateOptions;
  files: GenerateFile[];
  wrote: boolean;
};

export type GenerateRequest = {
  destination: string;
  name: string;
  dryRun?: boolean;
  apply?: boolean;
  options?: Partial<CreateOptions>;
  /** Explicit repository fixture mode; the create CLI always uses published dependencies. */
  dependencyMode?: DependencyMode;
};

export function generateProject(request: GenerateRequest): GeneratePlan {
  const options = { ...defaultCreateOptions(), ...request.options };
  if (options.template !== "tool-agent") {
    throw new Error("Preview only generates the tool-agent template");
  }
  if (options.language !== "typescript") {
    throw new Error("Preview only generates TypeScript");
  }
  const destination = resolve(request.destination);
  const files = renderFiles(request.name, destination, options, request.dependencyMode ?? "published");
  const plan: GeneratePlan = {
    destination,
    name: request.name,
    options,
    files,
    wrote: false,
  };

  if (request.dryRun) {
    return plan;
  }

  const collision = hasCollision(destination);
  if (collision && !request.apply) {
    throw new Error(
      `Refusing to write a non-empty destination without apply: ${destination}`,
    );
  }

  writeGeneratedFiles(destination, files);
  plan.wrote = true;
  return plan;
}

function hasCollision(destination: string): boolean {
  if (!existsSync(destination)) {
    return false;
  }
  try {
    return readdirSync(destination).length > 0;
  } catch {
    return true;
  }
}

function renderFiles(
  name: string,
  destination: string,
  options: CreateOptions,
  dependencyMode: DependencyMode,
): GenerateFile[] {
  const lockFiles: Record<string, { class: FileOwnershipClass; digest: string }> =
    {};

  const pack = generatedPackFiles();
  const files: GenerateFile[] = [
    file("package.json", "mergeable", packageJson(name, destination, dependencyMode)),
    file("tsconfig.json", "mergeable", tsconfig()),
    file("README.md", "mergeable", readme(name, dependencyMode)),
    file("SECURITY.md", "mergeable", securityMd(name)),
    file("AGENTS.md", "mergeable", agentsMd()),
    file(".gitignore", "generated", gitignore()),
    file(".env.example", "generated", "# No provider credentials required for the fixture run.\n"),
    file(".humanmax/project.yaml", "canonical", projectYaml(name, options)),
    file(".humanmax/packs.lock", "canonical", packsLock(pack.digest)),
    ...pack.files,
    file(".humanmax/agents/default.agent.yaml", "canonical", agentYaml()),
    file(
      ".humanmax/tools/knowledge-read.tool.yaml",
      "canonical",
      toolYaml("knowledge-read", "read", "not-applicable", "not-applicable"),
    ),
    file(
      ".humanmax/tools/notes-write.tool.yaml",
      "canonical",
      toolYaml("notes-write", "reversible-write", "required", "required"),
    ),
    file("src/tools.ts", "user-owned", toolsTs()),
    file("src/index.ts", "user-owned", indexTs()),
    file("tests/gateway.test.ts", "user-owned", gatewayTestTs()),
    file("evals/gateway.eval.ts", "user-owned", gatewayEvalTs()),
    file(
      "skills/humanmax-agent-harness/SKILL.md",
      "mergeable",
      generatedSkillMd(),
    ),
    file(".github/workflows/humanmax.yml", "mergeable", workflowYml()),
  ];

  for (const item of files) {
    lockFiles[item.path] = {
      class: item.ownership,
      digest: fileDigest(item.contents),
    };
  }

  files.push(
    file(
      ".humanmax/generator.lock",
      "generated",
      `${JSON.stringify(
        {
          generatorVersion: GENERATOR_VERSION,
          template: options.template,
          profiles: [...options.profiles],
          files: lockFiles,
        },
        null,
        2,
      )}\n`,
    ),
  );
  return files;
}

function file(
  path: string,
  ownership: FileOwnershipClass,
  contents: string,
): GenerateFile {
  return { path, ownership, contents };
}

export function fileDigest(contents: string): string {
  return `sha256:${createHash("sha256").update(contents).digest("hex")}`;
}

export function writeGeneratedFiles(
  destination: string,
  files: GenerateFile[],
): void {
  for (const file of files) {
    const fullPath = join(destination, file.path);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.contents);
  }
}

function packageJson(name: string, destination: string, mode: DependencyMode): string {
  const { dependencies, devDependencies } = harnessDependencies(destination, mode);
  // Only explicit repository fixtures pin transitive packages to a local checkout.
  const overrides = { ...dependencies, ...devDependencies };
  return `${JSON.stringify(
    {
      name,
      version: "0.0.0",
      private: true,
      type: "module",
      engines: { node: ">=26" },
      scripts: {
        build: "tsc -p tsconfig.json",
        typecheck: "tsc -p tsconfig.json --noEmit",
        start: "node --experimental-strip-types src/index.ts",
        test: "node --test --experimental-strip-types tests/*.test.ts",
        humanmax: "humanmax",
      },
      dependencies,
      devDependencies: { ...devDependencies, typescript: "5.9.2", "@types/node": "26.6.6" },
      ...(mode === "local-file" ? { overrides } : {}),
    },
    null,
    2,
  )}\n`;
}

function tsconfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: "ES2022",
        module: "Node16",
        moduleResolution: "Node16",
        strict: true,
        rootDir: ".",
        outDir: "dist",
        types: ["node"],
        rewriteRelativeImportExtensions: true,
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
      },
      include: ["src/**/*.ts", "tests/**/*.ts", "evals/**/*.ts"],
    },
    null,
    2,
  )}\n`;
}

function readme(name: string, mode: DependencyMode): string {
  return `# ${name}

This is a HumanMax Agent Harness Preview starter (\`tool-agent\` + \`base\`).
The default entry point runs a gateway fixture. It needs no provider credentials or HumanMax account.

## Describe your application

Before you share this project, replace this section with its purpose, features, and actual entry point.
The generator uses the project name. It does not infer application features or update this README after code changes.
When you add application behavior, update the run instructions and [SECURITY.md](./SECURITY.md).

## Run the starter

Use Node.js 26 or later. Run these commands from the project directory.

1. Install dependencies with \`npm install\`. Commit the resulting \`package-lock.json\`.
2. Compile with \`npm run build\`. The command must exit with code 0.
3. Check types with \`npm run typecheck\`. The command must exit with code 0.
4. Run \`npm start\`. The fixture returns \`read: ok\`, \`write: review\`, and \`writeExecuted: false\`.
5. Run \`npm test\` and \`npm run humanmax -- test --format json\`. Both commands must exit with code 0.
6. Run \`npm run humanmax -- doctor --format json\` and \`npm run humanmax -- generate --check --format json\`. Inspect the reported findings.

\`npm start\` runs \`src/index.ts\`. If you add a server, document its command and URL here.

## Files to maintain

- \`README.md\`: application purpose, features, entry points, commands, and current limitations.
- \`SECURITY.md\`: reporting channel, data handling, tool effects, and deployment boundaries.
- \`.humanmax/\`: canonical project, agent, and tool declarations, plus pack and generator receipts.
- \`src/\`, \`tests/\`, and \`evals/\`: application code and its verification.
- \`AGENTS.md\` and \`skills/humanmax-agent-harness/SKILL.md\`: derived agent instructions.

Add a read tool with \`npm run humanmax -- add tool my-read --effect read --dry-run\`.
Inspect the plan before you rerun the command without \`--dry-run\`.
For a reversible write tool, use \`--effect reversible-write\`. Choose a project-specific tool identifier.
Add an eval with \`npm run humanmax -- add eval my-eval\`.
An added eval needs an \`evaluate()\` implementation. Until then, it reports \`UNKNOWN\` and blocks \`humanmax test\`.

## Security and verification boundaries

Read tools execute through the registry. Write tools stop at the action gateway with \`review\`.
The default write handler does not run. Production enforcement stays \`unconfigured\`.

Results are \`PASS\`, \`FAIL\`, \`UNKNOWN\`, and \`NEEDS_HUMAN_REVIEW\`.
A check that did not run remains \`UNKNOWN\`. A local pass does not establish production enforcement or certification.

${mode === "published" ? "Dependencies are pinned public npm packages. This project does not depend on the generator checkout or bootstrap cache." : "Repository fixture mode uses local file dependencies. The generating checkout must remain available. The create CLI does not use this mode."}

\`.github/workflows/humanmax.yml\` runs manually. Run it before claiming a hosted check passed.
Use \`npm run humanmax -- upgrade --dry-run --format json\` to inspect proposed upgrades.
Full upgrade apply remains outside Preview. Review document and control changes before updating their receipt entries.
`;
}

function securityMd(name: string): string {
  return `# Security for ${name}

## Reporting a vulnerability

Private reporting channel: not configured.
The project maintainer must publish a private reporting channel before sharing this project with other users.
A response time and supported-version policy have not been defined.
Do not put credentials, private data, or exploit details in public issues.

## Starter boundaries

The starter uses a local gateway fixture. No model provider or production approval service is configured.
Read tools execute through the declared registry. Effectful tools must use the action gateway.
The local review adapter returns \`review\` and stops the default write handler.
\`productionEnforcement\` remains \`unconfigured\`. Passing local checks does not prove production enforcement or certification.

Canonical control decisions live in \`.humanmax/\`. This document does not grant approval or create an exception.

## Maintain this policy

1. Configure the private reporting channel and supported-version policy.
2. When you add application behavior, document its data, external services, tool effects, and network exposure here.
3. Keep credentials and real evidence payloads out of version control.
4. Before deployment, review authentication, authorization, data retention, and operational controls for the actual application.
5. Update this policy and README when those boundaries change. Record the checks that ran and any remaining \`UNKNOWN\` results.
`;
}

function agentsMd(): string {
  return `# Generated agent instructions

Canonical control decisions live in \`.humanmax/\`. This file is a derived view.

- Add tools through the project generator or typed declarations plus gateway tests.
- Do not create a second tool registry or call effectful APIs outside the action gateway.
- Do not treat a green local run as production enforcement or compliance certification.

## Maintain project documentation

1. When application behavior, entry points, or commands change, update README.md in the same change.
2. When data flows, tool effects, external services, or deployment boundaries change, update SECURITY.md.
3. Replace starter descriptions with observed application behavior. Do not claim that a feature exists without checking it.
4. Keep an unconfigured reporting channel explicit. Do not invent a security contact, owner, response SLA, or approval.
5. Preview tracked document changes and review their receipt updates. Preserve unrelated files and receipt entries.
`;
}

function gitignore(): string {
  return `node_modules/
dist/
.env
.humanmax/evidence/
`;
}

function projectYaml(name: string, options: CreateOptions): string {
  return `apiVersion: humanmax.ai/harness/v1alpha1
kind: HarnessProject
metadata:
  projectId: ${name}
  owners:
    - team: TODO
spec:
  generator:
    version: ${GENERATOR_VERSION}
    template: ${options.template}
    language: ${options.language}
    modelAdapter: ${options.modelAdapter}
  profiles:
    - base
  autonomy: ${options.autonomy}
  runtime:
    defaultBudgets:
      maxSteps: 12
      maxToolCalls: 8
      timeoutSeconds: 120
    undeclaredEffect: deny
    productionEnforcement: unconfigured
    enforcementAdapter: local-review
  include:
    - src/**
    - tests/**
    - evals/**
  exclude:
    - node_modules/**
    - dist/**
    - .git/**
    - .humanmax/evidence/**
  ci:
    failOn: high
    unknownAsFailureFor:
      - critical
      - high
`;
}

function packsLock(digest: string): string {
  return `apiVersion: humanmax.ai/pack-lock/v1alpha1
kind: PackLock
packs:
  - id: base
    version: 0.0.0
    digest: ${digest}
    publisherKeyId: humanmax-community-2026
`;
}

function agentYaml(): string {
  return `apiVersion: humanmax.ai/harness/v1alpha1
kind: Agent
metadata:
  id: default
  version: 0.0.0
  owners:
    business: TODO
    technical: TODO
    risk: TODO
spec:
  purpose: Preview tool-agent with one read tool and one reversible write tool
  autonomyTier: assisted
  prohibitedActions:
    - claim-production-enforcement
  tools:
    - knowledge-read
    - notes-write
  manualFallback: developer-review
  reviewExpiresAt: TODO
`;
}

function toolYaml(
  id: string,
  effectClass: string,
  gateway: string,
  idempotency: string,
): string {
  return `apiVersion: humanmax.ai/harness/v1alpha1
kind: Tool
metadata:
  id: ${id}
spec:
  effectClass: ${effectClass}
  gateway: ${gateway}
  inputSchemaRef: "#/schemas/${id}-input"
  outputSchemaRef: "#/schemas/${id}-output"
  idempotency: ${idempotency}
`;
}

function toolsTs(): string {
  return `import type { Tool } from "@humanmax/contracts";

export const knowledgeReadTool: Tool = {
  apiVersion: "humanmax.ai/harness/v1alpha1",
  kind: "Tool",
  metadata: { id: "knowledge-read" },
  spec: {
    effectClass: "read",
    gateway: "not-applicable",
    inputSchemaRef: "#/schemas/knowledge-read-input",
    outputSchemaRef: "#/schemas/knowledge-read-output",
    idempotency: "not-applicable",
  },
};

export const notesWriteTool: Tool = {
  apiVersion: "humanmax.ai/harness/v1alpha1",
  kind: "Tool",
  metadata: { id: "notes-write" },
  spec: {
    effectClass: "reversible-write",
    gateway: "required",
    inputSchemaRef: "#/schemas/notes-write-input",
    outputSchemaRef: "#/schemas/notes-write-output",
    resourceScope: "local-notes",
    idempotency: "required",
  },
};
`;
}

function indexTs(): string {
  return `import { pathToFileURL } from "node:url";
import {
  LocalReviewAdapter,
  createRuntime,
} from "@humanmax/runtime-harness";
import { knowledgeReadTool, notesWriteTool } from "./tools.ts";

export type FixtureResult = {
  read: string;
  write: string;
  productionEnforcement: string;
  writeExecuted: boolean;
};

export async function runFixture(): Promise<FixtureResult> {
  let writeExecuted = false;
  const runtime = createRuntime({ adapter: new LocalReviewAdapter() });
  runtime.registerTool(knowledgeReadTool, async (input) => {
    const query =
      typeof input === "object" && input && "query" in input
        ? String(input.query)
        : "";
    return { snippets: [query] };
  });
  runtime.registerTool(notesWriteTool, async () => {
    writeExecuted = true;
    return { wrote: true };
  });
  const run = runtime.startRun({
    agentId: "default",
    budgets: { maxSteps: 12, maxToolCalls: 8, timeoutSeconds: 120 },
  });
  const read = await runtime.invokeTool(run.id, "knowledge-read", {
    query: "fixture",
  });
  const write = await runtime.invokeTool(run.id, "notes-write", {
    text: "fixture-note",
  });
  return {
    read: read.status,
    write: write.status,
    productionEnforcement: runtime.productionEnforcement(),
    writeExecuted,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runFixture();
  process.stdout.write(\`\${JSON.stringify(result)}\\n\`);
}
`;
}

function gatewayTestTs(): string {
  return `import assert from "node:assert/strict";
import { test } from "node:test";
import { createRuntime, LocalReviewAdapter } from "@humanmax/runtime-harness";
import { runFixture } from "../src/index.ts";
import { knowledgeReadTool } from "../src/tools.ts";

test("fixture run reads, reviews writes, and does not claim enforcement", async () => {
  const result = await runFixture();
  assert.equal(result.read, "ok");
  assert.equal(result.write, "review");
  assert.equal(result.productionEnforcement, "unconfigured");
  assert.equal(result.writeExecuted, false);
});

test("undeclared tools fail closed", async () => {
  const runtime = createRuntime({ adapter: new LocalReviewAdapter() });
  runtime.registerTool(knowledgeReadTool, async () => ({ ok: true }));
  const run = runtime.startRun({
    agentId: "default",
    budgets: { maxSteps: 4, maxToolCalls: 2, timeoutSeconds: 30 },
  });
  const result = await runtime.invokeTool(run.id, "not-declared", {});
  assert.equal(result.status, "denied");
  assert.ok(result.reasonCodes?.includes("undeclared-tool"));
});
`;
}

function workflowYml(): string {
  return `# Manual Preview workflow. Commit package-lock.json after npm install.
# A local PASS is not evidence of a hosted run or production enforcement.
name: HumanMax Harness

on:
  workflow_dispatch:

jobs:
  harness:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 26
      - run: npm ci
      - run: npm run build
      - run: npm run typecheck
      - run: npm run humanmax -- test --format json
      - run: npm run humanmax -- generate --check --format json
      - run: npm run humanmax -- check --format json
`;
}

function gatewayEvalTs(): string {
  return `import type { ResultState } from "@humanmax/contracts";
import { runFixture } from "../src/index.ts";

export async function evaluate(): Promise<ResultState> {
  const run = await runFixture();
  return run.read === "ok" && run.write === "review" && !run.writeExecuted
    && run.productionEnforcement === "unconfigured" ? "PASS" : "FAIL";
}
`;
}

function generatedSkillMd(): string {
  return `---
name: humanmax-agent-harness
description: Build and maintain this generated HumanMax agent through the project-pinned CLI. Use JSON output. Do not bypass the action gateway or treat results as certification.
---

# HumanMax Agent Harness

Use the project-pinned \`humanmax\` binary. Do not scrape terminal text.

1. \`humanmax doctor --format json\`
2. \`humanmax add tool <id> --effect read|reversible-write\` (preview with \`--dry-run\`)
3. \`humanmax add eval <id>\`
4. \`humanmax upgrade --dry-run --format json\`
5. \`humanmax generate --check --format json\`
6. \`humanmax test --format json\`
7. \`humanmax check --format json\`

Never create an approval, exception, production-enforcement claim, or compliance claim. Do not convert FAIL, UNKNOWN, or NEEDS_HUMAN_REVIEW into PASS.
`;
}
