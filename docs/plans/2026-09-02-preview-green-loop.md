# Plan — make the Preview create → run → check loop green

**Date:** 2026-09-02  
**Follows:** [`../reviews/2026-09-02-preview-gap-review.md`](../reviews/2026-09-02-preview-gap-review.md)  
**Does not replace:** [`../design/2026-08-29-open-source-product-design.md`](../design/2026-08-29-open-source-product-design.md)

This is an execution plan. It does not amend the design.

## Decisions taken 2026-09-02

1. **Distribution.** Generated projects will depend on published `@humanmax/*` version ranges, not local `file:` links or packed tarballs. This promotes launch blocker #1 (GitHub organisation, npm scope, CLI name) into active work. Publishing itself is gated on the maintainer's npm credentials and an explicit approval. Until publish, Preview keeps `file:` specifiers that resolve through real paths.
2. **SARIF.** In scope for this round. The `cli` lane emits `--format sarif` from the same finding set as JSON.
3. **YAML and pack digest.** The `contracts` lane lands a hardened canonical YAML reader and a pure pack digest helper first, in isolation. `core` and `generator` consume them afterwards.

## Wave 1 — parallel (in flight)

Write sets do not overlap except `CHANGELOG.md`. The coordinator resolves changelog collisions, then runs root `npm test` and `npm run typecheck`.

| Lane | Branch | Write set | Gates closed | Verify |
|---|---|---|---|---|
| `contracts` | `feat/contracts-yaml-digest` | `packages/contracts/**` | Unlocks G18 (malformed YAML) and G22 (digest helper). Does not yet load packs or stop evaluation. | `npm test` / `npm run typecheck` in the worktree |
| `generator` | `fix/generator-install-path` | `packages/project-generator/**`, `packages/create-humanmax-agent/**`, `templates/**`, `profiles/**` | G5 (install/test), G4 (file-tree snapshot), honest generated workflow for G16/G31 | Real `npm install` + `npm test` + `humanmax doctor` in a `/tmp` generated project |
| `cli` | `feat/cli-sarif-exit-codes` | `packages/cli/**` | G26 (SARIF), exit codes 3 and 4, real versions, non-swallowing `test` | `check --format json` and `--format sarif` on a fixture; broken project non-zero |
| `docs` | `docs/preview-gap-review` | `docs/**` | Evidence and sequencing; no gate is closed by prose | `npm test` (includes `scripts/check-scaffold.mjs`) |

## Wave 2 — blocked on Wave 1

| Lane | Depends on | Write set | Gates closed | Verify |
|---|---|---|---|---|
| `core` | `contracts` digest + YAML reader | `packages/core/**`, `packages/findings/**`, `packs/**` | G22: load `packs/base/rules/*.json`, verify pack digest, mismatch stops evaluation and maps to exit code 3. Migrate `readProjectSnapshot` onto `readCanonicalYaml`. | `npm test` with a tampered digest; missing evidence stays `UNKNOWN` |
| `ci` | `generator` install path | `.github/**` | End-to-end job: create, install, test, `doctor` / `check` / `generate --check` | GitHub Actions on the PR, Node 22 |

Do not start `ci` until a generated project installs on this machine. A red e2e job that only restates G5 is not progress.

## Wave 3 — coordinator, serial

Publishing readiness. This edits **shared files** (`package.json` in every package, compiled output, type declarations, version strategy, npm scope reservation). Per `AGENTS.md`, shared files are not a lane and cannot run concurrently with Wave 1 or 2.

Blocked on: Wave 1 + Wave 2 merged, maintainer npm login, explicit publish approval, and open launch blockers 2–4 (relicensing, DCO vs CLA, pack trust root) if those must land before the first public tarball.

Until packages are published, generated projects keep local `file:` dependencies and the generated workflow stays `workflow_dispatch` only. Switching `DEPENDENCY_MODE` to `"published"` is a single change in `packages/project-generator/src/dependencies.ts`.

## Changelog merge

Each Wave 1 lane appends its own `## [Unreleased] - 2026-09-02` bullets. The coordinator concatenates them; no lane rewrites another lane's entry.

## Out of scope this plan

`adopt --apply`, `upgrade --apply`, `regulated`, wizard `sg-core`, Trust Engine, Moonshot, Python, evidence viewer, pack ecosystem. Expanding Preview requires an explicit human request.
