import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const required = [
  "AGENTS.md",
  "CLAUDE.md",
  "CHANGELOG.md",
  "docs/design/2026-08-29-open-source-product-design.md",
  "docs/reviews/2026-08-30-product-review.md",
  "docs/agents/lanes.md",
  "docs/agents/parallel-development.md",
  "packages/contracts/package.json",
  "packages/core/package.json",
  "packages/runtime-harness/package.json",
  "packages/project-generator/package.json",
  "packages/cli/package.json",
  "packages/findings/package.json",
  "packages/create-humanmax-agent/package.json",
  "templates/tool-agent/README.md",
  "skills/humanmax-agent-harness/SKILL.md",
];

const forbiddenAtRoot = [
  "HUMANMAX_HARNESS_OPEN_SOURCE_DESIGN.md",
  "PRODUCT_REVIEW.md",
];

for (const rel of required) {
  assert.ok(existsSync(join(root, rel)), `missing ${rel}`);
}

for (const rel of forbiddenAtRoot) {
  assert.equal(existsSync(join(root, rel)), false, `${rel} must not live at repo root`);
}

console.log(`scaffold ok (${required.length} required paths)`);
