import { realpathSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Every `@humanmax/*` dependency specifier a generated project receives is
 * produced here. Nothing else in the generator builds one.
 *
 * Preview emits local `file:` specifiers that point at the harness checkout
 * which ran the generator, because no `@humanmax/*` package is published yet
 * — all of those names currently 404 on the public registry. When they are
 * published, set `DEPENDENCY_MODE` to `"published"` and set
 * `PUBLISHED_VERSION_RANGE`. That is the whole switch.
 */
export const DEPENDENCY_MODE: "local-file" | "published" = "local-file";

/** Only read when `DEPENDENCY_MODE` is `"published"`. */
export const PUBLISHED_VERSION_RANGE = "^0.1.0";

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
export function harnessDependencies(destination: string): HarnessDependencies {
  return {
    dependencies: specifiers(destination, RUNTIME_PACKAGES),
    devDependencies: {
      ...specifiers(destination, DEV_PACKAGES),
      ...specifiers(destination, TRANSITIVE_PACKAGES),
    },
  };
}

function specifiers(
  destination: string,
  packages: readonly string[],
): Record<string, string> {
  const entries: Record<string, string> = {};
  for (const name of packages) {
    entries[`@humanmax/${name}`] = dependencySpecifier(destination, name);
  }
  return entries;
}

function dependencySpecifier(destination: string, name: string): string {
  if (DEPENDENCY_MODE === "published") {
    return PUBLISHED_VERSION_RANGE;
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
