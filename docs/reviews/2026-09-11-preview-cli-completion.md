# Review — Preview CLI completion

**Date:** 2026-09-11  
**Baseline:** `main@35da380`  
**Branch:** `codex/cli-completion`  
**Plan:** [`2026-09-10-preview-cli-completion.md`](../plans/2026-09-10-preview-cli-completion.md)

**Verdict:** The scoped CLI completion work is implemented and locally verified. Human review and merge remain outstanding. This is not a release approval or a replacement for the product design.

## Changes and evidence

| Area | Before | Verified behaviour |
|---|---|---|
| Arguments | Unknown flags accepted; booleans consumed positionals; version absent | Reject malformed requests before writes; support ordered/equals options and successful help/version outside projects |
| Doctor | Printed metadata and completed on invalid configuration | Validate canonical declarations/references; preserve Core failures, UNKNOWN and pack trust status |
| Dev | Imported application code before declaration validation; logs corrupted JSON | Preflight canonical project/agent/tool declarations and pack evaluation, then execute a bounded child with a separate result channel |
| Generation evidence | Missing generator lock could exit successfully | Supply missing evidence to Core as an empty evidence map; preserve UNKNOWN and fail `generate --check` |
| Writes and reads | Added tools could overwrite existing test files; malformed lock could fail after writing; CLI pack precheck followed links | Check generator plans/collisions before application, reject malformed lock maps, and refuse unsafe CLI-owned read/write paths |
| Structured failures | Config failure left JSON stdout empty | Parsed JSON requests receive a failed envelope; no success result or digest is invented |
| Developer loop | Source-level tests and partial command coverage | Real install and compiled, pinned CLI exercised through doctor/dev/add tool/add eval/test/generate/check/upgrade preview |
| Offline G21 | No executable denial proof | PASS locally: OS denies network connections while check and generate --check succeed |

Initial regressions failed before implementation: three argument groups, six diagnostic/path/output scenarios, two JSON scenarios, and two additional lock/path scenarios. None were weakened to pass.

## Final verification

Host: macOS, Node `v26.8.1`. Commands run from this worktree after the final production-code changes:

```text
npm run build
build exit=0

npm test
scaffold ok (26 required paths)
co-author: tests 2, pass 2, fail 0
CLI: tests 44, pass 44, fail 0
contracts: tests 48, pass 48, fail 0
core: tests 9, pass 9, fail 0
create-humanmax-agent: tests 5, pass 5, fail 0
findings: tests 1, pass 1, fail 0
project-generator: tests 20, pass 20, fail 0
runtime-harness: tests 8, pass 8, fail 0
Total: 137 passed, 0 failed
workspace test exit=0

npm run typecheck
typecheck exit=0

node scripts/check-scaffold.mjs
scaffold ok (26 required paths)
exit=0

node packages/cli/verification/offline.mjs
check: PASS with OS network deny; exit=0
generate --check: PASS with OS network deny; exit=0
network controls: allowed=0, denied=13 (EPERM/EACCES); offline proof exit=0
```

The offline proof applies only to the tested macOS sandbox. Other platforms explicitly report UNKNOWN; no proxy setting is counted as network denial. Hosted CI and other Node versions have not been verified in this session.

## Review passes

- **Behaviour:** Reviewed argument parsing, error states, guard-before-write ordering, child result handling, and compiled consumer execution against the committed plan. Tests prove complete project trees stay unchanged on previews and rejected writes.
- **Constraints:** Only CLI, dated plan/review, and append-only changelog changes. Existing contracts/Core/generator/runtime lane work was neither edited nor merged. No second registry, rule engine, approval decision, production adapter, or Preview expansion.
- **Security:** Reviewed pack precheck, digest reads, planned destination paths and child output isolation. No credentials or source-upload path added. CLI path checks are local preflight checks, not race-proof filesystem isolation; the fixture child is not a sandbox.

The independent review agent failed because of its usage limit and returned no review findings. The above are author review passes, not independent approval. Human code-owner review is still NEEDS_HUMAN_REVIEW.

## Remaining product work outside this CLI slice

- The active generator branch has the G10 tool documentation change; it is not part of this branch. Generator `planUpgrade` still enumerates the default template, so completeness for files added later requires generator work.
- Runtime input/output schema resolution and full lifecycle/budget/cancellation guarantees remain separate work. CLI declaration validation cannot establish these runtime invariants or exclusive control over arbitrary project code. G13 public adapter conformance was planned but not implemented before the human redirected this task to CLI.
- Core still owns finding semantics, user-owned-file digest treatment and additional NEEDS_HUMAN_REVIEW results; existing Core/contracts branches need their own review and integration.
- Cross-host Skill compatibility, threat model publication, package distribution and ownership/licensing decisions are not closed here. Generated dependencies remain in the repository's current local-file mode.

Passing this branch's tests does not mean all Preview gates are met, nor that a generated agent is safe for production.
