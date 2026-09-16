import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, realpath, symlink, readdir, unlink } from "node:fs/promises";
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

async function tree(root: string): Promise<Record<string, string>> {
  const files: Record<string, string> = {};
  for (const path of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (path.isFile()) {
      const full = join(path.parentPath, path.name);
      files[full.slice(root.length)] = await readFile(full, "utf8");
    }
  }
  return files;
}

test("help and version succeed without a project", () => {
  for (const args of [["--help"], ["add", "--help"], ["--version"], ["doctor", "--version"]]) {
    const result = run(args, tmpdir());
    assert.equal(result.status, 0, result.stderr);
    assert.ok(result.stdout.length > 0);
    assert.equal(result.stderr, "");
  }
});

test("boolean flags do not consume command positionals", async () => {
  const dest = await project();
  const before = await tree(dest);
  const result = run(["--dry-run", "add", "tool", "ordered-read", "--format=json", "--effect=read"], dest);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).command, "add tool");
  assert.deepEqual(await tree(dest), before);
});

test("invalid arguments fail before any project writes", async () => {
  const dest = await project();
  const before = await tree(dest);
  const cases = [
    ["check", "--typo"], ["check", "extra"], ["check", "--dry-run"],
    ["add", "tool", "bad-effect", "--effect", "network"],
    ["add", "tool", "missing-value", "--effect", "--dry-run"],
    ["add", "eval", "bad-eval", "--effect", "read"],
    ["add", "eval", "bad-eval", "extra"],
    ["add", "eval", "bad-eval", "--dry-run", "--apply"],
    ["add", "eval", "../outside"],
    ["check", "--format", "json", "--format", "terminal"],
    ["generate", "--check", "--apply"],
    ["upgrade", "--dry-run", "--to", "9.0.0"],
  ];
  for (const args of cases) {
    const result = run(args, dest);
    assert.equal(result.status, 2, `${args.join(" ")}: ${result.stderr}`);
    assert.deepEqual(await tree(dest), before, args.join(" "));
  }
});

test("doctor fails invalid declarations and reports pack trust failures", async () => {
  const dest = await project();
  const path = join(dest, ".humanmax/project.yaml");
  const original = await readFile(path, "utf8");
  await writeFile(path, original.replace("productionEnforcement: unconfigured", "productionEnforcement: enforced"));
  const invalid = run(["doctor", "--format", "json"], dest);
  assert.notEqual(invalid.status, 0);
  assert.notEqual(JSON.parse(invalid.stdout).status, "completed");
  await writeFile(path, original);
  const pack = join(dest, ".humanmax/packs.lock");
  await writeFile(pack, (await readFile(pack, "utf8")).replace(/digest: sha256:[0-9a-f]+/, `digest: sha256:${"0".repeat(64)}`));
  assert.equal(run(["doctor", "--format", "json"], dest).status, 3);
});

test("dev validates canonical agents before loading application code", async () => {
  const dest = await project();
  await writeFile(join(dest, "src/index.ts"), 'throw new Error("APPLICATION_WAS_LOADED");\n');
  const path = join(dest, ".humanmax/agents/default.agent.yaml");
  await writeFile(path, (await readFile(path, "utf8")).replace("- knowledge-read", "- undeclared-tool"));
  const result = run(["dev", "--format", "json"], dest);
  assert.equal(result.status, 2, result.stderr);
  assert.doesNotMatch(result.stderr, /APPLICATION_WAS_LOADED/);
  assert.match(result.stderr, /undeclared-tool/);
});

test("generate check fails when generator evidence is absent", async () => {
  const dest = await project();
  await unlink(join(dest, ".humanmax/generator.lock"));
  const result = run(["generate", "--check", "--format", "json"], dest);
  assert.notEqual(result.status, 0);
  const body = JSON.parse(result.stdout);
  assert.ok(body.summary.unknown > 0);
});

test("add refuses existing user-owned output files without partial writes", async () => {
  const dest = await project();
  await writeFile(join(dest, "tests/collision.test.ts"), "// user-owned test\n");
  const before = await tree(dest);
  const result = run(["add", "tool", "collision", "--effect", "read", "--format", "json"], dest);
  assert.equal(result.status, 2, result.stderr);
  assert.deepEqual(await tree(dest), before);
});

test("pack prechecks refuse symlinks without reading their target", async () => {
  const dest = await project();
  const secret = join(await mkdtemp(join(tmpdir(), "humanmax-outside-")), "private.yaml");
  await writeFile(secret, 'sensitive: "DO_NOT_DISCLOSE\n');
  await unlink(join(dest, ".humanmax/packs.lock"));
  await symlink(secret, join(dest, ".humanmax/packs.lock"));
  const result = run(["check", "--format", "json"], dest);
  assert.equal(result.status, 3);
  assert.match(result.stderr, /symbolic link/);
  assert.doesNotMatch(result.stdout + result.stderr, /DO_NOT_DISCLOSE/);
});

test("terminal previews list the planned files", async () => {
  const dest = await project();
  const result = run(["add", "eval", "visible-eval", "--dry-run"], dest);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /evals\/visible-eval.eval.ts/);
});

test("dev keeps application logs outside the JSON envelope", async () => {
  const dest = await project();
  await writeFile(join(dest, "src/index.ts"), 'console.log("application log"); export async function runFixture() { console.log("fixture log"); return { productionEnforcement: "unconfigured" }; }\n');
  const result = run(["dev", "--format", "json"], dest);
  assert.equal(result.status, 0, result.stderr);
  const body = JSON.parse(result.stdout);
  assert.equal(body.results[0].productionEnforcement, "unconfigured");
  assert.doesNotMatch(result.stdout, /application log|fixture log/);
});

test("JSON configuration errors are machine-readable with nonzero exit", async () => {
  const result = run(["check", "--format", "json"], tmpdir());
  assert.equal(result.status, 2);
  const body = JSON.parse(result.stdout);
  assert.equal(body.kind, "CliResponse");
  assert.equal(body.status, "failed");
  assert.equal(body.summary.pass, 0);
});

test("add rejects a malformed generator lock before writing components", async () => {
  const dest = await project();
  await writeFile(join(dest, ".humanmax/generator.lock"), '{"files":42}\n');
  const before = await tree(dest);
  const result = run(["add", "eval", "bad-lock", "--format", "json"], dest);
  assert.equal(result.status, 2, result.stderr);
  assert.deepEqual(await tree(dest), before);
});

test("upgrade refuses untracked symlink targets before reading a plan", async () => {
  const dest = await project();
  await unlink(join(dest, ".humanmax/generator.lock"));
  await unlink(join(dest, "src/index.ts"));
  await symlink(join(dest, "README.md"), join(dest, "src/index.ts"));
  const result = run(["upgrade", "--dry-run", "--format", "json"], dest);
  assert.equal(result.status, 2, result.stderr);
});

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

test("a pack digest mismatch exits 3 after evaluation stops", async () => {
  const dest = await project();
  const path = join(dest, ".humanmax/packs.lock");
  const current = await readFile(path, "utf8");
  await writeFile(
    path,
    current.replace(/digest: sha256:[0-9a-f]+/, `digest: sha256:${"0".repeat(64)}`),
  );
  const result = run(["check", "--format", "json"], dest);
  assert.equal(result.status, EXIT_CODES.packTrust);
  const body = JSON.parse(result.stdout);
  assert.equal(body.results.length, 1);
  assert.equal(body.results[0].ruleId, "HMX-PACK-001");
  assert.equal(body.results[0].result, "FAIL");
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

test("humanmax test includes failing and unimplemented eval outcomes", async () => {
  const dest = await project();
  await writeFile(join(dest, "package.json"), JSON.stringify({ name: "eval-fixture", type: "module", scripts: { test: "node -e \"process.exit(0)\"" } }));
  const evalPath = join(dest, "evals/gateway.eval.ts");
  for (const [source, state] of [
    ['throw new Error("EVAL_MUST_FAIL");', "FAIL"],
    ['export const legacy = { resultWhenFailed: "FAIL" };', "UNKNOWN"],
    ['export function evaluate() { return "NEEDS_HUMAN_REVIEW"; }', "NEEDS_HUMAN_REVIEW"],
    ['export function evaluate() { return "PASS"; }', "PASS"],
  ]) {
    await writeFile(evalPath, source!);
    const result = run(["test", "--format", "json"], dest);
    assert.equal(result.status, state === "PASS" ? 0 : 1, result.stderr);
    const body = JSON.parse(result.stdout);
    assert.equal(body.results.find((r: { runner: string }) => r.runner === "eval")?.result, state);
  }
});
