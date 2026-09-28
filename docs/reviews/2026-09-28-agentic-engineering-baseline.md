# Review: Agentic Engineering source baseline and documentation verification

Date: 2026-09-28. Author: Codex, docs lane.
Design: [Agentic Engineering architecture](../design/2026-09-28-agentic-engineering-architecture.md).
Plan: [documentation and ordered P0 delivery](../plans/2026-09-28-agentic-engineering.md).
Source baseline: `1cb37d57d36cda32c8e6baba58d3d4f984398ba7` (`origin/main`).

This is a source review and author self-check, not independent approval, merge authorization, runtime acceptance, npm verification, or production assurance.

## Baseline findings

| Finding | Evidence inspected | Consequence for the design |
|---|---|---|
| Earlier “cannot generate a customer project” prose is obsolete | `generateProject` / `renderFiles` / `indexTs` in [generate.ts](../../packages/project-generator/src/generate.ts); generator install/tree tests | Correct root README; distinguish current emitted tree from original target |
| Runtime prompt/context/memory/model loop are absent | Public [runtime exports](../../packages/runtime-harness/src/index.ts), [runtime implementation](../../packages/runtime-harness/src/runtime.ts); generated `indexTs` calls read then write directly | P0 features explicitly labeled proposed; do not credit coding Skill as runtime prompt |
| Actual Tool payload schema enforcement is absent | `registerTool` validates the Tool declaration; `invokeTool` passes unknown input/output to/from handlers without resolving schema refs | Required dependency before scoped tool retrieval/model-driven loop |
| Budgets/cancellation are partial | Runtime counts admitted tool attempts and checks elapsed time before invocation; cancellation blocks subsequent calls, with no AbortSignal/deadline cancellation of a running handler | Preserve current counter meaning; add explicit loop/model/token/time accounting and cancellation-race tests |
| Terminal type values alone do not establish lifecycle support | RunLifecycle declares completed/failed; implementation sets running/cancelled but provides no complete transition | New loop must implement terminal-state enforcement, not infer it from types |
| Event support is narrow | `RuntimeEvent` is a generic tool-event shape; in-memory event log omits raw payloads | P0-5 adds full trajectory metadata and bounded local sink, not a hosted audit service |
| Evaluation exists but is not the broader original architecture | [evals.ts](../../packages/cli/src/evals.ts) runs 1–64 root-level local `.eval.ts` files with time/output bounds and four outcomes | Keep discovered root entry points; distinguish runtime verification and offline evals |
| Core coverage is limited to current base families | [evaluate.ts](../../packages/core/src/evaluate.ts), [base rule files](../../packs/base/rules/) | A green check cannot prove comprehensive governance or new contracts |
| Generator user ownership and manual CI matter | `generate.ts` ownership classes, `workflowYml`; [upgrade.ts](../../packages/project-generator/src/upgrade.ts) | Additive migration; no automatic rewrite of user entry/tool/eval files; automatic CI enhancement is separate |

These findings were established by current source inspection, not a new end-to-end run of the published npm packages. Prior chat results were treated as context and not reused as current proof.

## Coverage review (A0)

| Requested requirement | Design coverage |
|---|---|
| All nine disciplines and current state | §§2–3 capability inventory and package/module map |
| Target architecture and boundaries | §3 dataflow/module ownership; §6 runtime semantics |
| Recommended generated directory | §4 additive tree, ownership, test/eval discovery |
| Configuration contracts | §5 version negotiation, seven YAML examples, validation/digests |
| Runtime contracts | §6 boundary table, typed unions, trust, gateway, lifecycle, no-progress, trajectory |
| P0/P1/P2 roadmap | §8; file/package tasks and verification commands in the plan |
| Non-goals and scaffold positioning | §§1, 3 and 11 |
| Acceptance and compatibility | §§9–10; A0/A1–A5/AX and legacy/new-version matrix |
| Documentation first, then exact P0 sequence | Intent/plan and §§1, 8–9; no implementation changes |

## Three self-review passes

- **Behavior:** Documentation implements the committed intent/plan. It distinguishes current code, proposed schemas and future runtime guarantees. The new baseline is linked from maintained indexes; the original dated design is preserved.
- **Constraints:** One registry/gateway, pure Core, four finding states, local-first operation and unconfigured production enforcement remain binding. Same-agent handoff and a bounded single-agent loop do not introduce an orchestration framework. New Agentic scope follows the explicit user request; unrelated Preview exclusions stay excluded.
- **Security:** No secret/customer payload added. Configuration refs, prompt injection, state poisoning, resume authority, ambiguous writes, callback cancellation and trace leakage have explicit design requirements and negative acceptance cases. Hashes are not described as authentication.

Self-review clarified the finite schema subset, active-time versus handoff expiry accounting, immutable execution snapshots, and criterion coverage before completion. Implementation remains responsible for proving these behaviors.

## Verification

Document verification results are recorded after running checks below. New-contract schema conformance and runtime acceptance are **not implemented / not run**; YAML parsing checks syntax only.

```text
node scripts/check-scaffold.mjs
scaffold ok (26 required paths)
exit 0

Canonical YAML reader over the architecture's fenced YAML examples
PASS: 7 YAML examples parse; target schemas not yet implemented
exit 0
```

```text
Relative link verification over all changed/new Markdown files
PASS: 56 local link targets resolve across 10 Markdown files
exit 0

Diff scope verification
PASS: only docs/ and root README.md / CHANGELOG.md changed
exit 0

git diff --check
(no whitespace errors)
exit 0
```

Manual requirement mapping: all requested documentation areas map to the A0 table above. This is an author coverage check, not external architecture approval.

No package/runtime/schema/CI/dependency code changed. Full workspace runtime tests/typecheck are not rerun for prose-only edits; this review does not borrow old tests to certify new P0 features. P0-1 starts only as a separate implementation increment, with its own code and generated-project proof.
