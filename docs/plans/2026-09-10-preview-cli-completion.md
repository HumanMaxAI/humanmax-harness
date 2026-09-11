# Plan — complete the Preview CLI

**Date:** 2026-09-10  
**Source:** Human request: “继续吧 把cli完成”, followed by explicit authorization to take over the CLI lane. Design §6 and the 2026-08-30 Preview cut remain authoritative.

## Baseline and ownership

Base: `main@35da380`. Workspace build and all 28 existing CLI tests pass. The previous CLI branch is merged and clean; its stale claim is replaced only after the human authorized takeover. Other occupied lanes stay untouched.

Worktree `.worktrees/cli-completion`, branch `codex/cli-completion`. Own `packages/cli/**`, dated plan/review files under `docs/**`, and additive changelog entries. Do not edit contracts, Core, generator, runtime, shared workspace configuration, or existing branch work. The earlier runtime conformance plan remains on its branch; no runtime implementation was started.

## Completion scope

Keep `dev`, `add tool`, `add eval`, `generate --check`, `upgrade --dry-run`, `test`, `doctor`, and thin `check`. No new product commands, production adapters, publishing, upgrade apply, adoption, or new templates.

### 1. Arguments and usable output

- Files: `packages/cli/src/args.ts`, `args.test.ts`, `index.ts`, `cli.test.ts`, package README.
- Parse boolean and valued options independently of their position. Reject unknown, duplicate, missing-value, extra-positional, and command-incompatible options before reads or writes.
- Implement successful help/version outside projects. Validate effect classes through contracts and reject unsafe component identifiers/collisions before generator writes.
- Preserve JSON/SARIF formats and codes 0–4. Display actionable terminal results, including paths in add/upgrade previews, findings, doctor diagnostics, and test output.
- Proof: failing CLI regressions first, then focused tests. Invalid requests must leave the fixture byte-identical.

### 2. Diagnostics and guarded execution

- Files: `packages/cli/src/project.ts`, `project.test.ts`, `index.ts`, `cli.test.ts`; add a local execution module only if needed to isolate project logs from JSON.
- Use contracts validation and Core evaluation; do not duplicate assurance rules. Doctor must identify invalid canonical declarations and failed pack trust, not merely print metadata.
- Validate project/tool/agent declarations and declared tool references before `dev` loads application code. Preserve the existing local fixture and unconfigured production state.
- CLI-owned reads must refuse links, non-files and oversized input before parsing, including pack-lock prechecks and response digests. Reuse the generator's public snapshot API; do not import its private files.
- Keep config failures distinct from unexpected execution failures. `generate --check` must not exit successfully when generator evidence is missing. No conversion of UNKNOWN or NEEDS_HUMAN_REVIEW to PASS.
- Guard add change sets against unintended overwrites using generator dry-run plans before application. Keep Core findings separate from input/config diagnostics.
- Proof: negative fixtures, no execution marker on invalid configuration, no writes on rejection, and unchanged findings in JSON/SARIF.

### 3. Complete developer-loop and offline proof

- Files: `packages/cli/src/cli.test.ts`, dedicated CLI integration/offline tests and test fixtures within this package, README, dated progress review.
- Exercise real generated install → pinned CLI doctor/dev/add tool/add eval/test/generate --check/check/upgrade --dry-run. Check complete tree contents around dry runs and refused requests.
- Prove offline `check` with network blocked at the process/OS boundary and a negative network control. If the host cannot enforce network blocking, record UNKNOWN instead of calling a proxy setting a proof.
- Test the compiled CLI entry point as a consumer, not just direct source imports.
- Record generator/runtime gaps that cannot be fixed within the owned CLI lane. CLI completion is not a claim that all Preview release gates are met.

## Verification and delivery

Each implementation slice starts with regression tests and ends with focused verification. Final commands: `npm run build`, `npm test`, `npm run typecheck`, `node scripts/check-scaffold.mjs`. Paste exit-bearing summaries before claiming success. Inspect the final diff against `docs/agents/pr-review.md`, update the dated review, commit with generated attribution, and push over the configured HumanMaxAI SSH remote. Human merge and publishing remain separate gates.

## Implementation notes (2026-09-11)

Argument regressions live in `cli.test.ts` rather than a separate `args.test.ts`. File-boundary tests live in `project.test.ts`. `fixture.ts` and `fixture-worker.ts` isolate execution and JSON results. `integration.test.ts` exercises the compiled pinned CLI after real install. The OS offline proof is the explicit `packages/cli/verification/offline.mjs` command, which reports UNKNOWN outside macOS rather than weakening the proof to proxy or JavaScript interception.

The independent review agent failed due to its usage limit; it produced no review evidence. The author performs the repository's three review passes and leaves human review/merge outstanding. No other claimed lane was edited or merged.
