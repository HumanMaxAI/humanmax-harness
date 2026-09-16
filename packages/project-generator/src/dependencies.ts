import { realpathSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Published projects must install independently of the machine that created them. */
export type DependencyMode = "published" | "local-file";
const PUBLISHED_VERSIONS: Record<string, string> = {
  contracts: "0.1.0", "runtime-harness": "0.1.0", cli: "0.1.1",
};

/** Directory names under `packages/`, which are also the npm name suffixes. */
export const RUNTIME_PACKAGES = ["contracts", "runtime-harness"] as const;
export const DEV_PACKAGES = ["cli"] as const;
/** Packages the CLI and runtime import. Unpublished `file:` installs do not hoist them. */
export const TRANSITIVE_PACKAGES = ["core", "findings", "project-generator"] as const;

export type HarnessDependencies = {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
};

/**
 * `destination` may not exist yet; it is resolved through the longest existing
 * ancestor so a symlinked parent (macOS `/var` -> `/private/var`) does not
 * shorten the emitted relative path by a segment. Getting this wrong produces
 * dangling `node_modules/@humanmax/*` symlinks and no `node_modules/.bin`,
 * while `npm install` still exits 0.
 */
export function harnessDependencies(destination: string, mode: DependencyMode = "published"): HarnessDependencies {
  return {
    dependencies: specifiers(destination, RUNTIME_PACKAGES, mode),
    devDependencies: {
      ...specifiers(destination, DEV_PACKAGES, mode),
      ...(mode === "local-file" ? specifiers(destination, TRANSITIVE_PACKAGES, mode) : {}),
    },
  };
}

function specifiers(
  destination: string,
  packages: readonly string[],
  mode: DependencyMode,
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const name of packages) {
    entries[`@humanmax/${name}`] = dependencySpecifier(destination, name, mode);
  }
  return entries;
}

function dependencySpecifier(destination: string, name: string, mode: DependencyMode): string {
  if (mode === "published") {
    const version = PUBLISHED_VERSIONS[name];
    if (!version) throw new Error(`No published version configured for ${name}`);
    return version;
  }
  const target = join(harnessPackagesRoot(), name);
  const rel = relative(realPath(destination), target);
  return `file:${rel.startsWith(".") ? rel : `./${rel}`}`;
}

function harnessPackagesRoot(): string {
  return realPath(fileURLToPath(new URL("../..", import.meta.url)));
}

/**
 * `fs.realpathSync` for a path that does not exist yet: resolve the deepest
 * existing ancestor and re-append the missing segments.
 */
export function realPath(target: string): string {
  const absolute = resolve(target);
  const missing: string[] = [];
  let candidate = absolute;
  for (;;) {
    try {
      return join(realpathSync(candidate), ...missing);
    } catch {
      const parent = dirname(candidate);
      if (parent === candidate) {
        return absolute;
      }
      missing.unshift(basename(candidate));
      candidate = parent;
    }
  }
}
