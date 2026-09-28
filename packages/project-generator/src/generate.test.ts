import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import { test } from "node:test";
import { realPath } from "./dependencies.ts";
import { defaultCreateOptions, generateProject } from "./generate.ts";

async function emptyDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "humanmax-generate-"));
}

test("preview default path does not include sg-core", () => {
  const options = defaultCreateOptions();
  assert.deepEqual(options.profiles, ["base"]);
  assert.equal(options.template, "tool-agent");
  assert.equal(options.language, "typescript");
});

test("default output installs published runtime dependencies without a checkout", () => {
  const files = generateProject({ destination: resolve("npm-consumer"), name: "npm-consumer", dryRun: true }).files;
  const manifest = JSON.parse(files.find(f => f.path === "package.json")!.contents);
  assert.deepEqual(manifest.dependencies, {
    "@humanmax/contracts": "0.1.0",
    "@humanmax/runtime-harness": "0.1.0",
  });
  assert.equal(manifest.devDependencies["@humanmax/cli"], "0.1.1");
  assert.equal(manifest.devDependencies.typescript, "5.9.2");
  assert.equal(manifest.devDependencies["@types/node"], "22.18.0");
  assert.equal(manifest.overrides, undefined);
  assert.doesNotMatch(JSON.stringify(manifest), /file:|\/src\/cli\.ts/);
  assert.equal(manifest.scripts.humanmax, "humanmax");
  assert.equal(manifest.scripts.build, "tsc -p tsconfig.json");
  assert.equal(manifest.scripts.typecheck, "tsc -p tsconfig.json --noEmit");
  const tsconfig = JSON.parse(files.find(f => f.path === "tsconfig.json")!.contents);
  assert.equal(tsconfig.compilerOptions.noEmit, undefined);
  assert.equal(tsconfig.compilerOptions.outDir, "dist");
  assert.equal(tsconfig.compilerOptions.rewriteRelativeImportExtensions, true);
  assert.match(files.find(f => f.path === "evals/gateway.eval.ts")!.contents, /export async function evaluate/);
});

test("dry-run reports files and writes nothing", async () => {
  const dest = await emptyDir();
  const plan = generateProject({
    destination: dest,
    name: "demo-agent",
    dryRun: true,
  });
  assert.ok(plan.files.some((file) => file.path === "src/index.ts"));
  assert.equal((await readdir(dest)).length, 0);
});

test("refuses a non-empty destination without apply", async () => {
  const dest = await emptyDir();
  await writeFile(join(dest, "README.md"), "mine\n");
  assert.throws(
    () =>
      generateProject({
        destination: dest,
        name: "demo-agent",
      }),
    /collision|non-empty|apply/i,
  );
});

test("apply writes a tool-agent with unconfigured production and no sg-core", async () => {
  const dest = await emptyDir();
  generateProject({
    destination: dest,
    name: "demo-agent",
    apply: true,
  });
  const project = await readFile(join(dest, ".humanmax/project.yaml"), "utf8");
  assert.match(project, /template: tool-agent/);
  assert.match(project, /productionEnforcement: unconfigured/);
  assert.match(project, /enforcementAdapter: local-review/);
  assert.doesNotMatch(project, /sg-core/);
  const lock = JSON.parse(
    await readFile(join(dest, ".humanmax/generator.lock"), "utf8"),
  );
  assert.equal(lock.template, "tool-agent");
  assert.ok(lock.files["src/index.ts"]);
});

// The `tmpdir()` parent is itself a symlink on macOS (`/var` -> `/private/var`).
// Before this was fixed, the emitted relative path was one segment short, npm
// wrote dangling symlinks into `node_modules/@humanmax/`, created no
// `node_modules/.bin`, and still exited 0.
test("every emitted file: dependency resolves to a real harness package", async () => {
  const dest = join(await emptyDir(), "demo-agent");
  const plan = generateProject({
    destination: dest,
    name: "demo-agent",
    dryRun: true,
    dependencyMode: "local-file",
  });
  const manifest = JSON.parse(
    plan.files.find((file) => file.path === "package.json")?.contents ?? "{}",
  );
  const specifiers = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  } as Record<string, string>;

  assert.deepEqual(Object.keys(specifiers).filter(name => name.startsWith("@humanmax/")).sort(), [
    "@humanmax/cli",
    "@humanmax/contracts",
    "@humanmax/core",
    "@humanmax/findings",
    "@humanmax/project-generator",
    "@humanmax/runtime-harness",
  ]);

  for (const [name, specifier] of Object.entries(specifiers).filter(([name]) => name.startsWith("@humanmax/"))) {
    assert.ok(specifier.startsWith("file:"), `${name} is not a file: specifier`);
    const target = specifier.slice("file:".length);
    assert.equal(isAbsolute(target), false, `${name} must stay relative`);
    // npm resolves a relative file: specifier against the real destination.
    const resolved = resolve(realPath(dest), target);
    assert.ok(
      existsSync(join(resolved, "package.json")),
      `${name} resolves to ${resolved}, which has no package.json`,
    );
    const linked = JSON.parse(
      await readFile(join(resolved, "package.json"), "utf8"),
    );
    assert.equal(linked.name, name);
  }
});

test("opt-in prompt fixture emits a versioned canonical prompt and offline runner", () => {
  const plan = generateProject({ destination: resolve("prompt-fixture"), name: "prompt-fixture", dryRun: true,
    dependencyMode: "local-file", options: { agenticPrompt: true } });
  const paths = new Map(plan.files.map(file => [file.path, file]));
  assert.match(paths.get(".humanmax/project.yaml")?.contents ?? "", /v1alpha2/);
  assert.match(paths.get(".humanmax/agents/default.agent.yaml")?.contents ?? "", /promptRef:/);
  assert.equal(paths.get(".humanmax/prompts/default.prompt.yaml")?.ownership, "canonical");
  assert.equal(paths.get(".humanmax/schemas/answer.schema.json")?.ownership, "canonical");
  assert.equal(paths.get("src/agent/prompt-fixture.ts")?.ownership, "user-owned");
  assert.equal(paths.get("tests/prompt.test.ts")?.ownership, "user-owned");
  const lock = JSON.parse(paths.get(".humanmax/generator.lock")?.contents ?? "{}");
  assert.equal(lock.files[".humanmax/prompts/default.prompt.yaml"].class, "canonical");
});

test("unreleased prompt fixture cannot claim compatibility with published 0.1.x packages", () => {
  assert.throws(() => generateProject({ destination: resolve("npm-prompt"), name: "npm-prompt", dryRun: true,
    options: { agenticPrompt: true } }), /local-file|unreleased|published/);
});
