import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { addEval, addTool } from "./add.ts";
import { generateProject } from "./generate.ts";

async function generated(): Promise<string> {
  const dest = await mkdtemp(join(tmpdir(), "humanmax-add-"));
  generateProject({ destination: dest, name: "demo-agent", apply: true });
  return dest;
}

test("add tool dry-run reports files and writes nothing extra", async () => {
  const dest = await generated();
  const before = (await readdir(join(dest, ".humanmax/tools"))).sort();
  const plan = addTool({
    destination: dest,
    id: "ticket-read",
    effect: "read",
    dryRun: true,
  });
  assert.ok(plan.files.some((file) => file.path.endsWith("ticket-read.tool.yaml")));
  assert.equal(plan.wrote, false);
  assert.deepEqual((await readdir(join(dest, ".humanmax/tools"))).sort(), before);
});

test("add tool writes declaration, source, and a gateway test", async () => {
  const dest = await generated();
  const plan = addTool({
    destination: dest,
    id: "notes-archive",
    effect: "reversible-write",
  });
  assert.equal(plan.wrote, true);
  const yaml = await readFile(
    join(dest, ".humanmax/tools/notes-archive.tool.yaml"),
    "utf8",
  );
  assert.match(yaml, /effectClass: reversible-write/);
  assert.match(yaml, /gateway: required/);
  const tools = await readFile(join(dest, "src/tools.ts"), "utf8");
  assert.match(tools, /notes-archive/);
  const testSource = await readFile(join(dest, "tests/notes-archive.test.ts"), "utf8");
  assert.match(testSource, /LocalReviewAdapter/);
  assert.doesNotMatch(testSource, /skip gateway|direct client/i);
});

test("add tool refuses an existing identifier", async () => {
  const dest = await generated();
  assert.throws(
    () =>
      addTool({
        destination: dest,
        id: "knowledge-read",
        effect: "read",
      }),
    /collision|exists/i,
  );
});

test("add eval writes a stub that cannot rewrite FAIL to PASS", async () => {
  const dest = await generated();
  addEval({ destination: dest, id: "prompt-injection" });
  const contents = await readFile(join(dest, "evals/prompt-injection.eval.ts"), "utf8");
  assert.match(contents, /FAIL/);
  assert.match(contents, /cannot rewrite/);
});
