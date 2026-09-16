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
 * Published dependencies are destination-independent; all bytes are pinned.
 */
const EXPECTED: ReadonlyArray<readonly [string, string, string]> = [
  [".env.example", "generated", "sha256:c32c4ff3fdaef8cea31ca176b135ba14be61c7dfa896144ceb5931b144351e28"],
  [".github/workflows/humanmax.yml", "mergeable", "sha256:5d469a9861c0270474a5d02e0aefd9c01f7025054084b2f9c695a70d40e2849e"],
  [".gitignore", "generated", "sha256:74bcb3720c039004ac1f9031e5a19947746fa125eefc8b6db781dde15d70892d"],
  [".humanmax/agents/default.agent.yaml", "canonical", "sha256:c7cf04010e13b4e49fe7284903747e81b1852db6f72b7da8a2b863ac2ae3a2de"],
  [".humanmax/generator.lock", "generated", "sha256:28180b3558b7116125fd99a7d62725ca922b3a6212685d7812d64916e420eca4"],
  [".humanmax/packs.lock", "canonical", "sha256:c61c53f3bc895547c26b3d815fe5b8bacec168c73082c51af584e35c0022ec79"],
  [".humanmax/packs/base/README.md", "canonical", "sha256:eb5f69bd11937eba970e8bbe051c9a0eac6f7144eab8eb107ce276f38010c514"],
  [".humanmax/packs/base/rules/HMX-GEN-001.json", "canonical", "sha256:5f415c6a064f75258dba0061093fe5e6822ee8106a8a4b2ed24dad0762deebce"],
  [".humanmax/packs/base/rules/HMX-PACK-001.json", "canonical", "sha256:827ec1203740cd64cefdf11ddfb4a4c33dbc0fe5e90741453a54bd46d6c0f6d9"],
  [".humanmax/packs/base/rules/HMX-PROJ-001.json", "canonical", "sha256:d9d47e6be543c442f270c09915758296d9c00542a27081210b0ac0cd1f103d50"],
  [".humanmax/packs/base/rules/HMX-TOOL-004.json", "canonical", "sha256:e01f7a32a870204ef467f209a4ec0e80e41ed3615ee34661192c3987a7896a6f"],
  [".humanmax/project.yaml", "canonical", "sha256:9b6eb57136a6e46d44e1466b40039a4254315443eb50ea757428ceb5a2dc28b8"],
  [".humanmax/tools/knowledge-read.tool.yaml", "canonical", "sha256:4443d08e68a1ef6cc1fb5fe2e4a3c6e52852efd5a6c5e2a29021ecc960bac340"],
  [".humanmax/tools/notes-write.tool.yaml", "canonical", "sha256:f037b9704bc8147a63e60a2d2bfd79d6c8ad60c4af21ddb5cf25a4a7ef003206"],
  ["AGENTS.md", "mergeable", "sha256:9cc4967669029c57dea58087d992c64df111185aa400905ad8ca528f5d01273a"],
  ["README.md", "mergeable", "sha256:7a336002d453b2c860a28a6f404cf21b3cc50b1c0f921b336a0b1df186605287"],
  ["evals/gateway.eval.ts", "user-owned", "sha256:5ecccfd9efae2bcd2a735e4188079f7d5db811aa212493265848028195a92512"],
  ["package.json", "mergeable", "sha256:e7fa1b43aba8e16970742b006e6f91d281ead53ec98f4ea44799b022fe8c8b08"],
  ["skills/humanmax-agent-harness/SKILL.md", "mergeable", "sha256:f8b9a5f0d455d2f078d1280796eb997138e56b6070e8779d1372abee5e4b2e96"],
  ["src/index.ts", "user-owned", "sha256:7eb4228802655618975c95dd60d94cdece34220276b91989734524dade3949ed"],
  ["src/tools.ts", "user-owned", "sha256:dc4474dcf4da38287eab986e90e51e2b219d51c65e2f911234807d83e91bb76e"],
  ["tests/gateway.test.ts", "user-owned", "sha256:6b58efe944c366cbb63432288bb864b1a965b62a725d28383649c8a6c1aaf1fa"],
  ["tsconfig.json", "mergeable", "sha256:64b573b6b1bc7b102a9584a4a72513447d98f6c4d1cdd44b9474bfbd123e2f77"],
];

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
        [file.path, file.ownership, fileDigest(file.contents)] as const,
    )
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
}

test("tool-agent generates a deterministic, snapshot-pinned file tree", () => {
  assert.deepEqual(snapshot(), EXPECTED);
});

test("tool-agent generation is byte-identical across destinations", () => {
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
