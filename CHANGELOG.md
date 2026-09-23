# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/) and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased] - 2026-09-23

### Fixed

- Extend post-publish npm exact-version verification to three minutes after CLI 0.1.1 became visible just beyond the former two-minute bound.
- Block npm publication when the committed dependency graph has an npm advisory at any severity, including low and moderate findings.
- Include bounded, credential-redacted npm diagnostics when a publish command is rejected, and document All Packages token access for the initial unscoped bootstrap releases.

## [Unreleased] - 2026-09-17

### Fixed

- Retry exact-version verification after a successful npm publish while registry metadata propagates. The retry is bounded and still fails immediately for authentication, network and malformed registry responses.

## [Unreleased] - 2026-09-16

### Fixed

- Bind the main-only npm publish job to the existing `prod` environment so it can access `NPM_TOKEN`. Missing credentials now fail visibly instead of producing a successful workflow with publication skipped.

## [Unreleased] - 2026-09-15

### Fixed

- Prepare generator 0.1.1 with pinned npm dependencies and a direct runtime dependency, so a new project no longer depends on its creator's checkout or npm cache. CLI and bootstrap require the fixed generator.
- Emit an installed CLI npm script, pinned compiler/Node types, build/typecheck scripts and an executable default gateway eval. Preserve UNKNOWN for unimplemented added evals and all other Preview limitations.

### Added

- Packed-distribution CI verification using candidate tarballs and public npm dependencies, including bootstrap removal, clean install/ci, project relocation, compiled execution, the convenience wrapper and the full CLI loop.

## [Unreleased] - 2026-09-14

### Planned

- Repair generator npm dependencies and build/default-eval output, and verify packed candidates through a disposable npm registry before the main-only publish gate.

## [Unreleased] - 2026-09-13

### Planned

- Prepare the authorized CLI npm fix release, repair CI publication gates and registry/version handling, and verify the packed CLI against public dependencies before publication.

### Fixed

- Prepare `@humanmax/cli@0.1.1` for the argument validation, local project boundary and eval-result fixes recorded below. Legacy eval stubs now require implementation and return UNKNOWN; the candidate has not yet been published.
- Make the main-only npm workflow valid by checking secret availability at step level. Unconfigured credentials explicitly skip publication.
- Correct workspace version parsing, stop publication on registry errors, verify published versions, and add a read-only release preview plus regression tests.

## [Unreleased] - 2026-09-12

### Fixed

- `humanmax test` now executes local evals alongside project tests. Missing/legacy implementations remain UNKNOWN, errors fail, and all four result states survive in CLI JSON; no unimplemented eval can count as a pass.

### Added

- Bounded per-file eval child processes with isolated result output and regression coverage for all states, exceptions, missing evidence and unsafe links.

## [Unreleased] - 2026-09-11

### Planned

- Remediate the locally reproduced generated-build, eval execution, upgrade coverage and user-owned integrity gaps; preserve outstanding structural and distribution gates.

### Added

- Fresh generated-scaffold acceptance review: local CLI loop passes, but generated build/types, eval execution, upgrade completeness, add-tool docs, portability and structural conformance remain incomplete.

- Real generated-install integration coverage for the complete pinned Preview CLI loop, plus a macOS OS-network-denial proof for `check` and `generate --check` with positive and negative network controls.
- CLI command, output, exit-code, filesystem-boundary and verification documentation.

### Fixed

- `doctor` validates canonical declarations and reports Core findings; `dev` validates agent/tool references before loading application code. Missing generator evidence fails `generate --check` without promoting UNKNOWN to PASS.
- CLI pack prechecks, response digests, add plans, and upgrade previews reject unsafe file paths; malformed generator locks and existing component outputs are refused before writes.
- `dev` runs the fixture in a child process with bounded time/output and a separate result channel, keeping application logs out of JSON. Configuration failures from parsed JSON requests now return a failed CLI envelope.
- Terminal command output includes results and planned file paths.

## [Unreleased] - 2026-09-10

### Fixed

- CLI arguments now reject unknown, duplicate, incompatible, or missing-value options before writes, validate effect classes, and preserve positionals around boolean flags. Help and version succeed outside projects.

### Added

- CLI completion plan covering strict arguments, project diagnostics, guarded execution, and generated-project/offline verification within Preview.

## [Unreleased] - 2026-09-02

### Added

- Internal AI-native SDLC adapter for this repository: dated `*-intent.md` proto-specs under `docs/plans/`, plan-before-code, verify-before-done, and PR review passes in `docs/agents/pr-review.md`. Operating note: `docs/agents/2026-09-02-ai-native-sdlc.md`. Does not expand Preview or generate customer intent trees.
- First public npm versions (`0.1.0`) emit compiled JavaScript and `.d.ts` to `dist/`. Bins are `dist/cli.js` with a Node shebang. `@humanmax/project-generator` embeds `packs/` at pack time so a published generator can still lock `base`.
- Convenience package `humanmax` re-exports the `@humanmax/cli` bin so the unscoped name is reserved.
- `@humanmax/contracts` exports `readCanonicalYaml` (bounded YAML subset; malformed input throws `YamlParseError`) and `packDigest` (pure, path-sorted `sha256:<hex>` over pack contents). `parseSimpleYaml` is now that reader.
- `humanmax check` and `humanmax generate --check` accept `--format sarif` (SARIF 2.1.0 from the same finding set as JSON). `FAIL`, `UNKNOWN`, and `NEEDS_HUMAN_REVIEW` never map to SARIF `kind: pass`.
- Deterministic `tool-agent` file-tree snapshot test (paths, ownership, content digests).
- Real `npm install` + `npm test` + `humanmax doctor` coverage for a generated project; the previous test hand-linked packages and missed the install path.
- Preview gap review (`docs/reviews/2026-09-02-preview-gap-review.md`) measuring `main@07448fa` against design §20 gates: the create → run → check loop does not work while repository CI is green.
- Execution plan (`docs/plans/2026-09-02-preview-green-loop.md`) for the green loop, including the 2026-09-02 decisions (publish to npm, SARIF in Preview, contracts-first YAML/digest). Wave 3 is ready to publish; npm rejected the first PUT because the `humanmax` account needs 2FA or a granular publish token.
- Generated projects copy `packs/base` into `.humanmax/packs/base` and lock a real `packDigest`. Core recomputes the digest; a mismatch stops evaluation and the CLI exits 3.
- Repository CI job `generated-project` creates, installs, tests, and checks a project from this checkout.
- CI `publish` job on `main` after `workspace` (tests, typecheck, `npm audit --audit-level=high`) and `generated-project`. Pull requests do not publish. Versions already on the registry are skipped.

### Changed

- Workspace packages are `0.1.0` and depend on each other with `^0.1.0`. Root `npm run build` compiles in dependency order. Generated projects still use local `file:` specifiers until the registry publish completes.
- CLI exit codes: usage/config → 2, pack-lock schema trust → 3, unexpected execution failure → 4. Findings/tests still → 1.
- `readProjectSnapshot` parses declarations with `readCanonicalYaml`. Malformed YAML throws rather than returning a partial object.
- `CliResponse.versions` is read from installed package manifests instead of hardcoded `0.0.0`.
- `humanmax test` reports the child runner's result as `PASS`/`FAIL`/`UNKNOWN` and never marks a non-zero child as `completed`.
- Generated GitHub workflow is `workflow_dispatch` only until `@humanmax/*` is published. A hosted runner cannot resolve local `file:` paths; Harness CI status on GitHub is `UNKNOWN`, not a green check for checks that never ran.

### Security

- Pack and generator-lock reads refuse symbolic links, parent-path escapes, and oversized files. A lock entry such as `../.ssh/id_rsa` cannot be opened during `check`.
- CI installs with `--ignore-scripts`, then runs the workspace build explicitly, and fails on high-or-critical `npm audit` findings.
- Compiled CLI bins are marked executable before pack so npm does not strip them.

### Fixed

- Generated `file:` dependencies now resolve through real paths, so a macOS `/var` → `/private/var` hop no longer produces dangling `@humanmax/*` links. `npm install` in a generated project creates `node_modules/.bin/humanmax` and `npm test` can run.

## [0.0.0] - 2026-09-01

### Added

- Preview project generator for TypeScript `tool-agent` + `base`: dry-run plan, refuse non-empty destinations without `apply`, and write a runnable fixture (`runFixture`) that reads, reviews writes, and keeps `productionEnforcement: unconfigured`.
- `create-humanmax-agent <dir> --defaults` CLI that delegates to the generator (`--dry-run`, `--apply`). Preview does not emit `sg-core`.
- Generator `add tool` / `add eval` change sets and `upgrade --dry-run` ownership plans (no apply). Generated projects pin `@humanmax/cli` and run `generate --check` plus `check` in GitHub Actions.
- Deterministic Core evaluation for production-enforcement, gateway coverage, pack digest lock, and generator-lock integrity. Missing evidence is `UNKNOWN`, never `PASS`.
- Declarative `base` pack rule metadata (`packs/base/rules`) and finding helpers in `@humanmax/findings`.
- Preview `humanmax` CLI: `dev`, `add`, `generate --check`, `upgrade --dry-run`, `test`, `doctor`, thin `check`, with JSON `CliResponse` output.
- Canonical Skill that only instructs the project-pinned CLI JSON contract.

### Changed

- Agent git identity: commit and push harness work over SSH as HumanMaxAI (`docs/agents/git-identity.md`). Do not use the personal `billrain` fork or `gh` HTTPS.

## [0.0.0] - 2026-08-30

### Added

- Repository workspace scaffold for Preview packages: `create-humanmax-agent`, `project-generator`, `runtime-harness`, `contracts`, `core`, `cli`, and `findings`.
- `AGENTS.md` as the binding multi-agent operating manual: source-of-truth order, Preview scope, exclusive lanes, worktree and claim protocol, and hard constraints.
- Cursor rules and `CLAUDE.md` as adapters that point at `AGENTS.md` instead of inventing a second instruction set.
- Documentation split: design under `docs/design/`, reviews under `docs/reviews/`, agent operations under `docs/agents/`.
- Product review of design v0.3 at `docs/reviews/2026-08-30-product-review.md`.
- Scaffold integrity check (`scripts/check-scaffold.mjs`) and workspace `npm test` / `npm run typecheck`.
- Required agent commit trailer `Co-authored-by: <Harness> + <Model>` via `scripts/co-author.mjs` and `docs/agents/commit-attribution.md`.
- Preview public contracts in `@humanmax/contracts`: project, tool, finding, exception and rule documents, JSON Schema, `validate`, deterministic `findingId`, and `applyException` that cannot rewrite a result to `PASS`.
- Preview Runtime Harness: run budgets, tool registry, action gateway, redacted events, `LocalReviewAdapter`, and `DenyAllProductionAdapter`. Effectful tools cannot skip the gateway or claim production enforcement.

### Changed

- Moved the open-source product design from the repository root to `docs/design/2026-08-29-open-source-product-design.md`.
