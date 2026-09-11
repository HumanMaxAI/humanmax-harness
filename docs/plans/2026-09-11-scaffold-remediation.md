# Plan — fix verified Preview scaffold gaps

**Date:** 2026-09-11  
**Source:** Human request to continue improving the scaffold after the [fresh acceptance review](../reviews/2026-09-11-generated-scaffold-acceptance.md).

Continue on `codex/cli-completion`. CLI/docs are already claimed. Generator/Core work requires the pending explicit takeover authorization; until it arrives, only CLI/docs may change. Preserve the previous generator/Core branches and their commits.

## Ordered slices

1. **CLI eval execution:** `packages/cli/src/evals.ts`, `eval-worker.ts`, `index.ts`, CLI tests and README. The bounded local Preview convention is `evals/*.eval.ts` exporting `evaluate()` which returns one existing contracts `ResultState`, synchronously or asynchronously. Invoke in a bounded child process with a separate result channel. Missing implementation, missing cases or invalid result is UNKNOWN; thrown/rejected evaluations are FAIL. No result state is promoted. Run alongside the project-owned npm tests and summarize both. This is a local deterministic eval hook, not the deferred external evaluation-provider platform.
2. **Generator build and eval output (after takeover):** `packages/project-generator/src/generate.ts`, `generate.test.ts`, `tree-snapshot.test.ts`, `add.ts`, `add.test.ts`. Emit pinned TypeScript and Node types, build/typecheck scripts, compiled CLI invocation, and a valid emitting tsconfig. Generate an actual gateway eval and UNKNOWN add-eval stubs using the convention above. Reuse reviewed tool-doc code from `d79c44b` with its attribution, without merging unrelated history. Correct stale README/receipt wording. Deliberately update the snapshot only for these reviewed output changes.
3. **Generator upgrade coverage (after takeover):** `upgrade.ts` and `upgrade.test.ts`. Union template paths with all existing lock paths, preserve user-owned additions, expose missing files as manual work, reject unsafe paths through existing safe-fs helpers, and perform no writes. Do not implement apply/merge. Keep existing action vocabulary where possible; any additional manual/missing representation must be documented and tested.
4. **Core ownership semantics (after takeover):** `packages/core/src/evaluate.ts`, `evaluate.test.ts`. User-owned bytes are editable; their presence is still required. Generated/mergeable/canonical integrity, malformed classes and missing evidence remain checked. Do not suppress findings in CLI or rewrite an already produced finding. Keep the unrelated bounded-autonomy branch separate.
5. **Consumer acceptance:** expand `packages/cli/src/integration.test.ts` and generator install tests to create, install, build, typecheck, run, add tool/eval, fail an unimplemented eval, implement an eval, run tests/checks and inspect complete no-write upgrade plans. Include broken evals and user-owned edits. Run the same compiled CLI manually on a fresh project, then workspace build/test/typecheck and offline proof.

Each slice appends today's changelog and has a focused commit with attribution. Docs include a dated follow-up review with commands/exits and remaining gates. Human merge remains outstanding.

## Limits

No public npm publishing, automatic production/CI claims, runtime schema implementation, added contracts, or full-template rewrite in this change. Keep the local-file dependency mode until actual public package install is proven. Structural mapping and host Skill discovery stay explicit outstanding work rather than silently approving a different design. Do not turn a TODO eval into PASS just to keep a fresh add green.
