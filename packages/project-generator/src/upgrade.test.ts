import assert from "node:assert/strict";
import { mkdtemp, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { generateProject } from "./generate.ts";
import { planUpgrade } from "./upgrade.ts";

test("upgrade dry-run reports ownership classes and writes nothing", async () => {
  const dest = await mkdtemp(join(tmpdir(), "humanmax-upgrade-"));
  generateProject({ destination: dest, name: "demo-agent", apply: true });
  await writeFile(join(dest, ".gitignore"), "mutated\n");
  await writeFile(join(dest, "src/index.ts"), "// user owned\n");
  const before = await readdir(dest, { recursive: true });
  const plan = planUpgrade({ destination: dest });
  assert.equal(plan.wrote, false);
  const generated = plan.files.find((file) => file.path === ".gitignore");
  const userOwned = plan.files.find((file) => file.path === "src/index.ts");
  const mergeable = plan.files.find((file) => file.path === "README.md");
  assert.equal(generated?.ownership, "generated");
  assert.equal(generated?.action, "replace");
  assert.equal(userOwned?.ownership, "user-owned");
  assert.equal(userOwned?.action, "skip");
  assert.equal(mergeable?.ownership, "mergeable");
  assert.ok(mergeable?.action === "merge" || mergeable?.action === "unchanged");
  assert.deepEqual(await readdir(dest, { recursive: true }), before);
});
