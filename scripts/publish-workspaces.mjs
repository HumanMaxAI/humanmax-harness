import { spawnSync } from "node:child_process";

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

function run(args) {
  return spawnSync("npm", args, { encoding: "utf8" });
}

function workspaceVersion(name) {
  const result = run(["pkg", "get", "version", "-w", name]);
  if (result.status !== 0) {
    throw new Error(`could not read version for ${name}`);
  }
  return JSON.parse(result.stdout);
}

function alreadyPublished(name, version) {
  const result = run(["view", `${name}@${version}`, "version"]);
  return result.status === 0 && result.stdout.trim().replace(/"/g, "") === version;
}

function publish(name) {
  const result = spawnSync("npm", ["publish", "-w", name, "--access", "public"], {
    stdio: ["ignore", "inherit", "inherit"],
  });
  if (result.status === 0) {
    return "published";
  }
  if (alreadyPublished(name, workspaceVersion(name))) {
    return "exists";
  }
  throw new Error(`npm publish failed for ${name} (exit ${result.status ?? "null"})`);
}

if (!process.env.NODE_AUTH_TOKEN && !process.env.NPM_TOKEN) {
  throw new Error("NODE_AUTH_TOKEN or NPM_TOKEN is required to publish");
}

for (const name of ORDER) {
  const version = workspaceVersion(name);
  if (alreadyPublished(name, version)) {
    console.log(`skip ${name}@${version} (already on the registry)`);
    continue;
  }
  const outcome = publish(name);
  console.log(`${outcome} ${name}@${version}`);
}
