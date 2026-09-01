import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PACK_DIGEST_SCHEME,
  PackDigestError,
  type PackContentEntry,
  packDigest,
} from "./pack-digest.ts";
import { validate } from "./validate.ts";

const BASE_PACK: PackContentEntry[] = [
  {
    path: "pack.yaml",
    contents: "id: base\nversion: 0.0.0\n",
  },
  {
    path: "rules/HMX-TOOL-004.yaml",
    contents: "id: HMX-TOOL-004\nresultWhenMissing: UNKNOWN\n",
  },
  {
    path: "rules/HMX-RUN-001.yaml",
    contents: "id: HMX-RUN-001\nresultWhenMissing: UNKNOWN\n",
  },
];

function digestError(entries: Iterable<PackContentEntry>): PackDigestError {
  try {
    packDigest(entries);
  } catch (error) {
    assert.ok(error instanceof PackDigestError, `expected PackDigestError, got ${String(error)}`);
    return error;
  }
  throw new assert.AssertionError({ message: "expected packDigest to throw" });
}

test("a pack digest is a sha256 hex string", () => {
  const digest = packDigest(BASE_PACK);
  assert.match(digest, /^sha256:[0-9a-f]{64}$/);
});

test("identical pack content always produces an identical digest", () => {
  const first = packDigest(BASE_PACK);
  const second = packDigest([...BASE_PACK].reverse());
  const third = packDigest(BASE_PACK.map((entry) => ({ ...entry })));
  assert.equal(first, second);
  assert.equal(first, third);
});

test("digesting does not mutate the caller's entries", () => {
  const entries = BASE_PACK.map((entry) => ({ ...entry }));
  packDigest(entries);
  assert.deepEqual(entries, BASE_PACK);
});

test("any content change changes the digest", () => {
  const baseline = packDigest(BASE_PACK);
  const changed = packDigest(
    BASE_PACK.map((entry) =>
      entry.path === "pack.yaml"
        ? { ...entry, contents: `${entry.contents}extra: true\n` }
        : entry,
    ),
  );
  assert.notEqual(baseline, changed);
});

test("a whitespace-only content change still changes the digest", () => {
  const baseline = packDigest([{ path: "pack.yaml", contents: "id: base\n" }]);
  const trailing = packDigest([{ path: "pack.yaml", contents: "id: base\n\n" }]);
  assert.notEqual(baseline, trailing);
});

test("any path change changes the digest", () => {
  const baseline = packDigest(BASE_PACK);
  const renamed = packDigest(
    BASE_PACK.map((entry) =>
      entry.path === "rules/HMX-RUN-001.yaml"
        ? { ...entry, path: "rules/HMX-RUN-002.yaml" }
        : entry,
    ),
  );
  assert.notEqual(baseline, renamed);
});

test("content cannot be moved between the path and the body without changing the digest", () => {
  const left = packDigest([{ path: "ab", contents: "c" }]);
  const right = packDigest([{ path: "a", contents: "bc" }]);
  assert.notEqual(left, right);
});

test("adding or removing a file changes the digest", () => {
  const baseline = packDigest(BASE_PACK);
  const extra = packDigest([...BASE_PACK, { path: "README.md", contents: "" }]);
  const fewer = packDigest(BASE_PACK.slice(1));
  assert.notEqual(baseline, extra);
  assert.notEqual(baseline, fewer);
});

test("path separators are normalised so the digest is platform-stable", () => {
  const posix = packDigest([{ path: "rules/base.yaml", contents: "id: base\n" }]);
  const windows = packDigest([{ path: "rules\\base.yaml", contents: "id: base\n" }]);
  const dotted = packDigest([{ path: "./rules/base.yaml", contents: "id: base\n" }]);
  assert.equal(posix, windows);
  assert.equal(posix, dotted);
});

test("the digest scheme is part of the hashed material", () => {
  assert.equal(PACK_DIGEST_SCHEME, "humanmax.pack-digest/v1");
});

test("a pack with no files cannot be digested", () => {
  const error = digestError([]);
  assert.equal(error.code, "empty-pack");
});

test("duplicate, escaping and malformed entries are rejected", () => {
  assert.equal(
    digestError([
      { path: "pack.yaml", contents: "a" },
      { path: "./pack.yaml", contents: "b" },
    ]).code,
    "duplicate-path",
  );
  assert.equal(
    digestError([{ path: "../outside.yaml", contents: "" }]).code,
    "invalid-path",
  );
  assert.equal(
    digestError([{ path: "/etc/passwd", contents: "" }]).code,
    "invalid-path",
  );
  assert.equal(digestError([{ path: "   ", contents: "" }]).code, "invalid-path");
  assert.equal(
    digestError([{ path: "pack.yaml" } as unknown as PackContentEntry]).code,
    "invalid-entry",
  );
  assert.equal(
    digestError([null as unknown as PackContentEntry]).code,
    "invalid-entry",
  );
});

test("a computed digest satisfies the PackLock contract", () => {
  const lock = {
    apiVersion: "humanmax.ai/pack-lock/v1alpha1",
    kind: "PackLock",
    packs: [
      {
        id: "base",
        version: "0.0.0",
        digest: packDigest(BASE_PACK),
        publisherKeyId: "humanmax-community-2026",
      },
    ],
  };
  assert.equal(validate("PackLock", lock).ok, true);
});
