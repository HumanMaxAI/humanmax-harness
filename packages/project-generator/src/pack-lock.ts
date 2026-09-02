import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { packDigest, type FileOwnershipClass } from "@humanmax/contracts";
import { realPath } from "./dependencies.ts";

const PACK_ID = "base";

type PackFile = {
  path: string;
  contents: string;
  ownership: FileOwnershipClass;
};

export function previewPackRoot(): string {
  return realPath(fileURLToPath(new URL("../packs/base", import.meta.url)));
}

export function readPackEntries(root: string): { path: string; contents: string }[] {
  return collect(root, "");
}

export function generatedPackFiles(): { files: PackFile[]; digest: string } {
  const source = previewPackRoot();
  const entries = readPackEntries(source);
  const files: PackFile[] = entries.map((entry) => ({
    path: `.humanmax/packs/${PACK_ID}/${entry.path}`,
    ownership: "canonical" as FileOwnershipClass,
    contents: entry.contents,
  }));
  return {
    files,
    digest: packDigest(entries.map((entry) => ({ path: entry.path, contents: entry.contents }))),
  };
}

function collect(root: string, rel: string): { path: string; contents: string }[] {
  const dir = rel === "" ? root : join(root, rel);
  const entries: { path: string; contents: string }[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const child = rel === "" ? name.name : `${rel}/${name.name}`;
    if (name.isDirectory()) {
      entries.push(...collect(root, child));
      continue;
    }
    entries.push({ path: child, contents: readFileSync(join(root, child), "utf8") });
  }
  return entries;
}
