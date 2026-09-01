import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { generateProject } from "./generate.ts";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

/**
 * npm exports `npm_config_*` and `npm_lifecycle_*` into the workspace test run.
 * Leaking them into the generated project's install makes it inherit this
 * repository's prefix and workspace settings, which is not what a user gets.
 */
function cleanEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.toLowerCase().startsWith("npm_")) {
      env[key] = value;
    }
  }
  env.npm_config_audit = "false";
  env.npm_config_fund = "false";
  env.npm_config_update_notifier = "false";
  return env;
}

function run(args: string[], cwd: string) {
  return spawnSync(npm, args, { cwd, encoding: "utf8", env: cleanEnv() });
}

function detail(label: string, result: ReturnType<typeof run>): string {
  return `${label} exited ${result.status}\n--- stdout ---\n${result.stdout}\n--- stderr ---\n${result.stderr}`;
}

/**
 * The install path is the product path, so it is exercised with a real
 * `npm install` rather than hand-written symlinks. The generated project has
 * only local `file:` dependencies, so this needs no registry round trip and
 * runs by default in `npm test`.
 *
 * `tmpdir()` is deliberately not resolved through realpath here: on macOS it is
 * `/var/folders/...`, a symlink into `/private/var/...`, and that symlink hop is
 * exactly what used to break the emitted dependency paths.
 */
test("a generated project installs, links the CLI bin, and passes its own tests", { timeout: 600_000 }, () => {
  const dest = join(mkdtempSync(join(tmpdir(), "humanmax-install-")), "demo-agent");
  generateProject({ destination: dest, name: "demo-agent" });

  const install = run(["install"], dest);
  assert.equal(install.status, 0, detail("npm install", install));

  // Top-level links must be real. Nested workspace packages still declare
  // `@humanmax/*@0.0.0`, so `npm ls --all` reports UNMET until those packages
  // are published. That is not the install-path bug this test exists to catch.
  for (const name of [
    "contracts",
    "runtime-harness",
    "cli",
    "core",
    "findings",
    "project-generator",
  ]) {
    const linked = join(dest, "node_modules", "@humanmax", name, "package.json");
    assert.ok(existsSync(linked), `node_modules/@humanmax/${name} is dangling`);
  }
  assert.ok(
    existsSync(join(dest, "node_modules", ".bin", "humanmax")),
    "node_modules/.bin/humanmax was not created",
  );

  const test_ = run(["test"], dest);
  assert.equal(test_.status, 0, detail("npm test", test_));

  const doctor = run(["run", "humanmax", "--", "doctor", "--format", "json"], dest);
  assert.equal(doctor.status, 0, detail("humanmax doctor", doctor));
  const report = JSON.parse(doctor.stdout.slice(doctor.stdout.indexOf("{")));
  assert.equal(report.command, "doctor");
  assert.equal(report.results[0].template, "tool-agent");
  assert.equal(report.results[0].productionEnforcement, "unconfigured");
  assert.equal(report.results[0].enforcementAdapter, "local-review");
});
