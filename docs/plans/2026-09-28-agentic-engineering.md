# Plan: Agentic Engineering architecture baseline and P0 delivery

Date: 2026-09-28. Status: documentation baseline complete; P0 implementation not started.
Intent: [accepted scope](./2026-09-28-agentic-engineering-intent.md).
Design: [Agentic Engineering architecture](../design/2026-09-28-agentic-engineering-architecture.md).

## Documentation change

Lane: `docs`, isolated branch `docs/agentic-engineering`, based on `origin/main` at `1cb37d57d36cda32c8e6baba58d3d4f984398ba7`.

1. Inspect current contracts, runtime, generator, CLI/evals, and original product design. Separate implemented source from intended architecture and prior chat claims.
2. Write the dated architecture document covering all nine disciplines and executable acceptance criteria for the five P0 stages.
3. Record baseline findings and document verification in a separate dated review; preserve the design/review split.
4. Link the baseline from the design/docs/plan indexes and root README; correct the obsolete README statement about project generation. Add a dated changelog entry.
5. Check scaffold, relative links, proposed YAML examples, requirement coverage, diff scope, and whitespace. Commit and push the docs branch. No merge or release.

Files: this plan, its intent, new `docs/design/2026-09-28-agentic-engineering-architecture.md`, new `docs/reviews/2026-09-28-agentic-engineering-baseline.md`, `docs/design/README.md`, `docs/plans/README.md`, `docs/reviews/README.md`, `docs/README.md`, `README.md`, `CHANGELOG.md`.

## Risks and invariants

Do not describe a future interface as exported today. Do not use documentation to override schemas, declare a review approval, or manufacture a production authorization. Current runtime lacks actual tool payload schema enforcement: the design must identify this dependency before model-driven tool execution. Generated `src/index.ts`, `src/tools.ts`, tests and evals are user-owned; new layouts cannot silently replace them. Do not modify the original product design in place.

The earlier docs claim belonged to the merged `codex/npm-trusted-publishing` branch. Its clean checkout, ancestry in `origin/main`, and completed chat were checked; the claim was archived before acquiring the docs lane. Other lane claims and checkouts remain in place.

## Verification for this documentation change

```bash
node scripts/check-scaffold.mjs
git diff --check
git diff --stat
```

Additionally check relative links in changed Markdown and parse every proposed YAML block with the repository's canonical YAML reader. Inspect each requirement against a design section. These checks establish document consistency, not P0 runtime correctness. Package tests/typecheck become required when implementation changes packages; they are not evidence that proposed contracts already exist.

## Ordered P0 implementation

Each stage is a vertical slice: contracts → runtime → generator → CLI/evals → documentation/evidence. Lanes work sequentially where dependencies or ownership require it. A future implementation change must commit its detailed file-level plan before editing implementation. Do not mark a stage complete from type definitions alone.

| Stage | Capability | Dependencies | Completion evidence |
|---|---|---|---|
| P0-1 | Versioned Prompt contract and deterministic fixture model adapter | Existing runtime/contracts; design baseline | Validated prompt composition, output schema, digest, offline generated fixture |
| P0-2 | Context policy, pruning, compaction and JIT retrieval | P0-1; actual payload validation before registry-backed retrieval | Bounded assembly, provenance/labels, compaction preservation, unauthorized retrieval denial |
| P0-3 | Working state and same-agent handoff | P0-1/2 | Revision-safe state, validated checkpoint, manual resume with fresh authority and remaining budget |
| P0-4 | Bounded loop, completion, verification, no-progress | P0-1/2/3; lifecycle/cancellation and safe retry prerequisites | Verified completion, bounded feedback, cycle stop, no effects after terminal states |
| P0-5 | Structured trajectory and local evidence linkage | P0-1/2/3/4 | Complete ordered redacted trace, manifest references, failure visibility, regression fixture |

### P0-1 — Prompt contract

- [ ] Contracts lane: add Prompt document, schema, identifier/type/validator exports and positive/negative fixtures in `packages/contracts/{schemas,src}`. Add explicit feature-version negotiation as specified in the design.
- [ ] Runtime lane: add prompt composition and provider-neutral model/structured-output boundary in `packages/runtime-harness/src/{prompt,model}.ts` and meaningful tests. Keep existing runtime APIs operational.
- [ ] Generator lane: extend `generate.ts`, tree/install tests and version pins to emit the canonical prompt, output schema and editable agent fixture; do not replace existing user files during upgrade.
- [ ] CLI then Core/findings lanes: load and validate the referenced prompt in `snapshot.ts`/CLI project loader, expose explicit unsupported/invalid results and coverage. Keep pure evaluation in Core; rule changes require pack digest/version updates.
- [ ] Proof: prompt version/digest change, missing variable/example/schema, role-injection text, malformed model proposal/output, old project, and generated-project offline run (design A1).

### P0-2 — Context policy

- [ ] Contracts lane: ContextPolicy + ContextItem/manifest/budget types, labels and trust semantics, strict cross-field validation.
- [ ] Runtime lane: bounded assembler, deterministic selector/pruner/compactor, retrieval adapter and fake token counter. Add actual Tool input/output schema resolution/validation before retrieval invokes registered tools (existing Preview obligation, not a new orchestration feature).
- [ ] Generator lane: canonical context policy and fixture retrieval dataset, thin `src/harness/context.ts`, provenance tests.
- [ ] CLI/Core lanes: policy/ref/capability validation, unsupported schema handling, budget/conflict diagnostics; do not run a model in `check`.
- [ ] Proof: exact/over budget, oversized tool output, protected-content overflow, missing/stale source, path/namespace denial, injected retrieval text, compactor failure, cancellation, legacy fixture (A2).

### P0-3 — Working state / handoff

- [ ] Contracts lane: WorkingState and Handoff schema + expiry/revision/binding fixtures.
- [ ] Runtime lane: immutable revisioned state, single-writer local store, atomic checkpoint and validation; same-agent manual resume only. Thread AbortSignal through adapters and preserve objective-level resource accounting.
- [ ] Generator lane: state customization seam, ignored local state directory, handoff fixture/tests.
- [ ] CLI lane: validate state/manifest references without printing sensitive goal/notes; keep existing command surface (do not add a resume daemon).
- [ ] Proof: stale revision, interrupted write, expired/tampered checkpoint, identity mismatch, changed policy/prompt, no authority restoration, no budget reset, no replay of ambiguous writes (A3).

### P0-4 — Loop policy

- [ ] Contracts lane: LoopPolicy, ModelStep/CompletionDecision, VerificationResult and bounded failure reason codes.
- [ ] Runtime lane: reference single-agent loop + injectable completion/verification evaluators; terminal-state enforcement, timeout/cancellation, no-progress and retry accounting. Validate all runtime budget input before invocation.
- [ ] Generator lane: runnable fixture scenarios, user-owned business completion evaluator and thin run-loop customization; output contract and evidence binding.
- [ ] CLI/evals lane: execute fixtures via existing pinned commands; retain all four finding states and bounded child-process evaluation. Runtime verification is a distinct consumer, not a call to the CLI from inside Core.
- [ ] Proof: premature done, failing/missing/stale verifier, verifier throw/timeout, repeated calls/failures, A→B→A cycle, budget exhaustion, cancellation race, review/deny with zero write executions, malformed input/output (A4).

### P0-5 — Trajectory tracing

- [ ] Contracts lane: versioned event union, causal envelope, trace/evidence manifest references and privacy fields.
- [ ] Runtime lane: bounded local trace sink, event ordering/causality, version/config digests, explicit failure/incomplete-trace state. Earlier stages emit minimal events; this stage completes the unified schema and sinks.
- [ ] Generator/CLI lanes: ignored local trace output, manifest export through existing result/evidence seams, fixture trajectory eval entry point at `evals/*.eval.ts` (current runner is not recursive).
- [ ] Core/findings lane: deterministic completeness/digest/coverage checks from supplied snapshots, no model or filesystem writes.
- [ ] Proof: all terminal paths, unique ordered events, safe serialization, sink failure, no raw prompts/tool args/credentials, deterministic fixture replay without external effect re-execution, old event consumer compatibility (A5).

## Implementation verification commands

Use the existing Node test runner and workspace scripts; do not invent a lint command. From the monorepo root, after installing its locked dependencies:

```bash
npm ci
npm test --workspace @humanmax/contracts
npm test --workspace @humanmax/runtime-harness
npm test --workspace @humanmax/project-generator
npm test --workspace @humanmax/cli
npm test --workspace @humanmax/core
npm run build
npm run typecheck
npm test
```

Run focused tests for each slice, then the complete workspace and distribution verification for the integrated generator/package release. New files outside `src/*.test.ts` must be explicitly included; do not place undiscovered tests in nested directories. Generated fixtures must also pass build/typecheck/start, `humanmax test`, `doctor`, `generate --check`, and `check` with the project-pinned binary. Real-provider quality/performance evaluation is separate from offline fixture correctness.

## Delivery discipline

P0-1 must satisfy A1 before P0-2 starts; likewise through A5. Every implementation PR names the contract version, acceptance IDs, proof commands, legacy fixture result, generated file ownership impact, and remaining limitations. Stop broad code work at the documentation baseline for review in this change, as requested. Subsequent implementation begins with P0-1, using this plan and the design rather than the earlier chat.
