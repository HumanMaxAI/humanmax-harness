import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { readCanonicalYaml } from "@humanmax/contracts";
import { fileDigest } from "./generate.ts";
import { readPackEntries } from "./pack-lock.ts";
import { assertRelativeInside, readTextInside } from "./safe-fs.ts";

export type ProjectSnapshot = {
  project?: unknown;
  tools: unknown[];
  packLock?: unknown;
  packEntries: { path: string; contents: string }[];
  generatorLock?: {
    files?: Record<string, { class?: string; digest?: string }>;
  };
  fileDigests: Record<string, string>;
};

export function readProjectSnapshot(root: string): ProjectSnapshot {
  const fileDigests: Record<string, string> = {};
  const lock = readJson(root, ".humanmax/generator.lock") as
    | ProjectSnapshot["generatorLock"]
    | undefined;
  if (lock?.files) {
    for (const path of Object.keys(lock.files)) {
      assertRelativeInside(path);
      if (!existsSync(join(root, path))) {
        continue;
      }
      fileDigests[path] = fileDigest(readTextInside(root, path));
    }
  }
  const packDir = join(root, ".humanmax/packs/base");
  return {
    project: readYaml(root, ".humanmax/project.yaml"),
    packLock: readYaml(root, ".humanmax/packs.lock"),
    packEntries: existsSync(packDir) ? readPackEntries(packDir) : [],
    generatorLock: lock,
    tools: readTools(root),
    fileDigests,
  };
}

function readTools(root: string): unknown[] {
  const dir = join(root, ".humanmax/tools");
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((name) => name.endsWith(".yaml") || name.endsWith(".yml"))
    .map((name) => {
      assertRelativeInside(name);
      return readYaml(root, `.humanmax/tools/${name}`);
    })
    .filter((tool) => tool !== undefined);
}

function readYaml(root: string, relativePath: string): unknown | undefined {
  if (!existsSync(join(root, relativePath))) {
    return undefined;
  }
  return readCanonicalYaml(readTextInside(root, relativePath), { source: relativePath });
}

function readJson(root: string, relativePath: string): unknown | undefined {
  if (!existsSync(join(root, relativePath))) {
    return undefined;
  }
  return JSON.parse(readTextInside(root, relativePath));
}
