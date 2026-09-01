import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const cli = fileURLToPath(new URL("./cli.ts", import.meta.url));

function run(args: string[]) {
  return spawnSync(process.execPath, ["--experimental-strip-types", cli, ...args], {
    encoding: "utf8",
  });
}

test("prints usage and exits 2 without a directory", () => {
  const result = run([]);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /Usage: create-humanmax-agent/);
});

test("dry-run lists files and writes nothing", async () => {
  const dest = await mkdtemp(join(tmpdir(), "humanmax-create-"));
  const result = run([dest, "--defaults", "--dry-run"]);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /src\/index\.ts/);
  assert.match(result.stdout, /\.humanmax\/project\.yaml/);
  assert.equal((await readdir(dest)).length, 0);
});

test("writes a preview project into an empty directory", async () => {
  const dest = await mkdtemp(join(tmpdir(), "humanmax-create-"));
  const result = run([dest, "--defaults"]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Created /);
  const names = await readdir(dest);
  assert.ok(names.includes("package.json"));
  assert.ok(names.includes(".humanmax"));
});

test("refuses a non-empty directory without apply", async () => {
  const dest = await mkdtemp(join(tmpdir(), "humanmax-create-"));
  await writeFile(join(dest, "README.md"), "mine\n");
  const result = run([dest, "--defaults"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /non-empty|apply/i);
});
