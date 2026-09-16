import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { projectPath, readProjectFile } from "./project.ts";

test("CLI reads enforce byte limits and reject non-files and parent paths", (t) => {
  const root = mkdtempSync(join(tmpdir(), "humanmax-cli-reads-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, "boundary"), "x".repeat(256 * 1024));
  assert.equal(readProjectFile(root, "boundary")?.length, 256 * 1024);
  writeFileSync(join(root, "oversized"), "x".repeat(256 * 1024 + 1));
  assert.throws(() => readProjectFile(root, "oversized"), /exceeds/);
  mkdirSync(join(root, "directory"));
  assert.throws(() => readProjectFile(root, "directory"), /non-file/);
  assert.throws(() => readProjectFile(root, "../outside"), /boundary/);
  assert.throws(() => readProjectFile(root, "..\\outside"), /boundary/);
  assert.equal(readProjectFile(root, "absent"), undefined);
});

test("CLI write previews reject links in parent directories", (t) => {
  const root = mkdtempSync(join(tmpdir(), "humanmax-cli-paths-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, "real"));
  symlinkSync(join(root, "real"), join(root, "linked"));
  assert.throws(() => projectPath(root, "linked/new-file"), /symbolic link/);
});
