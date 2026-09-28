# Plan: P0-1 Prompt contract implementation

Date: 2026-09-28. Status: active. Parent: [Agentic Engineering architecture](../design/2026-09-28-agentic-engineering-architecture.md), §5.2 and A1. Approved direction: user said “ok” to the documentation baseline and previously requested ordered P0 implementation.

## Target and scope

Deliver one opt-in Prompt contract slice that a new fixture project can validate, compose and run offline. Retain legacy v1alpha1 project/runtime APIs. The coding Skill remains guidance for maintainers; `.humanmax/prompts/default.prompt.yaml` is the runtime prompt authority.

## Ordered edits by lane

1. **Contracts** (`packages/contracts/src/{identifiers,types,validate,index,fixtures}.ts`, `src/*test.ts`, `schemas/prompt.schema.json`, `schemas/harness-project-v1alpha2.schema.json`, `schemas/agent-v1alpha2.schema.json`): add a strict Prompt kind, typed versioned Agent/project opt-in, references and validation tests. New v1alpha2 documents require `prompt` capability and promptRef. Unknown capabilities/references fail. Keep v1alpha1 accepted.
2. **Runtime** (`packages/runtime-harness/src/{prompt,model,output-schema}.ts`, `src/index.ts`, focused tests): deterministic role-separated composition from validated prompt and typed objective, examples and tool views. Add provider-neutral ModelAdapter / fixture adapter and local finite JSON Schema output validator. No autonomous loop or tool execution in model adapter. Missing variables, unsupported schemas, malformed outputs fail before completion. Existing `createRuntime` behavior unchanged.
3. **Generator** (`packages/project-generator/src/{generate,generate.test,tree-snapshot.test,install.test}.ts`, version/dependency files as needed): emit canonical Prompt and output schema, v1alpha2 project/Agent refs and a user-owned offline fixture wiring. Preserve `src/index.ts`, `src/tools.ts` entry behavior and gateway tests. Generator lock lists new ownership classes. Pin new package versions only when publishable; use candidate tarball/local-file mode for pre-release validation.
4. **CLI/Core** (`packages/cli/src/{project,cli}.ts`, tests; `packages/core/src/evaluate.ts`, findings/rules if required): safe-load prompt/schema through existing project snapshot and report missing, invalid, unsupported ref/version as explicit non-PASS. Core lane currently claimed by another unmerged task; no Core edits while claim stands. Keep all existing result states and JSON/SARIF semantics. If the lane remains occupied, leave this last integration unclaimed and report P0-1 incomplete rather than bypass the ownership rule.
5. **Docs**: record exact evidence and limitations in a dated review note and update changelog before commits. Do not rewrite the proposed architecture to fit implementation gaps.

One lane at a time. A slice commits after focused RED/GREEN tests, typecheck and scope review. No unrelated Preview expansion, production enforcement, new registry/gateway or provider dependency.

## Proof

A1: deterministic composition/digest for same canonical input; changed prompt/example/schema changes digest; missing variable, malformed example/role and unsupported schema fail before model invocation; malicious task text remains user data; invalid fixture output rejected; old v1alpha1 project still loads. Generate fresh local-file fixture; build/typecheck/start and project-pinned CLI `test`, `doctor`, `generate --check`, `check`. Run `npm run build`, `npm run typecheck`, and `npm test` for workspace integration. Report published-package availability separately.

## Known dependencies and risks

- Current generator pins released 0.1.0/0.1.1 packages. New generated code cannot import unreleased exports from those versions. Publication/version coordination is part of enabling the new default path; a local source fixture alone cannot establish npm consumer acceptance.
- The current Tool declaration refs are not payload validators. P0-1 must not claim model-driven tool-use safety; `ModelAdapter` validates a proposal but does not execute it.
- `.humanmax` canonical files cannot be automatically overwritten in existing customer projects. Provide a dry-run/manual migration path pending full upgrade apply.
- The Core lane is currently claimed by `feat/core-needs-human-review` and is not merged into origin/main. Do not overwrite that claim or edit Core until free.
