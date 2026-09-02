import { lstatSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { realPath } from "./dependencies.ts";

export const MAX_PACK_FILES = 256;
export const MAX_PACK_FILE_BYTES = 256 * 1024;

export class UnsafePathError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafePathError";
  }
}

/**
 * Reject absolute paths, parent segments, and NUL bytes before any filesystem
 * read. A generator.lock or pack entry must not be able to point outside its
 * declared root.
 */
export function assertRelativeInside(relativePath: string): string {
  const path = relativePath.replaceAll("\\", "/");
  if (path.includes("\0") || path.trim() === "") {
    throw new UnsafePathError(`invalid path ${JSON.stringify(relativePath)}`);
  }
  if (path.startsWith("/") || path.split("/").includes("..")) {
    throw new UnsafePathError(`path escapes its root: ${JSON.stringify(relativePath)}`);
  }
  return path;
}

/**
 * Walk `relativePath` under `root` without following symbolic links. Each
 * component must be a real directory or, for the last component, a real file
 * or directory. A symlink anywhere in the chain is refused, even if its
 * target is still inside `root`.
 */
export function resolveInside(root: string, relativePath: string): string {
  const safe = assertRelativeInside(relativePath);
  let current = realPath(root);
  for (const part of safe.split("/")) {
    if (part === "" || part === ".") {
      continue;
    }
    const next = join(current, part);
    let stat;
    try {
      stat = lstatSync(next);
    } catch {
      throw new UnsafePathError(`path does not exist: ${JSON.stringify(relativePath)}`);
    }
    if (stat.isSymbolicLink()) {
      throw new UnsafePathError(`refusing symbolic link: ${JSON.stringify(relativePath)}`);
    }
    current = next;
  }
  return current;
}

export function readTextInside(
  root: string,
  relativePath: string,
  maxBytes = MAX_PACK_FILE_BYTES,
): string {
  const full = resolveInside(root, relativePath);
  const stat = lstatSync(full);
  if (!stat.isFile()) {
    throw new UnsafePathError(`refusing non-file: ${JSON.stringify(relativePath)}`);
  }
  if (stat.size > maxBytes) {
    throw new UnsafePathError(
      `file exceeds ${maxBytes} bytes: ${JSON.stringify(relativePath)}`,
    );
  }
  return readFileSync(full, "utf8");
}
