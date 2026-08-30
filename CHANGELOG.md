# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/) and this project follows [Semantic Versioning](https://semver.org/).

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
