import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { test } from "node:test";
import { generateProject } from "@humanmax/project-generator";

async function tree(root: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function walk(dir: string) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules") continue;
      const path = join(dir, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile()) result[relative(root, path)] = await readFile(path, "utf8");
    }
  }
  await walk(root);
  return result;
}

test("installed Preview loop executes the default eval and exposes added eval stubs", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "humanmax-cli-loop-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  generateProject({ destination: root, name: "cli-loop", apply: true, dependencyMode: "local-file" });
  const install = spawnSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: root, encoding: "utf8", timeout: 60_000 });
  assert.equal(install.status, 0, install.stderr);
  const pinned = join(root, "node_modules/.bin/humanmax");
  function run(args: string[], expectedExit = 0) {
    const child = spawnSync(process.execPath, [pinned, ...args, "--format", "json"], { cwd: root, encoding: "utf8", timeout: 30_000 });
    assert.equal(child.status, expectedExit, `${args.join(" ")}: ${child.stderr}\n${child.stdout}`);
    return JSON.parse(child.stdout);
  }
  assert.equal(run(["doctor"]).results[0].productionEnforcement, "unconfigured");
  const fixture = run(["dev"]).results[0];
  assert.equal(fixture.read, "ok");
  assert.equal(fixture.write, "review");
  assert.equal(fixture.writeExecuted, false);
  for (const args of [["add", "tool", "loop-write", "--effect", "reversible-write"], ["add", "eval", "loop-eval"]]) {
    const before = await tree(root);
    const preview = run([...args, "--dry-run"]);
    assert.ok(preview.results.length > 0);
    assert.deepEqual(await tree(root), before);
    run(args);
    assert.notDeepEqual(await tree(root), before);
  }
  const tested = run(["test"], 1);
  assert.equal(tested.results[0].result, "PASS");
  const evals = tested.results.filter((item: { runner: string }) => item.runner === "eval");
  assert.equal(evals.length, 2);
  assert.deepEqual(evals.map((item: { result: string }) => item.result), ["PASS", "UNKNOWN"]);
  assert.equal(tested.summary.unknown, 1);
  assert.equal(run(["generate", "--check"]).summary.fail, 0);
  assert.equal(run(["check"]).summary.fail, 0);
  const before = await tree(root);
  run(["upgrade", "--dry-run"]);
  assert.deepEqual(await tree(root), before);
  for (const name of ["gateway", "loop-eval"]) {
    await writeFile(join(root, `evals/${name}.eval.ts`), `
import { runFixture } from "../src/index.ts";
export async function evaluate() {
  const run = await runFixture();
  return run.read === "ok" && run.write === "review" && !run.writeExecuted
    && run.productionEnforcement === "unconfigured" ? "PASS" : "FAIL";
}
`);
  }
  const implemented = run(["test"]);
  assert.equal(implemented.summary.pass, 3);
  assert.equal(implemented.summary.unknown, 0);
});
