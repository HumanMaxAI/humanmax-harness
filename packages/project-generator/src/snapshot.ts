import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileDigest } from "./generate.ts";
import { parseSimpleYaml } from "./yaml.ts";

export type ProjectSnapshot = {
  project?: unknown;
  tools: unknown[];
  packLock?: unknown;
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
  return {
    project: readYaml(join(root, ".humanmax/project.yaml")),
    packLock: readYaml(join(root, ".humanmax/packs.lock")),
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
  return parseSimpleYaml(readFileSync(path, "utf8"));
}

function readJson(path: string): unknown | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return JSON.parse(readFileSync(path, "utf8"));
}
