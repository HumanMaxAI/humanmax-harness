import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { FileOwnershipClass } from "@humanmax/contracts";
import { harnessDependencies } from "./dependencies.ts";

export const PREVIEW_TEMPLATE = "tool-agent" as const;
export const PREVIEW_PROFILE = "base" as const;
export const GENERATOR_VERSION = "0.0.0";

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
  const files = renderFiles(request.name, destination, options);
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
): GenerateFile[] {
  const lockFiles: Record<string, { class: FileOwnershipClass; digest: string }> =
    {};

  const files: GenerateFile[] = [
    file("package.json", "mergeable", packageJson(name, destination)),
    file("tsconfig.json", "mergeable", tsconfig()),
    file("README.md", "mergeable", readme(name)),
    file("AGENTS.md", "mergeable", agentsMd()),
    file(".gitignore", "generated", gitignore()),
    file(".env.example", "generated", "# No provider credentials required for the fixture run.\n"),
    file(".humanmax/project.yaml", "canonical", projectYaml(name, options)),
    file(".humanmax/packs.lock", "canonical", packsLock()),
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

function packageJson(name: string, destination: string): string {
  const { dependencies, devDependencies } = harnessDependencies(destination);
  // Unpublished file: installs do not hoist workspace-internal 0.0.0 ranges.
  // overrides pin every @humanmax/* request to the same local checkout.
  const overrides = { ...dependencies, ...devDependencies };
  return `${JSON.stringify(
    {
      name,
      version: "0.0.0",
      private: true,
      type: "module",
      scripts: {
        start: "node --experimental-strip-types src/index.ts",
        test: "node --test --experimental-strip-types tests/*.test.ts",
        humanmax:
          "node --experimental-strip-types node_modules/@humanmax/cli/src/cli.ts",
      },
      dependencies,
      devDependencies,
      overrides,
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
        noEmit: true,
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
      },
      include: ["src/**/*.ts", "tests/**/*.ts", "evals/**/*.ts"],
    },
    null,
    2,
  )}\n`;
}

function readme(name: string): string {
  return `# ${name}

Generated by HumanMax Agent Harness Preview (\`tool-agent\` + \`base\`).

This project is local-first. The fixture run needs no provider credentials and no HumanMax account.

\`\`\`bash
npm install
npm test
npm start
npm run humanmax -- doctor --format json
\`\`\`

Read tools execute. Write tools stop at the action gateway (\`review\`). Production enforcement stays \`unconfigured\`.

## What is verified, and what is not

- \`npm test\` runs the generated gateway tests on this machine. A green run is a local check. It is not production enforcement, and it is not certification.
- Results are \`PASS\` / \`FAIL\` / \`UNKNOWN\` / \`NEEDS_HUMAN_REVIEW\`. A check that did not run is \`UNKNOWN\`, never \`PASS\`.

## Preview install constraints

- \`@humanmax/*\` is not published yet. This project depends on the harness checkout that generated it, through local \`file:\` paths in \`package.json\`. Keep that checkout where it is, or rewrite those paths and reinstall.
- Use \`npm run humanmax -- <command>\`. \`npx humanmax\` does not work in Preview: the linked CLI entry point has no shebang, so the shell cannot execute it.
- \`.github/workflows/humanmax.yml\` has **no automatic trigger**. A GitHub-hosted runner has no copy of your harness checkout, so \`npm ci\` cannot resolve those \`file:\` paths. Harness CI status on GitHub is \`UNKNOWN\` until \`@humanmax/*\` is published. Read the comment at the top of that file before enabling it.
`;
}

function agentsMd(): string {
  return `# Generated agent instructions

Canonical control decisions live in \`.humanmax/\`. This file is a derived view.

- Add tools through the project generator or typed declarations plus gateway tests.
- Do not create a second tool registry or call effectful APIs outside the action gateway.
- Do not treat a green local run as production enforcement or compliance certification.
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

function packsLock(): string {
  return `apiVersion: humanmax.ai/pack-lock/v1alpha1
kind: PackLock
packs:
  - id: base
    version: 0.0.0
    digest: sha256:preview-unsigned
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
  return `# Harness CI status on GitHub: UNKNOWN. Nothing below has been verified on a
# hosted runner, and UNKNOWN is not PASS.
#
# Why: \`@humanmax/*\` is not published yet, so this project's package.json
# points at the local harness checkout that generated it through \`file:\`
# paths. A hosted runner has no copy of that checkout, so \`npm ci\` cannot
# resolve them and every step below fails for a reason unrelated to this
# agent's controls.
#
# This workflow therefore runs on \`workflow_dispatch\` only. It must not put a
# green check on a pull request for controls it never executed. Run the same
# commands locally instead:
#
#     npm install && npm test
#     npm run humanmax -- generate --check --format json
#     npm run humanmax -- check --format json
#
# Once \`@humanmax/*\` is published and package.json uses version ranges, add
# back the \`pull_request\` and \`push\` triggers.
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
          node-version: 22
      - name: Preview limitation
        run: |
          echo "Harness CI result: UNKNOWN."
          echo "Local file: dependencies on @humanmax/* cannot resolve on a hosted runner."
          echo "The steps below are expected to fail until @humanmax/* is published."
      - run: npm ci
      - run: npm test
      - run: npm run humanmax -- generate --check --format json
      - run: npm run humanmax -- check --format json
`;
}

function gatewayEvalTs(): string {
  return `export const gatewayEval = {
  id: "gateway",
  resultWhenFailed: "FAIL",
  note: "Harness cannot rewrite FAIL, UNKNOWN, or NEEDS_HUMAN_REVIEW to PASS.",
};
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
