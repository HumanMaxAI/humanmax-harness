import { Buffer } from "node:buffer";
import { createHash } from "node:crypto";

export type PackContentEntry = {
  readonly path: string;
  readonly contents: string;
};

export type PackDigestErrorCode =
  | "empty-pack"
  | "invalid-entry"
  | "invalid-path"
  | "duplicate-path";

export class PackDigestError extends Error {
  readonly code: PackDigestErrorCode;
  readonly path: string | undefined;

  constructor(code: PackDigestErrorCode, detail: string, path?: string) {
    super(path === undefined ? detail : `${detail}: ${JSON.stringify(path)}`);
    this.name = "PackDigestError";
    this.code = code;
    this.path = path;
  }
}

/**
 * Domain separator for the digest input. A digest produced under a different
 * scheme string is a different digest, so the framing can be revised without
 * silently colliding with locks written by an earlier version.
 */
export const PACK_DIGEST_SCHEME = "humanmax.pack-digest/v1";

type NormalisedEntry = {
  path: string;
  pathBytes: Buffer;
  contentBytes: Buffer;
};

/**
 * Compute the deterministic content digest of a Control Pack.
 *
 * The digest covers every declarative file in the pack, framed with explicit
 * byte lengths and sorted by UTF-8 path bytes, so the same pack content always
 * produces the same `sha256:<hex>` value and any content or path change
 * produces a different one.
 *
 * This helper is pure. It never reads the filesystem — the caller supplies the
 * file contents.
 */
export function packDigest(entries: Iterable<PackContentEntry>): string {
  const normalised = normalise(entries);
  const hash = createHash("sha256");
  hash.update(`${PACK_DIGEST_SCHEME}\n`, "utf8");
  hash.update(`${normalised.length}\n`, "utf8");
  for (const entry of normalised) {
    hash.update(`${entry.pathBytes.length}:`, "utf8");
    hash.update(entry.pathBytes);
    hash.update("\n", "utf8");
    hash.update(`${entry.contentBytes.length}:`, "utf8");
    hash.update(entry.contentBytes);
    hash.update("\n", "utf8");
  }
  return `sha256:${hash.digest("hex")}`;
}

function normalise(entries: Iterable<PackContentEntry>): NormalisedEntry[] {
  const normalised: NormalisedEntry[] = [];
  for (const entry of entries) {
    if (
      entry === null ||
      typeof entry !== "object" ||
      typeof entry.path !== "string" ||
      typeof entry.contents !== "string"
    ) {
      throw new PackDigestError(
        "invalid-entry",
        "each pack entry needs a string path and string contents",
      );
    }
    const path = normalisePath(entry.path);
    normalised.push({
      path,
      pathBytes: Buffer.from(path, "utf8"),
      contentBytes: Buffer.from(entry.contents, "utf8"),
    });
  }

  if (normalised.length === 0) {
    throw new PackDigestError(
      "empty-pack",
      "cannot digest a pack with no files; an empty digest attests to nothing",
    );
  }

  normalised.sort((left, right) => Buffer.compare(left.pathBytes, right.pathBytes));
  for (let index = 1; index < normalised.length; index += 1) {
    const previous = normalised[index - 1];
    const current = normalised[index];
    if (previous !== undefined && current !== undefined && previous.path === current.path) {
      throw new PackDigestError(
        "duplicate-path",
        "pack contains the same path twice",
        current.path,
      );
    }
  }
  return normalised;
}

function normalisePath(input: string): string {
  const path = input.replaceAll("\\", "/").replace(/^\.\//, "");
  if (path.trim() === "") {
    throw new PackDigestError("invalid-path", "pack entry path is empty", input);
  }
  if (path.startsWith("/")) {
    throw new PackDigestError(
      "invalid-path",
      "pack entry path must be relative to the pack root",
      input,
    );
  }
  if (path.split("/").includes("..")) {
    throw new PackDigestError(
      "invalid-path",
      "pack entry path must not escape the pack root",
      input,
    );
  }
  return path;
}