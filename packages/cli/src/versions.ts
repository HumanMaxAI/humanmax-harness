import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CliResponse } from "@humanmax/contracts";

export type PackageVersions = CliResponse["versions"];

/** Reported when a manifest cannot be read. A guessed version is not evidence. */
export const UNRESOLVED_VERSION = "unknown";

const require = createRequire(import.meta.url);

export function readPackageVersion(startDir: string): string {
  let dir = resolve(startDir);
  while (true) {
    const manifest = join(dir, "package.json");
    if (existsSync(manifest)) {
      return versionFromManifest(manifest);
    }
    const parent = dirname(dir);
    if (parent === dir) {
      return UNRESOLVED_VERSION;
    }
    dir = parent;
  }
}

export function resolvedPackageVersion(specifier: string): string {
  try {
    return readPackageVersion(dirname(require.resolve(specifier)));
  } catch {
    return UNRESOLVED_VERSION;
  }
}

let cached: PackageVersions | undefined;

export function packageVersions(): PackageVersions {
  cached ??= {
    cli: readPackageVersion(dirname(fileURLToPath(import.meta.url))),
    core: resolvedPackageVersion("@humanmax/core"),
    contracts: resolvedPackageVersion("@humanmax/contracts"),
  };
  return cached;
}

function versionFromManifest(manifest: string): string {
  try {
    const parsed: unknown = JSON.parse(readFileSync(manifest, "utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed &&
      typeof parsed.version === "string" &&
      parsed.version.length > 0
    ) {
      return parsed.version;
    }
  } catch {
    return UNRESOLVED_VERSION;
  }
  return UNRESOLVED_VERSION;
}
