import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readCanonicalYaml } from "@humanmax/contracts";
import { fileDigest } from "./generate.ts";
import { readPackEntries } from "./pack-lock.ts";

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
  const lock = readJson(join(root, ".humanmax/generator.lock")) as
    | ProjectSnapshot["generatorLock"]
    | undefined;
  if (lock?.files) {
    for (const path of Object.keys(lock.files)) {
      const fullPath = join(root, path);
      if (existsSync(fullPath)) {
        fileDigests[path] = fileDigest(readFileSync(fullPath, "utf8"));
      }
    }
  }
  const packDir = join(root, ".humanmax/packs/base");
  return {
    project: readYaml(join(root, ".humanmax/project.yaml")),
    packLock: readYaml(join(root, ".humanmax/packs.lock")),
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
    .map((name) => readYaml(join(dir, name)))
    .filter((tool) => tool !== undefined);
}

function readYaml(path: string): unknown | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return readCanonicalYaml(readFileSync(path, "utf8"), { source: path });
}

function readJson(path: string): unknown | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}
