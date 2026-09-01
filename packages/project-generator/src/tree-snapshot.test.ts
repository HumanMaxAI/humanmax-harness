import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileDigest, generateProject } from "./generate.ts";

/**
 * Snapshot of the `tool-agent` + `base` file tree. Any change to a generated
 * path, ownership class, or byte of content changes a digest here, so it lands
 * as an explicit reviewable diff rather than an invisible drift.
 *
 * Regenerate deliberately, never to make a red test green:
 *   node --test --experimental-strip-types src/tree-snapshot.test.ts
 * then copy the digests the failure prints.
 *
 * Two values cannot be pinned because they encode the absolute location of the
 * harness checkout on the machine that ran the generator:
 *   - the `file:` specifiers in `package.json`
 *   - the `package.json` entry inside `.humanmax/generator.lock`
 * Both are normalised below, and both are covered instead by
 * "generator.lock digests every generated file" plus the install test.
 */
const EXPECTED: ReadonlyArray<readonly [string, string, string]> = [
  [".env.example", "generated", "sha256:c32c4ff3fdaef8cea31ca176b135ba14be61c7dfa896144ceb5931b144351e28"],
  [".github/workflows/humanmax.yml", "mergeable", "sha256:c294c3da8fd6ce1581a5a0930557097072471159b226f3e6d7aea1233036b8cb"],
  [".gitignore", "generated", "sha256:74bcb3720c039004ac1f9031e5a19947746fa125eefc8b6db781dde15d70892d"],
  [".humanmax/agents/default.agent.yaml", "canonical", "sha256:c7cf04010e13b4e49fe7284903747e81b1852db6f72b7da8a2b863ac2ae3a2de"],
  [".humanmax/generator.lock", "generated", "sha256:04aa4b51756c775776eb1b7f88dc5a2e48d5ab06dcfec1b0375dab5668f2bcb0"],
  [".humanmax/packs.lock", "canonical", "sha256:1a725f509f081848f6923cbc75efc1080e643b2cd7c27d27f3109bee26261b86"],
  [".humanmax/project.yaml", "canonical", "sha256:7a4b0e1b089a3b908dfc2216a6a4630d62d4d614be270a55b10582956bc079d8"],
  [".humanmax/tools/knowledge-read.tool.yaml", "canonical", "sha256:4443d08e68a1ef6cc1fb5fe2e4a3c6e52852efd5a6c5e2a29021ecc960bac340"],
  [".humanmax/tools/notes-write.tool.yaml", "canonical", "sha256:f037b9704bc8147a63e60a2d2bfd79d6c8ad60c4af21ddb5cf25a4a7ef003206"],
  ["AGENTS.md", "mergeable", "sha256:9cc4967669029c57dea58087d992c64df111185aa400905ad8ca528f5d01273a"],
  ["README.md", "mergeable", "sha256:d25e3104c3ec5c55463f324a14a59877d3165ee145a565e6d2b4a7d95d6a9f5c"],
  ["evals/gateway.eval.ts", "user-owned", "sha256:01d1348a2e9ae0b267fa4a63e40120149a36f2ac19057fd3ffdc792494b665f0"],
  ["package.json", "mergeable", "sha256:14bc2e13763135631e90972b15fcd625592184e0f8ca0f3bd861fdd5f547d5e9"],
  ["skills/humanmax-agent-harness/SKILL.md", "mergeable", "sha256:f8b9a5f0d455d2f078d1280796eb997138e56b6070e8779d1372abee5e4b2e96"],
  ["src/index.ts", "user-owned", "sha256:7eb4228802655618975c95dd60d94cdece34220276b91989734524dade3949ed"],
  ["src/tools.ts", "user-owned", "sha256:dc4474dcf4da38287eab986e90e51e2b219d51c65e2f911234807d83e91bb76e"],
  ["tests/gateway.test.ts", "user-owned", "sha256:6b58efe944c366cbb63432288bb864b1a965b62a725d28383649c8a6c1aaf1fa"],
  ["tsconfig.json", "mergeable", "sha256:db7e2ad80b49cc1a1f527b67a58f48bf24471ea5a62c05e01f4267e7f5009be4"],
];

const LOCAL_PATH_PLACEHOLDER = "<local-harness-checkout>";

function normalise(path: string, contents: string): string {
  if (path === "package.json") {
    return contents.replace(/"file:[^"]*"/g, `"file:${LOCAL_PATH_PLACEHOLDER}"`);
  }
  if (path === ".humanmax/generator.lock") {
    const lock = JSON.parse(contents);
    lock.files["package.json"].digest = `sha256:${LOCAL_PATH_PLACEHOLDER}`;
    return `${JSON.stringify(lock, null, 2)}\n`;
  }
  return contents;
}

function snapshot() {
  const dest = join(mkdtempSync(join(tmpdir(), "humanmax-snapshot-")), "demo-agent");
  const plan = generateProject({
    destination: dest,
    name: "demo-agent",
    dryRun: true,
  });
  return plan.files
    .map(
      (file) =>
        [file.path, file.ownership, fileDigest(normalise(file.path, file.contents))] as const,
    )
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

test("tool-agent generates a deterministic, snapshot-pinned file tree", () => {
  assert.deepEqual(snapshot(), EXPECTED);
});

test("tool-agent generation is byte-identical across destinations", () => {
  // Only the local `file:` specifiers may differ between two destinations, and
  // `normalise` removes exactly those.
  assert.deepEqual(snapshot(), snapshot());
});

test("generator.lock digests every generated file", () => {
  const dest = join(mkdtempSync(join(tmpdir(), "humanmax-snapshot-")), "demo-agent");
  const plan = generateProject({
    destination: dest,
    name: "demo-agent",
    dryRun: true,
  });
  const lockFile = plan.files.find((file) => file.path === ".humanmax/generator.lock");
  assert.ok(lockFile);
  const lock = JSON.parse(lockFile.contents);

  const expected = plan.files.filter((file) => file.path !== ".humanmax/generator.lock");
  assert.deepEqual(Object.keys(lock.files).sort(), expected.map((f) => f.path).sort());
  for (const file of expected) {
    assert.equal(lock.files[file.path].class, file.ownership, file.path);
    assert.equal(lock.files[file.path].digest, fileDigest(file.contents), file.path);
  }
});
