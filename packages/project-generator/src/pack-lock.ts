import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { packDigest, type FileOwnershipClass } from "@humanmax/contracts";
import { realPath } from "./dependencies.ts";
import {
  MAX_PACK_FILE_BYTES,
  MAX_PACK_FILES,
  UnsafePathError,
  readTextInside,
  resolveInside,
} from "./safe-fs.ts";

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
  const dir = rel === "" ? realPath(root) : resolveInside(root, rel);
  const entries: { path: string; contents: string }[] = [];
  for (const name of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const child = rel === "" ? name.name : `${rel}/${name.name}`;
    if (name.isSymbolicLink()) {
      throw new UnsafePathError(`refusing symbolic link: ${JSON.stringify(child)}`);
    }
    if (name.isDirectory()) {
      entries.push(...collect(root, child));
      if (entries.length > MAX_PACK_FILES) {
        throw new UnsafePathError(`pack exceeds ${MAX_PACK_FILES} files`);
      }
      continue;
    }
    if (!name.isFile()) {
      throw new UnsafePathError(`refusing non-file pack entry: ${JSON.stringify(child)}`);
    }
    entries.push({
      path: child,
      contents: readTextInside(root, child, MAX_PACK_FILE_BYTES),
    });
    if (entries.length > MAX_PACK_FILES) {
      throw new UnsafePathError(`pack exceeds ${MAX_PACK_FILES} files`);
    }
  }
  return entries;
}
