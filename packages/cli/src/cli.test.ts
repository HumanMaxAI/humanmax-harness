import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { readFile, writeFile } from "node:fs/promises";
import { generateProject } from "@humanmax/project-generator";
import { EXIT_CODES } from "@humanmax/contracts";
import { CliError, exitCodeForError, previewCommands } from "./index.ts";
import { packageVersions } from "./versions.ts";

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

test("versions come from installed package manifests", async () => {
  const dest = await project();
  const result = run(["doctor", "--format", "json"], dest);
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  const versions = packageVersions();
  assert.equal(body.versions.cli, versions.cli);
  assert.equal(body.versions.core, versions.core);
  assert.equal(body.versions.contracts, versions.contracts);
  assert.notEqual(body.versions.cli, "unknown");
});

test("check --format sarif uses the same finding set as json", async () => {
  const dest = await project();
  const json = run(["check", "--format", "json"], dest);
  const sarif = run(["check", "--format", "sarif"], dest);
  assert.equal(json.status, 0, json.stderr);
  assert.equal(sarif.status, 0, sarif.stderr);
  const body = JSON.parse(json.stdout);
  const log = JSON.parse(sarif.stdout);
  const findings = body.results;
  const results = log.runs[0].results;
  assert.equal(log.version, "2.1.0");
  assert.equal(results.length, findings.length);
  assert.deepEqual(
    results.map((item: { partialFingerprints: { humanmaxFindingId: string } }) =>
      item.partialFingerprints.humanmaxFindingId,
    ),
    findings.map((item: { findingId: string }) => item.findingId),
  );
  for (const result of results) {
    if (result.properties.humanmaxResult === "PASS") {
      assert.equal(result.kind, "pass");
      continue;
    }
    assert.notEqual(result.kind, "pass");
    assert.notEqual(result.level, "none");
  }
});

test("sarif is refused for commands that produce no findings", async () => {
  const dest = await project();
  const result = run(["doctor", "--format", "sarif"], dest);
  assert.equal(result.status, EXIT_CODES.usage);
});

test("an unsupported pack-lock schema is exit 3, not a finding", async () => {
  const dest = await project();
  const path = join(dest, ".humanmax/packs.lock");
  const current = await readFile(path, "utf8");
  await writeFile(path, current.replace("v1alpha1", "v9forbidden"));
  const result = run(["check", "--format", "json"], dest);
  assert.equal(result.status, EXIT_CODES.packTrust);
  assert.match(result.stderr, /packs\.lock/);
});

test("missing project config is usage, not an internal failure", () => {
  const result = run(["check"], tmpdir());
  assert.equal(result.status, EXIT_CODES.usage);
});

test("exit codes are taken from the error class, not the message", () => {
  assert.equal(exitCodeForError(new CliError("usage", "anything")), EXIT_CODES.usage);
  assert.equal(exitCodeForError(new CliError("packTrust", "anything")), EXIT_CODES.packTrust);
  assert.equal(exitCodeForError(new CliError("internal", "anything")), EXIT_CODES.internal);
  assert.equal(exitCodeForError(new Error("wording cannot choose the code")), EXIT_CODES.internal);
});

test("humanmax test never reports a failing child as completed", async () => {
  const dest = await project();
  await writeFile(
    join(dest, "package.json"),
    JSON.stringify({
      name: "demo-agent",
      private: true,
      type: "module",
      scripts: { test: "node -e \"process.exit(1)\"" },
    }),
  );
  const result = run(["test", "--format", "json"], dest);
  assert.equal(result.status, EXIT_CODES.failed);
  const body = JSON.parse(result.stdout);
  assert.equal(body.status, "failed");
  assert.equal(body.results[0].result, "FAIL");
  assert.equal(body.results[0].exitCode, 1);
  assert.doesNotMatch(result.stdout, /\u001b\[/);
});

test("a generator-lock mismatch fails check and is visible in SARIF", async () => {
  const dest = await project();
  await writeFile(join(dest, "AGENTS.md"), "# tampered\n");
  const json = run(["check", "--format", "json"], dest);
  const sarif = run(["check", "--format", "sarif"], dest);
  assert.equal(json.status, EXIT_CODES.failed);
  assert.equal(sarif.status, EXIT_CODES.failed);
  const body = JSON.parse(json.stdout);
  assert.ok(body.summary.fail > 0);
  const fail = JSON.parse(sarif.stdout).runs[0].results.find(
    (item: { properties: { humanmaxResult: string } }) =>
      item.properties.humanmaxResult === "FAIL",
  );
  assert.ok(fail);
  assert.equal(fail.kind, "fail");
  assert.equal(fail.level, "error");
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
