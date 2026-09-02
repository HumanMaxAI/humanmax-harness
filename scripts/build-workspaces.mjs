import { spawnSync } from "node:child_process";

/**
 * Workspace `tsc` emit reads `dist/*.d.ts` from dependencies. npm's default
 * `--workspaces` run is not topological, so dependents fail when they compile
 * before their dependencies have emitted.
 */
const ORDER = [
  "@humanmax/contracts",
  "@humanmax/findings",
  "@humanmax/core",
  "@humanmax/runtime-harness",
  "@humanmax/project-generator",
  "@humanmax/cli",
  "create-humanmax-agent",
];

for (const workspace of ORDER) {
  const result = spawnSync("npm", ["run", "build", "-w", workspace], {
    stdio: "inherit",
    shell: false,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
