# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/) and this project follows [Semantic Versioning](https://semver.org/).

## [Unreleased] - 2026-09-02

### Added

- Preview gap review (`docs/reviews/2026-09-02-preview-gap-review.md`) measuring `main@07448fa` against design §20 gates: the create → run → check loop does not work while repository CI is green.
- Execution plan (`docs/plans/2026-09-02-preview-green-loop.md`) for the green loop, including the 2026-09-02 decisions (publish to npm, SARIF in Preview, contracts-first YAML/digest).

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
