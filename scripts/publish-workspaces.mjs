import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ORDER = [
  "@humanmax/contracts",
  "@humanmax/findings",
  "@humanmax/core",
  "@humanmax/runtime-harness",
  "@humanmax/project-generator",
  "@humanmax/cli",
  "create-humanmax-agent",
  "humanmax",
];

const REGISTRY = "https://registry.npmjs.org";
function npm(args) {
  return spawnSync("npm", args, { encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024 });
}

export function publishWorkspaces({ run = npm, log = console.log, names = ORDER, dryRun = false } = {}) {
  function workspaceVersion(name) {
    const result = run(["pkg", "get", "version", "-w", name]);
    let parsed;
    try { parsed = JSON.parse(result.stdout); } catch { /* fail below */ }
    const version = typeof parsed === "string" ? parsed : parsed?.[name];
    if (result.status !== 0 || typeof version !== "string" || !/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/.test(version)) {
      throw new Error(`could not read version for ${name}`);
    }
    return version;
  }
  function alreadyPublished(name, version) {
    const result = run(["view", `${name}@${version}`, "version", "--json", `--registry=${REGISTRY}`]);
    let parsed;
    try { parsed = JSON.parse(result.stdout); } catch { /* fail below */ }
    if (result.status === 0 && parsed === version) return true;
    if (result.status !== 0 && parsed?.error?.code === "E404") return false;
    throw new Error(`registry lookup failed for ${name}@${version}; publication stopped`);
  }

  // Resolve every version and registry lookup before the first irreversible write.
  const plan = names.map(name => {
    const version = workspaceVersion(name);
    return { name, version, exists: alreadyPublished(name, version) };
  });
  for (const { name, version, exists } of plan) {
    if (exists) { log(`skip ${name}@${version} (already on the registry)`); continue; }
    if (dryRun) { log(`would publish ${name}@${version}`); continue; }
    const result = run(["publish", "-w", name, "--access", "public", `--registry=${REGISTRY}`]);
    const verified = alreadyPublished(name, version);
    if (!verified) throw new Error(`npm publish failed for ${name}@${version} (exit ${result.status ?? "null"}); registry verification failed`);
    log(`${result.status === 0 ? "published" : "exists"} ${name}@${version}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== "--dry-run") || args.length > 1) throw new Error("Usage: node scripts/publish-workspaces.mjs [--dry-run]");
  const dryRun = args.includes("--dry-run");
  if (!dryRun && !process.env.NODE_AUTH_TOKEN && !process.env.NPM_TOKEN) {
    throw new Error("NODE_AUTH_TOKEN or NPM_TOKEN is required to publish from CI");
  }
  publishWorkspaces({ dryRun });
}
