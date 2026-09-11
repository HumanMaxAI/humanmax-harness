# Review — generated scaffold acceptance

**Date:** 2026-09-11  
**Subject:** Fresh project created by the compiled bootstrap CLI from `codex/cli-completion@0f3bfcd`  
**Request:** Run the CLI locally and verify the generated structure and outputs against product requirements.  
**Baseline:** Product design §5, §6, §20, restricted by the approved Preview cut.

**Verdict: FAIL for complete scaffold acceptance.** The local create/run/check loop works. This does not establish that the generated project meets the structural, build, maintenance, evaluation and CI requirements. The previous CLI completion review was a scoped command implementation review, not scaffold acceptance.

## Reproduction

On macOS / Node v26.8.1, invoke the compiled `packages/create-humanmax-agent/dist/cli.js` with a new temporary destination and `--defaults`. First run `--dry-run`; then create without `--apply`. Bootstrap writes 23 files, including a generator lock covering the other 22 files. Perform real `npm install --ignore-scripts --no-audit --no-fund`, then use the installed `node_modules/.bin/humanmax`.

The local audit folder is `/var/folders/rk/1yq9fg7n0l3459k1j2t63qy40000gn/T/humanmax-scaffold-audit-unmrZp/`. `fresh-agent/` retains the runnable generated project plus CLI-added audit tool/eval. `evidence.json` contains command output and before/after file digests. Deliberate negative-test edits were restored. These temporary evidence payloads are not committed.

## Observed baseline tree

```text
fresh-agent/
  package.json, tsconfig.json, README.md, AGENTS.md, .gitignore, .env.example
  .humanmax/
    project.yaml, generator.lock, packs.lock
    agents/default.agent.yaml
    tools/{knowledge-read,notes-write}.tool.yaml
    packs/base/README.md
    packs/base/rules/{HMX-GEN-001,HMX-PACK-001,HMX-PROJ-001,HMX-TOOL-004}.json
  src/{index,tools}.ts
  tests/gateway.test.ts
  evals/gateway.eval.ts
  skills/humanmax-agent-harness/SKILL.md
  .github/workflows/humanmax.yml
```

## Passing evidence

| Probe | Result |
|---|---|
| Compiled bootstrap dry-run / create | Both exit 0 |
| Actual dependency install | Exit 0; six local packages installed |
| Installed CLI doctor | Exit 0; 5 PASS, no FAIL/UNKNOWN |
| Installed CLI dev / npm start | Exit 0; read=ok, write=review, writeExecuted=false, productionEnforcement=unconfigured |
| Generated npm test | Exit 0; 2 tests passed |
| Generate check / assurance check | Exit 0; 5 PASS before extension |
| Add effectful tool dry-run | Exit 0; full file digests unchanged |
| Apply tool and eval; test and generate check | Exit 0; added gateway test passes, 6 Core PASS results |
| Restore negative-test edits; check/generate | Both exit 0 |

These checks inspect the existing rules. They do not prove requirements those rules do not test.

## Findings

### P1 — Generated project does not build or typecheck as delivered

`npm run build` and `npm run typecheck` both exit 1 with “Missing script”. The generated package has only start/test/humanmax scripts and does not include TypeScript or Node type dependencies. Invoking the repository's installed TypeScript compiler directly against the generated `tsconfig.json` exits 2 with TS2307/TS2580 for `node:url`, `node:test`, `node:assert/strict` and `process`.

This is actual generated-project failure, despite workspace typecheck passing. Relevant gate: §20 clean generated install/build/run/test. Owner: generator.

### P1 — Test command does not exercise emitted evals

After `humanmax add eval audit-eval`, replace only that generated eval with `throw new Error("EVAL_MUST_FAIL")`. `humanmax test --format json` still exits 0 with result PASS. Its child runs only `tests/*.test.ts`; `evals/*.eval.ts` is not loaded. Emitted eval files are static objects, not executed evaluation cases.

This is a gap against §6.6's quality-contract/eval checks. External evaluation providers remain deferred; this finding does not request them. Owner: CLI/generator, with an explicit minimal eval contract needed before implementation.

### P1 — Upgrade dry-run omits added files

After adding `audit-write` and `audit-eval`, upgrade dry-run returns exit 0 but has no entries for `.humanmax/tools/audit-write.tool.yaml`, `tests/audit-write.test.ts`, or `evals/audit-eval.eval.ts`. Its plan re-enumerates the default template. It cannot be called complete across ownership classes after a supported add workflow. Full apply/three-way merge remains deferred; complete no-write planning is in Preview. Owner: generator.

### P1 — Portable install and automatic CI are unavailable in this artifact

All six dependencies resolve through relative `file:` paths into the generating checkout. The workflow has only `workflow_dispatch`; it explicitly says its hosted-runner dependency install cannot resolve those paths. No PR/push gate is produced that can actually pass on a clean hosted runner.

Additionally, generated `scripts.humanmax` points at `node_modules/@humanmax/cli/src/cli.ts`, whereas the CLI package's publication file list is `dist`. Local symlinks conceal this distribution incompatibility. This audit does not assert current npm registry publication status. Owners: generator/distribution/CI.

### P2 — Add-tool documentation is missing

The actual dry-run/apply change set contains declaration, `src/tools.ts`, test and default-agent update. `docs/tools/audit-write.md` does not exist afterwards. G10 requires the documentation stub in the same change set. A separate generator branch already contains proposed work; it was not merged or counted as delivered here.

### P2 — Harmless user-owned edits fail the generated integrity gate

With the eval restored, append only a comment to `src/index.ts`, which generator.lock classifies as user-owned. `generate --check` exits 1 with HMX-GEN-001, “Digest mismatch: src/index.ts”. The same file passes after restoration. This is not a combined eval/source mutation result. It undermines the maintenance experience promised by ownership classes. Owner: Core/generator; do not fix by suppressing findings in CLI.

### Structural conformance and documentation gaps

The actual tree differs from §5: no `src/agent/`, `src/harness/`, `src/tools/registry.ts`, `src/execution/action-gateway.ts`, `.humanmax/policies/`, or generated `docs/` guides. Runtime mechanics are imported from the package, but there is no approved dated mapping establishing that this reduced tree satisfies the generated-project contract. Skill is emitted under `skills/`, while §5 shows `.agents/skills/`; §9 distinguishes the canonical portable package from host installation adapters. Host discovery is UNKNOWN, not inferred from a SKILL.md file existing.

Schema references such as `#/schemas/notes-write-input` have no emitted schema definitions. Tool declaration validation and gateway tests do not demonstrate input/output schema validation. Generated README also incorrectly says the linked CLI has no shebang, despite this audit successfully running its compiled executable. Generator receipt/lock report version 0.0.0 while installed packages report 0.1.0, requiring lineage clarification.

Not every full-design directory should be added mechanically: some surfaces are deferred. Resolve the exact Preview tree in an explicit design mapping, then snapshot and validate that contract. Do not silently rewrite the original design or implement out-of-scope platform features.

## Next work

1. Restore a self-contained build/typecheck path and correct compiled CLI invocation in generated package metadata.
2. Integrate/review the already prepared add-tool docs change; make upgrade dry-run include all locked and added paths.
3. Define and execute the minimal Preview eval contract; protect it with the failing-eval fixture above.
4. Resolve user-owned integrity semantics and the approved Preview structure/Skill installation mapping.
5. Verify a portable package install and a real generated PR CI gate before release acceptance.

This review does not modify the occupied generator/Core lanes, accept risk, approve a release or grant production authority.
