import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { readPackEntries } from "./pack-lock.ts";
import { readProjectSnapshot } from "./snapshot.ts";
import {
  UnsafePathError,
  assertRelativeInside,
  readTextInside,
  resolveInside,
} from "./safe-fs.ts";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "humanmax-safe-fs-"));
}

test("relative paths with parent or absolute segments are rejected", () => {
  assert.throws(() => assertRelativeInside("../secret"), UnsafePathError);
  assert.throws(() => assertRelativeInside("/etc/passwd"), UnsafePathError);
  assert.throws(() => assertRelativeInside("foo/../bar"), UnsafePathError);
  assert.throws(() => assertRelativeInside("\0x"), UnsafePathError);
  assert.equal(assertRelativeInside("rules/HMX-PACK-001.json"), "rules/HMX-PACK-001.json");
});

test("a symlink inside a pack is refused rather than followed", () => {
  const root = tempDir();
  const secret = join(root, "secret.txt");
  writeFileSync(secret, "leaked\n");
  const pack = join(root, "pack");
  mkdirSync(pack);
  symlinkSync(secret, join(pack, "README.md"));
  assert.throws(() => readPackEntries(pack), /symbolic link/);
});

test("a directory symlink cannot pull files from outside the pack", () => {
  const root = tempDir();
  const outside = join(root, "outside");
  mkdirSync(outside);
  writeFileSync(join(outside, "passwd"), "leaked\n");
  const pack = join(root, "pack");
  mkdirSync(pack);
  symlinkSync(outside, join(pack, "rules"));
  assert.throws(() => readPackEntries(pack), /symbolic link/);
});

test("readProjectSnapshot refuses generator.lock paths that escape the project", () => {
  const root = tempDir();
  mkdirSync(join(root, ".humanmax"), { recursive: true });
  writeFileSync(
    join(root, ".humanmax/generator.lock"),
    JSON.stringify({
      files: { "../secret.txt": { class: "generated", digest: "sha256:00" } },
    }),
  );
  writeFileSync(join(root, "..", "secret.txt"), "leaked\n");
  assert.throws(() => readProjectSnapshot(root), UnsafePathError);
});

test("generator.lock paths cannot read files outside the project", () => {
  const root = tempDir();
  writeFileSync(join(root, "inside.txt"), "ok\n");
  mkdirSync(join(root, "sub"));
  writeFileSync(join(root, "sub", "file.txt"), "ok\n");
  assert.equal(readTextInside(root, "inside.txt"), "ok\n");
  assert.equal(readTextInside(root, "sub/file.txt"), "ok\n");
  assert.throws(() => resolveInside(root, "../inside.txt"), UnsafePathError);
  assert.throws(() => readTextInside(root, "../inside.txt"), UnsafePathError);
});
