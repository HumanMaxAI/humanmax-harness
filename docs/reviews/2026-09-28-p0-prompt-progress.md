# Review: P0-1 Prompt implementation progress

Date: 2026-09-28. Author: Codex, docs lane. Status: **partial; A1 and AX are not accepted**.
Design: [Agentic Engineering architecture](../design/2026-09-28-agentic-engineering-architecture.md), §§5.2 and 9.
Plan: [P0-1 Prompt contract](../plans/2026-09-28-p0-prompt-contract.md).

This review records source and local verification evidence. It is not an independent approval, merge authorization, published-package check, or production assurance.

## Implemented source slices

| Lane | Branch head | Local result |
|---|---|---|
| contracts | `feat/p0-prompt-contract@1e5ef71` | Opt-in v1alpha2 Prompt, Agent and project contracts; strict validators and JSON schemas; v1alpha1 retained |
| runtime | `feat/p0-prompt-runtime@a5cb672` | Deterministic role-separated composition and digest, bounded local schema subset, provider-neutral fixture model and proposal validation |
| cli | `feat/p0-prompt-cli@16c47bf` | Prompt/schema reference admission checks; v1alpha2 `check` explicitly fails until a locked Core/Pack rule evaluates it |
| generator | `feat/p0-prompt-generator@19f677d` | Local-file-only opt-in Prompt project fixture with canonical Prompt/schema, user-owned offline candidate test and ownership metadata; default tree unchanged |

The branches are stacked and pushed. None is merged or released. Existing package manifests remain contracts/runtime `0.1.0` and CLI/generator `0.1.1`; the new APIs are **not** available from those published versions. The opt-in is therefore restricted to a source-local `file:` fixture. The generated fixture validates a candidate; it does not establish task completion or tool-use safety.

## Evidence

Source revision for integration: `feat/p0-prompt-generator@19f677d`, containing the three preceding source commits. On that clean worktree:

```text
git diff --check origin/main...HEAD                       exit 0
npm run typecheck                                      exit 0
npm run build && npm test                              exit 0
```

Workspace test summaries after the fresh build: CI 18/18, CLI 55/55, contracts 52/52, Core 9/9, findings 5/5, create package 1/1, generator 24/24, runtime 13/13. The first test run used stale local `dist` artifacts after edits and failed; rebuilding before the repeated full test resolved that local build-order issue. These results do not imply published-package verification.

Relevant negative and integration cases include `packages/runtime-harness/src/prompt.test.ts` (stable composition; user text remains user role; missing variables, malformed examples and unsupported schema reject; malformed output rejects), `packages/cli/src/prompt-declarations.test.ts` (missing references reject; valid v1alpha2 `check` refuses PASS), and `packages/project-generator/src/install.test.ts` (fresh opt-in project installs, builds, typechecks, tests and passes `doctor`; `check` exits nonzero for the unsupported locked rule). Existing default generator snapshot and legacy v1alpha1 tests pass in the workspace run.

## Open acceptance items

| Gate | Current state | Needed before acceptance |
|---|---|---|
| A1 prompt | Source-local behavior and negative cases tested; **partial** | Finish locked Core/Pack evaluation and the complete generated-project CLI path; verify release-compatible package versions |
| AX integrated scaffold | Opt-in local fixture `install`/`build`/`typecheck`/`test`/`doctor` pass; **not accepted** | Pinned `generate --check` and `check` must pass on a fresh target without masking Prompt gaps; packed/published package path needs separate proof |
| P0-2 through P0-5 | **Not started** | Begin only after P0-1 gate and its dependency are resolved in order |

The Core lane is claimed in `.agent-claims/core.json` by `cursor-grok-4.6` for unmerged `feat/core-needs-human-review`. [AGENTS.md](../../AGENTS.md) requires one writer per lane and says, “If the lane is claimed, stop. Do not overwrite the claim.” Accordingly, no Core or `packs/` files were edited. A plain CLI-only success would contradict the contract/pack authority chain and could report a false PASS, so `check` fails visibly for v1alpha2 until this rule is implemented and tested.
