import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
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

test("upgrade previews a missing security document and preserves the project README", async () => {
  const dest = await mkdtemp(join(tmpdir(), "humanmax-doc-upgrade-"));
  generateProject({ destination: dest, name: "demo-agent" });
  await rm(join(dest, "SECURITY.md"), { force: true });
  await writeFile(join(dest, "README.md"), "# My application\n\nUser-maintained instructions.\n");
  const before = await readdir(dest, { recursive: true });

  const plan = planUpgrade({ destination: dest });

  assert.equal(plan.wrote, false);
  const security = plan.files.find(file => file.path === "SECURITY.md");
  assert.equal(security?.ownership, "mergeable");
  assert.equal(security?.action, "create");
  assert.equal(plan.files.find(file => file.path === "README.md")?.action, "merge");
  assert.equal(await readFile(join(dest, "README.md"), "utf8"), "# My application\n\nUser-maintained instructions.\n");
  assert.deepEqual(await readdir(dest, { recursive: true }), before);
});
