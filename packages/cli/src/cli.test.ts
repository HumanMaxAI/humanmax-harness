import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { generateProject } from "@humanmax/project-generator";
import { previewCommands } from "./index.ts";

const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));
const harnessRoot = fileURLToPath(new URL("../../..", import.meta.url));

function run(args: string[], cwd: string) {
  return spawnSync(process.execPath, ["--experimental-strip-types", cli, ...args], {
    encoding: "utf8",
    cwd,
  });
}

async function project(): Promise<string> {
  const dest = await mkdtemp(join(tmpdir(), "humanmax-cli-"));
  generateProject({ destination: dest, name: "demo-agent", apply: true });
  return dest;
}

test("preview CLI surface stays thin", () => {
  assert.deepEqual(previewCommands(), [
    "dev",
    "add",
    "generate",
    "upgrade",
    "test",
    "doctor",
    "check",
  ]);
});

test("usage without a command exits 2", () => {
  const result = run([], process.cwd());
  assert.equal(result.status, 2);
});

test("doctor reports the preview contract as JSON", async () => {
  const dest = await project();
  const result = run(["doctor", "--format", "json"], dest);
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.kind, "CliResponse");
  assert.equal(body.command, "doctor");
  assert.doesNotMatch(result.stdout, /\u001b\[/);
  assert.equal(body.project.root, await realpath(dest));
  assert.match(JSON.stringify(body.results), /unconfigured/);
  assert.doesNotMatch(JSON.stringify(body), /sg-core/);
});

test("generate --check and check use Core results", async () => {
  const dest = await project();
  const check = run(["check", "--format", "json"], dest);
  assert.equal(check.status, 0, check.stderr);
  const body = JSON.parse(check.stdout);
  assert.equal(body.summary.fail, 0);
  assert.ok(body.summary.pass > 0);
  const generate = run(["generate", "--check", "--format", "json"], dest);
  assert.equal(generate.status, 0, generate.stderr);
  assert.equal(JSON.parse(generate.stdout).command, "generate --check");
});

test("upgrade without dry-run is refused", async () => {
  const dest = await project();
  const result = run(["upgrade", "--apply", "--format", "json"], dest);
  assert.equal(result.status, 2);
});

test("upgrade --dry-run writes nothing", async () => {
  const dest = await project();
  const result = run(["upgrade", "--dry-run", "--format", "json"], dest);
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.command, "upgrade");
  assert.ok(Array.isArray(body.results));
});

test("add tool dry-run does not write", async () => {
  const dest = await project();
  const result = run(
    ["add", "tool", "ticket-read", "--effect", "read", "--dry-run", "--format", "json"],
    dest,
  );
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.status, "completed");
});

test("dev runs the fixture through the harness", async () => {
  const dest = await project();
  const scope = join(dest, "node_modules", "@humanmax");
  await mkdir(scope, { recursive: true });
  await symlink(
    join(harnessRoot, "packages", "runtime-harness"),
    join(scope, "runtime-harness"),
  );
  await symlink(join(harnessRoot, "packages", "contracts"), join(scope, "contracts"));
  const result = run(["dev", "--format", "json"], dest);
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.results[0]?.read, "ok");
  assert.equal(body.results[0]?.write, "review");
  assert.equal(body.results[0]?.productionEnforcement, "unconfigured");
  assert.equal(body.results[0]?.writeExecuted, false);
});
