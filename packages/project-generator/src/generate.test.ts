import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
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

test("generated project npm-installs and gateway tests pass from tmp", async () => {
  const dest = await emptyDir();
  generateProject({
    destination: dest,
    name: "demo-agent",
    apply: true,
  });
  const pkg = JSON.parse(await readFile(join(dest, "package.json"), "utf8")) as {
    dependencies: Record<string, string>;
  };
  assert.match(
    pkg.dependencies["@humanmax/runtime-harness"] ?? "",
    /^file:\//,
    "file: deps must be absolute so /tmp vs /private/tmp cannot break them",
  );
  const install = spawnSync("npm", ["install"], { cwd: dest, encoding: "utf8" });
  assert.equal(install.status, 0, install.stderr);
  const tests = spawnSync("npm", ["test"], { cwd: dest, encoding: "utf8" });
  assert.equal(tests.status, 0, tests.stdout + tests.stderr);
  const doctor = spawnSync(
    "npm",
    ["run", "humanmax", "--", "doctor", "--format", "json"],
    { cwd: dest, encoding: "utf8" },
  );
  assert.equal(doctor.status, 0, doctor.stdout + doctor.stderr);
  assert.match(doctor.stdout, /unconfigured/);
  const check = spawnSync(
    "npm",
    ["run", "humanmax", "--", "check", "--format", "json"],
    { cwd: dest, encoding: "utf8" },
  );
  assert.equal(check.status, 0, check.stdout + check.stderr);
  assert.match(check.stdout, /"fail":0/);
  const dev = spawnSync(
    "npm",
    ["run", "humanmax", "--", "dev", "--format", "json"],
    { cwd: dest, encoding: "utf8" },
  );
  assert.equal(dev.status, 0, dev.stdout + dev.stderr);
  assert.match(dev.stdout, /"write":"review"/);
  assert.match(dev.stdout, /"writeExecuted":false/);
});