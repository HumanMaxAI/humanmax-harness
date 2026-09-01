import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { test } from "node:test";
import { validate } from "./validate.ts";
import { YAML_READ_LIMITS, YamlParseError, readCanonicalYaml } from "./yaml.ts";

// Fixtures below are the literal strings emitted today by
// packages/project-generator/src/generate.ts. They exist so a generator change
// that the reader cannot parse fails here instead of downstream in a check run.

const PROJECT_YAML = `apiVersion: humanmax.ai/harness/v1alpha1
kind: HarnessProject
metadata:
  projectId: demo-agent
  owners:
    - team: TODO
spec:
  generator:
    version: 0.0.0
    template: tool-agent
    language: typescript
    modelAdapter: generic
  profiles:
    - base
  autonomy: assisted
  runtime:
    defaultBudgets:
      maxSteps: 12
      maxToolCalls: 8
      timeoutSeconds: 120
    undeclaredEffect: deny
    productionEnforcement: unconfigured
    enforcementAdapter: local-review
  include:
    - src/**
    - tests/**
    - evals/**
  exclude:
    - node_modules/**
    - dist/**
    - .git/**
    - .humanmax/evidence/**
  ci:
    failOn: high
    unknownAsFailureFor:
      - critical
      - high
`;

const PACKS_LOCK = `apiVersion: humanmax.ai/pack-lock/v1alpha1
kind: PackLock
packs:
  - id: base
    version: 0.0.0
    digest: sha256:preview-unsigned
    publisherKeyId: humanmax-community-2026
`;

const AGENT_YAML = `apiVersion: humanmax.ai/harness/v1alpha1
kind: Agent
metadata:
  id: default
  version: 0.0.0
  owners:
    business: TODO
    technical: TODO
    risk: TODO
spec:
  purpose: Preview tool-agent with one read tool and one reversible write tool
  autonomyTier: assisted
  prohibitedActions:
    - claim-production-enforcement
  tools:
    - knowledge-read
    - notes-write
  manualFallback: developer-review
  reviewExpiresAt: TODO
`;

const KNOWLEDGE_READ_TOOL_YAML = `apiVersion: humanmax.ai/harness/v1alpha1
kind: Tool
metadata:
  id: knowledge-read
spec:
  effectClass: read
  gateway: not-applicable
  inputSchemaRef: "#/schemas/knowledge-read-input"
  outputSchemaRef: "#/schemas/knowledge-read-output"
  idempotency: not-applicable
`;

const NOTES_WRITE_TOOL_YAML = `apiVersion: humanmax.ai/harness/v1alpha1
kind: Tool
metadata:
  id: notes-write
spec:
  effectClass: reversible-write
  gateway: required
  inputSchemaRef: "#/schemas/notes-write-input"
  outputSchemaRef: "#/schemas/notes-write-output"
  idempotency: required
`;

function readError(text: string, options?: Parameters<typeof readCanonicalYaml>[1]): YamlParseError {
  try {
    readCanonicalYaml(text, options);
  } catch (error) {
    assert.ok(error instanceof YamlParseError, `expected YamlParseError, got ${String(error)}`);
    return error;
  }
  throw new assert.AssertionError({ message: "expected readCanonicalYaml to throw" });
}

test("generated project.yaml round-trips and validates", () => {
  const parsed = readCanonicalYaml(PROJECT_YAML, { source: ".humanmax/project.yaml" });
  assert.deepEqual(parsed, {
    apiVersion: "humanmax.ai/harness/v1alpha1",
    kind: "HarnessProject",
    metadata: {
      projectId: "demo-agent",
      owners: [{ team: "TODO" }],
    },
    spec: {
      generator: {
        version: "0.0.0",
        template: "tool-agent",
        language: "typescript",
        modelAdapter: "generic",
      },
      profiles: ["base"],
      autonomy: "assisted",
      runtime: {
        defaultBudgets: { maxSteps: 12, maxToolCalls: 8, timeoutSeconds: 120 },
        undeclaredEffect: "deny",
        productionEnforcement: "unconfigured",
        enforcementAdapter: "local-review",
      },
      include: ["src/**", "tests/**", "evals/**"],
      exclude: ["node_modules/**", "dist/**", ".git/**", ".humanmax/evidence/**"],
      ci: { failOn: "high", unknownAsFailureFor: ["critical", "high"] },
    },
  });
  assert.equal(validate("HarnessProject", parsed).ok, true);
});

test("generated packs.lock round-trips and validates", () => {
  const parsed = readCanonicalYaml(PACKS_LOCK, { source: ".humanmax/packs.lock" });
  assert.deepEqual(parsed, {
    apiVersion: "humanmax.ai/pack-lock/v1alpha1",
    kind: "PackLock",
    packs: [
      {
        id: "base",
        version: "0.0.0",
        digest: "sha256:preview-unsigned",
        publisherKeyId: "humanmax-community-2026",
      },
    ],
  });
  assert.equal(validate("PackLock", parsed).ok, true);
});

test("generated agent YAML round-trips and validates", () => {
  const parsed = readCanonicalYaml(AGENT_YAML);
  assert.deepEqual(parsed, {
    apiVersion: "humanmax.ai/harness/v1alpha1",
    kind: "Agent",
    metadata: {
      id: "default",
      version: "0.0.0",
      owners: { business: "TODO", technical: "TODO", risk: "TODO" },
    },
    spec: {
      purpose:
        "Preview tool-agent with one read tool and one reversible write tool",
      autonomyTier: "assisted",
      prohibitedActions: ["claim-production-enforcement"],
      tools: ["knowledge-read", "notes-write"],
      manualFallback: "developer-review",
      reviewExpiresAt: "TODO",
    },
  });
  assert.equal(validate("Agent", parsed).ok, true);
});

test("generated tool YAML keeps a quoted schema ref that starts with a hash", () => {
  const read = readCanonicalYaml(KNOWLEDGE_READ_TOOL_YAML);
  assert.deepEqual(read, {
    apiVersion: "humanmax.ai/harness/v1alpha1",
    kind: "Tool",
    metadata: { id: "knowledge-read" },
    spec: {
      effectClass: "read",
      gateway: "not-applicable",
      inputSchemaRef: "#/schemas/knowledge-read-input",
      outputSchemaRef: "#/schemas/knowledge-read-output",
      idempotency: "not-applicable",
    },
  });
  assert.equal(validate("Tool", read).ok, true);

  const write = readCanonicalYaml(NOTES_WRITE_TOOL_YAML);
  assert.deepEqual(write, {
    apiVersion: "humanmax.ai/harness/v1alpha1",
    kind: "Tool",
    metadata: { id: "notes-write" },
    spec: {
      effectClass: "reversible-write",
      gateway: "required",
      inputSchemaRef: "#/schemas/notes-write-input",
      outputSchemaRef: "#/schemas/notes-write-output",
      idempotency: "required",
    },
  });
  assert.equal(validate("Tool", write).ok, true);
});

test("parsing is deterministic and does not mutate its input", () => {
  const text = PROJECT_YAML;
  const first = readCanonicalYaml(text);
  const second = readCanonicalYaml(text);
  assert.deepEqual(first, second);
  assert.equal(text, PROJECT_YAML);
});

test("scalars, comments and empty collections follow the YAML core schema", () => {
  const parsed = readCanonicalYaml(`# leading comment
enabled: true
disabled: False
missing: null
tilde: ~
count: 12
negative: -3
ratio: 1.5
version: 0.0.0
digest: sha256:abc
quoted: "trailing # is not a comment"
single: 'it''s quoted'
escaped: "line\\nbreak"
trailing: value # comment
empty: {}
none: []
`);
  assert.deepEqual(parsed, {
    enabled: true,
    disabled: false,
    missing: null,
    tilde: null,
    count: 12,
    negative: -3,
    ratio: 1.5,
    version: "0.0.0",
    digest: "sha256:abc",
    quoted: "trailing # is not a comment",
    single: "it's quoted",
    escaped: "line\nbreak",
    trailing: "value",
    empty: {},
    none: [],
  });
});

test("a sequence may sit at the indentation of the key that owns it", () => {
  assert.deepEqual(
    readCanonicalYaml(`profiles:
- base
- extra
next: done
`),
    { profiles: ["base", "extra"], next: "done" },
  );
});

test("nested sequences of maps keep their own continuation lines", () => {
  assert.deepEqual(
    readCanonicalYaml(`packs:
  - id: base
    version: 0.0.0
  - id: extra
    version: 1.0.0
`),
    {
      packs: [
        { id: "base", version: "0.0.0" },
        { id: "extra", version: "1.0.0" },
      ],
    },
  );
});

test("a document start marker is accepted once", () => {
  assert.deepEqual(readCanonicalYaml("---\nkind: Tool\n"), { kind: "Tool" });
});

test("an empty or comment-only document reads as null, never as an empty pass", () => {
  for (const text of ["", "\n\n", "# only a comment\n"]) {
    const parsed = readCanonicalYaml(text);
    assert.equal(parsed, null);
    assert.equal(validate("HarnessProject", parsed).ok, false);
  }
});

test("a truncated declaration cannot validate as a project", () => {
  const truncated = PROJECT_YAML.slice(0, PROJECT_YAML.indexOf("  runtime:"));
  const parsed = readCanonicalYaml(truncated);
  const result = validate("HarnessProject", parsed);
  assert.equal(result.ok, false);
});

test("a duplicated key throws instead of silently taking the last value", () => {
  const conflicting = PROJECT_YAML.replace(
    "    productionEnforcement: unconfigured\n",
    "    productionEnforcement: enforced\n    productionEnforcement: unconfigured\n",
  );
  const error = readError(conflicting, { source: ".humanmax/project.yaml" });
  assert.equal(error.code, "duplicate-key");
  assert.match(error.message, /\.humanmax\/project\.yaml line \d+/);
  assert.match(error.message, /productionEnforcement/);
});

test("malformed input throws a typed error rather than degrading", () => {
  const cases: Array<[string, string]> = [
    ["kind HarnessProject\n", "missing-key-separator"],
    [": no key\n", "missing-key-separator"],
    ["spec:\n\tkind: Tool\n", "tab-indentation"],
    ["a:\n    b: 1\n  c: 2\n", "invalid-indentation"],
    ["a: 1\n  b: 2\n", "invalid-indentation"],
    ["spec:\n  - one\n  key: two\n", "invalid-indentation"],
    ['title: "unclosed\n', "unterminated-quote"],
    ['title: "bad \\q escape"\n', "invalid-escape"],
    ['title: "quoted" trailing\n', "unsupported-syntax"],
    ["base: &anchor\n  a: 1\n", "unsupported-syntax"],
    ["copy: *anchor\n", "unsupported-syntax"],
    ["body: |\n  block\n", "unsupported-syntax"],
    ["body: > folded\n", "unsupported-syntax"],
    ["tagged: !!python/object\n", "unsupported-syntax"],
    ["flow: [a, b]\n", "unsupported-syntax"],
    ["kind: Tool\n---\nkind: Agent\n", "multiple-documents"],
    ["title: plain\u001b[31m\n", "invalid-character"],
    ["count: 9007199254740993\n", "unsafe-number"],
    ["ratio: 1e400\n", "unsafe-number"],
  ];
  for (const [text, code] of cases) {
    assert.equal(readError(text).code, code, JSON.stringify(text));
  }
});

test("input size, line, depth and node limits are enforced", () => {
  assert.equal(
    readError("key: value\n", { limits: { maxBytes: 4 } }).code,
    "input-too-large",
  );
  assert.equal(
    readError("a: 1\nb: 2\nc: 3\n", { limits: { maxLines: 2 } }).code,
    "too-many-lines",
  );
  assert.equal(
    readError("a: 1\nb: 2\nc: 3\n", { limits: { maxNodes: 2 } }).code,
    "too-many-nodes",
  );

  const deep = buildDeepMapping(6);
  assert.deepEqual(readCanonicalYaml(deep, { limits: { maxDepth: 6 } }), {
    k0: { k1: { k2: { k3: { k4: { k5: "leaf" } } } } },
  });
  assert.equal(
    readError(deep, { limits: { maxDepth: 5 } }).code,
    "max-depth-exceeded",
  );
});

test("a document exactly at a limit still parses", () => {
  const text = "a: 1\nb: 2\n";
  assert.deepEqual(
    readCanonicalYaml(text, {
      limits: {
        maxBytes: Buffer.byteLength(text, "utf8"),
        maxLines: 3,
        maxNodes: 2,
        maxDepth: 1,
      },
    }),
    { a: 1, b: 2 },
  );
});

test("the default limits are bounded and overridable only with positive integers", () => {
  assert.ok(YAML_READ_LIMITS.maxBytes > 0 && YAML_READ_LIMITS.maxBytes <= 1_048_576);
  assert.ok(YAML_READ_LIMITS.maxDepth > 0 && YAML_READ_LIMITS.maxDepth <= 64);
  for (const limits of [{ maxDepth: 0 }, { maxBytes: -1 }, { maxNodes: 1.5 }]) {
    assert.equal(readError("a: 1\n", { limits }).code, "invalid-limit");
  }
});

test("deeply nested input is rejected before it can exhaust the parser", () => {
  const error = readError(buildDeepMapping(YAML_READ_LIMITS.maxDepth + 5));
  assert.equal(error.code, "max-depth-exceeded");
});

test("non-string input is rejected", () => {
  assert.equal(
    readError(undefined as unknown as string).code,
    "input-not-a-string",
  );
});

function buildDeepMapping(levels: number): string {
  const lines: string[] = [];
  for (let level = 0; level < levels - 1; level += 1) {
    lines.push(`${" ".repeat(level * 2)}k${level}:`);
  }
  lines.push(`${" ".repeat((levels - 1) * 2)}k${levels - 1}: leaf`);
  return `${lines.join("\n")}\n`;
}
