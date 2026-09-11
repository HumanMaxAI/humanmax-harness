import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
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

test("installed generated project completes the pinned Preview CLI loop", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "humanmax-cli-loop-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  generateProject({ destination: root, name: "cli-loop", apply: true });
  const install = spawnSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: root, encoding: "utf8", timeout: 60_000 });
  assert.equal(install.status, 0, install.stderr);
  const pinned = join(root, "node_modules/.bin/humanmax");
  function run(args: string[]) {
    const child = spawnSync(process.execPath, [pinned, ...args, "--format", "json"], { cwd: root, encoding: "utf8", timeout: 30_000 });
    assert.equal(child.status, 0, `${args.join(" ")}: ${child.stderr}\n${child.stdout}`);
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
  assert.equal(run(["test"]).results[0].result, "PASS");
  assert.equal(run(["generate", "--check"]).summary.fail, 0);
  assert.equal(run(["check"]).summary.fail, 0);
  const before = await tree(root);
  run(["upgrade", "--dry-run"]);
  assert.deepEqual(await tree(root), before);
});
