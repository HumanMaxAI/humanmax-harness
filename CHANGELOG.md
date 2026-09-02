# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/) and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased] - 2026-09-02

### Added

- Wave 4 plan for remaining Preview P0 gates that an agent can close without npm credentials (`docs/plans/2026-09-02-mvp-wave-4.md`). First slice is `humanmax add tool` documentation (G10). Does not publish packages or expand Preview.
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
