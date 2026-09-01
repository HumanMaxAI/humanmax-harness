# Preview gap review — the create → run → check loop

**Date:** 2026-09-02  
**Subject:** `main` at `07448fa` (PR #3, "Ship the Preview create-run-check loop")  
**Measured against:** design §20 MVP release gates and the Preview P0 list in [`2026-08-30-product-review.md`](./2026-08-30-product-review.md)  
**Verdict:** Preview is not shippable. The primary developer loop is broken in a generated project while repository CI is green.

This file is a review. It does not replace or amend the design. Implementation follows [`../plans/2026-09-02-preview-green-loop.md`](../plans/2026-09-02-preview-green-loop.md).

## Headline finding

**A generated project does not install, run, or check.** `create-humanmax-agent` exits 0 and writes a complete-looking 18-file tree, `npm install` reports success, and then every downstream command fails. The repository's own `npm test` and `npm run typecheck` pass throughout, so nothing in CI observed the break.

The 2026-08-30 review set the Preview success moment as "a real Harness-mediated run, not a folder of policy files." What ships today is the folder of policy files.

### Reproduction

Verified 2026-09-02 on macOS, Node v26.8.1 / npm 11.19.0 locally; CI targets Node 22.

```
$ node packages/create-humanmax-agent/src/cli.ts "$T/demo-agent" --defaults --apply
Created demo-agent in /var/folders/rk/.../T/tmp.3Qfhq6CwOs/demo-agent
$ echo $?
0
$ find "$T/demo-agent" -type f | wc -l
      18

$ cd "$T/demo-agent" && npm install
added 3 packages, and audited 7 packages in 121ms
found 0 vulnerabilities
$ echo $?
0

$ npm test; echo "exit=$?"
Error [ERR_MODULE_NOT_FOUND]: Cannot find package '@humanmax/runtime-harness' imported from
  /private/var/folders/rk/.../T/tmp.3Qfhq6CwOs/demo-agent/tests/gateway.test.ts
exit=1

$ npx humanmax doctor; echo "exit=$?"
npm error code E404
npm error 404 Not Found - GET https://registry.npmjs.org/humanmax - Not found
exit=1

$ npm ls
├── @humanmax/cli@ invalid: "file:../../../../../../../Users/onesg/.../packages/cli" from the root project
├── @humanmax/contracts@ invalid: "file:../../../../../../../Users/onesg/.../packages/contracts" from the root project
└── @humanmax/runtime-harness@ invalid: "file:../../../../../../../Users/onesg/.../packages/runtime-harness" from the root project
npm error code ELSPROBLEMS

$ ls node_modules/.bin
ls: node_modules/.bin: No such file or directory
```

### Root cause

`fileDep()` in `packages/project-generator/src/generate.ts` builds the dependency specifier from a plain path difference and never resolves symlinks:

`packages/project-generator/src/generate.ts:173`

```ts
function fileDep(destination: string, packageName: string): string {
  const target = join(harnessRoot, "packages", packageName);
  const rel = relative(destination, target);
  return `file:${rel.startsWith(".") ? rel : `./${rel}`}`;
}
```

On macOS `/var` is a symlink to `/private/var`. The destination is reported as `/var/folders/.../demo-agent` but its real path is `/private/var/folders/.../demo-agent`, one segment deeper. The emitted specifier therefore carries one `../` too few. npm accepts it, records the dependency, and creates symlinks under `node_modules/@humanmax/` that point at a path which does not exist. Because no dependency actually resolves, npm never materialises `node_modules/.bin`, so the project-pinned `humanmax` binary is absent and `npx humanmax` falls through to the public registry, where the name is unclaimed — hence the 404.

Two failures compound here: a path bug, and a generated workflow that calls `npx humanmax` (`packages/project-generator/src/generate.ts`, `workflowYml()`), which is not a project-pinned invocation. `AGENTS.md` requires the project-pinned binary and explicitly forbids treating a globally resolved CLI as authoritative.

### Why the tests missed it

`linkWorkspacePackages()` in `packages/project-generator/src/generate.test.ts` hand-creates absolute symlinks into the workspace and never runs `npm install`:

`packages/project-generator/src/generate.test.ts:71`

```ts
async function linkWorkspacePackages(dest: string): Promise<void> {
  const scope = join(dest, "node_modules", "@humanmax");
  await mkdir(scope, { recursive: true });
  await symlink(
    join(harnessRoot, "packages", "runtime-harness"),
    join(scope, "runtime-harness"),
  );
  await symlink(join(harnessRoot, "packages", "contracts"), join(scope, "contracts"));
}
```

The test then imports `src/index.ts` directly and asserts on `runFixture()`. It validates the fixture's runtime logic — reads succeed, writes go to review, `productionEnforcement` stays `unconfigured` — and proves nothing about the install path the user takes. The commit message for `fce10ff` says "Make generated projects install and test from /tmp"; the test substitutes a hand-built `node_modules` for the install it claims to exercise.

`.github/workflows/ci.yml` runs `npm ci`, `npm run typecheck`, and `npm test` only. There is no job that generates a project and uses it, which is precisely why this shipped green.

## Confirmed gaps

Each row was verified against `main` at `07448fa` on 2026-09-02.

| Area | Finding |
|---|---|
| Generated project install | Broken. `fileDep()` omits `realpath` resolution; npm writes dangling symlinks and no `.bin`. See reproduction above. |
| Deterministic snapshot-tested file tree | Missing. `packages/project-generator/src/snapshot.ts` is a project *reader* (`readProjectSnapshot`) that digests an existing tree for Core evaluation. It is not a snapshot test, and no test asserts the generated file list or contents. |
| `minimal` template | Not generated. `PREVIEW_TEMPLATES` lists `minimal`, but `generateProject` throws `"Preview only generates the tool-agent template"`. |
| JSON and SARIF from one finding set | SARIF is absent from the entire tree outside `AGENTS.md`. `runCli` reads `--format` and supports `terminal` and `json` only. |
| Pack digest / trust stops evaluation | Not implemented. The four rule files under `packs/base/rules/*.json` are never read by any code — they are dead data; rule identity is hardcoded in `PREVIEW_RULES` in `packages/findings/src/index.ts`. Generated `.humanmax/packs.lock` carries the literal `digest: sha256:preview-unsigned`. A digest mismatch produces a `FAIL` finding but does not stop evaluation. |
| Exit codes | `EXIT_CODES` in `packages/contracts/src/identifiers.ts` defines `packTrust: 3` and `internal: 4`. `runCli` returns only `0`, `1`, and `2`; the `catch` block maps every internal failure to `1`. |
| Enforcement-adapter conformance suite | Missing. `LocalReviewAdapter` and `DenyAllProductionAdapter` are covered by unit tests in `packages/runtime-harness/src/runtime.test.ts`, but no public conformance suite exists that a third-party adapter could run. |
| YAML parsing | Hand-rolled 89-line parser in `packages/project-generator/src/yaml.ts`. It returns partial objects on malformed input rather than failing, and enforces no size, depth, or node bounds — contrary to design §13.2 ("parse files with bounded size, depth and count limits", "protect against malformed JSON/YAML … parser resource exhaustion"). It is the parser behind every `check` result, via `readProjectSnapshot`. |
| CLI `versions` | Hardcoded. `packages/cli/src/index.ts` returns `versions: { cli: "0.0.0", core: "0.0.0", contracts: "0.0.0" }` rather than reading package manifests, so `doctor` cannot be used to identify what actually ran. |
| `templates/` and `profiles/` | Contain only READMEs (`templates/tool-agent/README.md`, `templates/minimal/README.md`, `profiles/base/README.md`). Every template body is an inlined TypeScript string literal in `generate.ts`. Design §4.2 requires `project-generator` to resolve "base templates and ordered profile overlays"; there is nothing to resolve. |
| `humanmax add tool` change set | Emits declaration, `src/tools.ts`, a test, and the agent registry entry. No documentation file, which §20 requires as part of the same change set. |
| Rule result states | No rule emits `NEEDS_HUMAN_REVIEW`. `packages/core/src/evaluate.ts` counts the state in its summary but never produces it. |
| Offline proof | No test asserts that `check` runs with network access disabled. |
| Contract fixtures | `validate.ts` compares `apiVersion` exactly, but no test supplies an incompatible-version document, and there are no boundary fixtures. |
| Threat model | Not written. `docs/guides/` holds only a `.gitkeep`. `SECURITY.md`, `GOVERNANCE.md`, and `CONTRIBUTING.md` are present. |
| Repository CI | `.github/workflows/ci.yml` runs `typecheck` and `test` only. No end-to-end job creates a project, installs it, and exercises the CLI. |
| Stale lane claims | `.agent-claims/contracts.json` and `.agent-claims/runtime.json` referenced branches that were already merged. Cleared 2026-09-02. |

## MVP release gate status

Gates are the 33 bullets in design §20, in document order. Status is answered as "is this gate met for a first public release today", so a mechanism proven inside this repository but unreachable from a generated project is recorded as `FAIL` with the in-repo evidence named. Absence of evidence is `UNKNOWN`, never `PASS`. `Deferred` means the 2026-08-30 review moved the surface out of Preview; those gates return when Preview expands.

| # | Gate (§20) | Status | Evidence |
|---|---|---|---|
| G1 | Repository ownership and relicensing documented | NEEDS_HUMAN_REVIEW | Apache-2.0 `LICENSE` and `NOTICE` are present. No document records extraction rights from the source repositories (design §17). Launch blocker 2 is still open. |
| G2 | Public package and CLI names reserved | FAIL | 2026-09-02 registry check: `humanmax`, `create-humanmax-agent`, `@humanmax/cli`, `@humanmax/contracts`, `@humanmax/harness` all return E404. |
| G3 | `npm create humanmax-agent@latest my-agent` generates into an empty directory and refuses unsafe collisions | FAIL | Collision refusal is proven locally (`create-humanmax-agent/src/cli.test.ts`, `generate.test.ts`). The published command does not exist (G2). |
| G4 | `minimal` and `tool-agent` produce deterministic, snapshot-tested file trees | FAIL | `minimal` throws. No snapshot test of the generated tree exists. |
| G5 | A clean generated project installs, builds, runs and passes tests without manual edits or credentials | FAIL | Reproduction above: `ERR_MODULE_NOT_FOUND`, `npm ls` invalid, no `node_modules/.bin`. |
| G6 | The first local run visibly passes through the Runtime Harness | FAIL | `runFixture()` behaves correctly under a hand-linked `node_modules` (`generate.test.ts`), but `npm test` and `humanmax dev` both fail in a real generated project. Blocked by G5. |
| G7 | Generated run state, budgets, registry, schema validation, cancellation and event interfaces have positive and failure-path tests | FAIL | `runtime.test.ts` covers fail-closed registry, budget exhaustion, cancellation, and redacted events. No schema-validation failure-path test; the generated project carries only `tests/gateway.test.ts`, which cannot run (G5). |
| G8 | An effectful example tool can execute only through the generated action gateway | FAIL | Proven in `runtime.test.ts` ("effectful tools cannot skip the action gateway"). The generated copy cannot execute. Blocked by G5. |
| G9 | A direct or undeclared effectful path fails a documented bypass test | FAIL | Proven in `runtime.test.ts` ("undeclared tools fail closed"). The generated bypass test cannot execute. Blocked by G5. |
| G10 | `humanmax add tool` creates declaration, source, registry entry, test and documentation as one previewable change set | FAIL | `add.ts` emits declaration, source, test, and registry entry as one no-write plan (`add.test.ts`). Documentation is not emitted. |
| G11 | `humanmax upgrade --dry-run` produces a complete no-write plan across generated, mergeable, canonical and user-owned files | PASS | `upgrade.ts` classifies all four ownership classes and returns `wrote: false`; `upgrade.test.ts` asserts the destination is byte-identical afterwards. |
| G12 | Upgrade fixtures prove clean replacement, three-way merge, semantic migration, conflict preservation, failed-upgrade rollback | Deferred | Complete `upgrade --apply` is out of Preview per the 2026-08-30 review. |
| G13 | Local review and deny-all-production adapters pass the public enforcement-adapter conformance suite | FAIL | No conformance suite exists. Unit tests are not a public suite a third-party adapter can run. |
| G14 | Installing an enforcement adapter cannot activate or claim production enforcement | PASS | `enforcement-state.ts` reports `unconfigured`; `runtime.test.ts` asserts deny-all-production never allows an effectful action; `index.test.ts` asserts the runtime does not imply production enforcement. |
| G15 | Deterministic custom evaluation provider produces versioned evidence references without rewriting an external failure | Deferred | Not in the Preview P0 ship list. Note: generated `evals/gateway.eval.ts` is a static object literal, not a provider implementation. |
| G16 | `generate --check`, `test` and `check` pass in the generated GitHub workflow | FAIL | The workflow runs `npm ci`, `npm test`, then `npx humanmax …`. `npm test` fails (G5) and `npx humanmax` 404s. |
| G17 | The starter CI requires no HumanMax account and uploads no project source | PASS | Generated `workflowYml()` uses only `actions/checkout`, `actions/setup-node`, npm, and the CLI. No secrets, no upload step, `permissions: contents: read`. |
| G18 | Contracts have positive, negative, boundary and incompatible-version fixtures | FAIL | Positive and negative fixtures exist (`validate.test.ts`, `schemas.test.ts`). No boundary or incompatible-`apiVersion` fixture. |
| G19 | P0 rules distinguish PASS, FAIL, UNKNOWN and NEEDS_HUMAN_REVIEW correctly | FAIL | `evaluate.test.ts` covers PASS, FAIL, and UNKNOWN. No rule can produce `NEEDS_HUMAN_REVIEW`. |
| G20 | No result can be promoted by Agent Skill text or project instructions | PASS | `validate.test.ts` ("exception never rewrites a finding result to PASS"); the canonical Skill and generated `AGENTS.md` restate the prohibition and only invoke CLI JSON. |
| G21 | `check` runs successfully with network access disabled | UNKNOWN | No offline test. `packages/core` has no network import, but the gate asks for a proof that does not exist. |
| G22 | Pack digest/signature and compatibility failures stop evaluation | FAIL | A digest mismatch yields a `FAIL` finding and evaluation continues. `EXIT_CODES.packTrust` (3) is never returned. Pack rule files are never loaded. |
| G23 | `adopt` preserves existing project instructions and requires preview/apply | Deferred | `adopt` is out of Preview. |
| G24 | `inspect` labels confidence, source and blind spots | Deferred | `inspect` is not in the Preview CLI surface. |
| G25 | Exceptions require owner, approver, rationale, scope and expiry | PASS | `RiskException` requires `owner`, `approver`, `rationale`, `subject` and `expiresAt`; `validate.test.ts` rejects a missing-field exception and an expired one. |
| G26 | JSON and SARIF outputs derive from the same finding set | FAIL | No SARIF writer exists. |
| G27 | Identical canonical inputs generate identical finding identities | PASS | `finding-id.test.ts`: identity is stable for the same rule, subject and location; message text is excluded; a different subject changes the id. |
| G28 | Evidence preview confirms excluded sensitive fields | Deferred | Evidence bundles are out of Preview. Runtime event redaction is tested separately. |
| G29 | The canonical Skill passes compatibility and realistic workflow tests in at least Codex and Claude Code | UNKNOWN | No recorded compatibility run for either host. |
| G30 | The Agent Skill can add a tool through the generator while preserving registry, declaration, test and gateway invariants | UNKNOWN | The generator path is tested directly; no Skill-driven workflow test exists, and the CLI is unreachable in a generated project (G5). |
| G31 | The GitHub Action uses the project-pinned CLI and needs no HumanMax account | FAIL | `npx humanmax` resolves to the public registry, not `node_modules/.bin`, and 404s. No account is required, but the pinning half of the gate is not met. |
| G32 | Threat model, security policy, governance and contribution policy are public | FAIL | `SECURITY.md`, `GOVERNANCE.md`, `CONTRIBUTING.md` are present. No threat model. |
| G33 | Documentation states clearly that Harness is not certification or runtime enforcement | PASS | `README.md`: "Harness does not enforce production actions, issue certification, or replace IAM, GRC, SIEM, or a secrets manager." |

### Tally

| Status | Count | Gates |
|---|---|---|
| PASS | 7 | G11, G14, G17, G20, G25, G27, G33 |
| FAIL | 17 | G2–G10, G13, G16, G18, G19, G22, G26, G31, G32 |
| UNKNOWN | 3 | G21, G29, G30 |
| NEEDS_HUMAN_REVIEW | 1 | G1 |
| Deferred out of Preview | 5 | G12, G15, G23, G24, G28 |
| **Total** | **33** | |

Seven of the 28 in-Preview gates are met. The seven that pass are contract-level and runtime-level invariants; every gate that depends on a user actually receiving a working project fails.

## Launch blockers

Status of the four blockers from the 2026-08-30 review, as at 2026-09-02.

| # | Blocker | Status |
|---|---|---|
| 1 | GitHub organisation, npm scope, CLI name | Organisation settled (`HumanMaxAI`). npm names unreserved — see below. Now active work; see the plan. |
| 2 | Relicensing and extraction rights | Open. Apache-2.0 is chosen and applied; extraction rights from the source repositories are not documented. |
| 3 | DCO versus CLA | Open. `CONTRIBUTING.md` exists; no decision recorded. |
| 4 | Pack signature format and publisher trust root | Open. `digest: sha256:preview-unsigned` is a placeholder and no digest is computed or verified. |

### npm namespace check, 2026-09-02

| Name | Registry response |
|---|---|
| `humanmax` | 404 — unclaimed |
| `create-humanmax-agent` | 404 — unclaimed |
| `@humanmax/cli` | 404 — unclaimed |
| `@humanmax/contracts` | 404 — unclaimed |
| `@humanmax/harness` | 404 — unclaimed |

Nothing has been published. `npm whoami` returns `ENEEDAUTH`, so no npm session is authenticated on this machine. Every name the design and the generated projects assume is currently unreserved and available to anyone.

## What this review does not do

It does not amend `docs/design/2026-08-29-open-source-product-design.md`. The design's §20 gate list is unchanged and remains the bar. It does not reclassify any `FAIL`, `UNKNOWN`, or `NEEDS_HUMAN_REVIEW` above as acceptable. The remediation sequence is in [`../plans/2026-09-02-preview-green-loop.md`](../plans/2026-09-02-preview-green-loop.md).
