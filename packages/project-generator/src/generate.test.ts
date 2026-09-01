import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { defaultCreateOptions, generateProject } from "./generate.ts";

const harnessRoot = fileURLToPath(new URL("../../..", import.meta.url));

async function emptyDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "humanmax-generate-"));
}

test("preview default path does not include sg-core", () => {
  const options = defaultCreateOptions();
  assert.deepEqual(options.profiles, ["base"]);
  assert.equal(options.template, "tool-agent");
  assert.equal(options.language, "typescript");
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
  assert.equal(
    await readFile(join(dest, ".github/workflows/humanmax.yml"), "utf8").then(
      (text) => text.includes("npm test"),
    ),
    true,
  );
});

async function linkWorkspacePackages(dest: string): Promise<void> {
  const scope = join(dest, "node_modules", "@humanmax");
  await mkdir(scope, { recursive: true });
  await symlink(
    join(harnessRoot, "packages", "runtime-harness"),
    join(scope, "runtime-harness"),
  );
  await symlink(join(harnessRoot, "packages", "contracts"), join(scope, "contracts"));
}

test("generated fixture run reads, reviews writes, and never claims enforcement", async () => {
  const dest = await emptyDir();
  generateProject({
    destination: dest,
    name: "demo-agent",
    apply: true,
  });
  await linkWorkspacePackages(dest);
  const { runFixture } = await import(join(dest, "src/index.ts"));
  const result = await runFixture();
  assert.equal(result.read, "ok");
  assert.equal(result.write, "review");
  assert.equal(result.productionEnforcement, "unconfigured");
  assert.equal(result.writeExecuted, false);
});
