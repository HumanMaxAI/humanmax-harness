# CLI eval verification — 2026-09-12

Scope: slice 1 of the [committed remediation plan](../plans/2026-09-11-scaffold-remediation.md). CLI/docs only; generator and Core claims remain with their existing writers pending explicit takeover authorization.

## Result

The ignored-eval defect from the [fresh scaffold acceptance review](2026-09-11-generated-scaffold-acceptance.md) is fixed: `humanmax test` executes each top-level local eval, preserves all four contract result states, and exits nonzero unless both npm tests and every eval pass. Legacy static objects are UNKNOWN. Errors are FAIL. No evidence or interruption cannot produce PASS.

A fresh project was generated using the compiled create command, dependencies installed with npm, and its installed `node_modules/.bin/humanmax` invoked directly. Only the disposable eval fixture was changed between cases, then restored:

```text
fresh static stub:               npm PASS, eval UNKNOWN; exit=1
implemented gateway evaluation:  npm PASS, eval PASS;    exit=0
throwing evaluation:             npm PASS, eval FAIL;    exit=1
```

The passing eval actually invokes `runFixture()` and checks read success, local review, no write execution, and unconfigured production enforcement. It is not an unconditional PASS stub. Local command outputs are retained outside git at `/var/folders/rk/1yq9fg7n0l3459k1j2t63qy40000gn/T/humanmax-eval-acceptance-qq3d076d/evidence.json`.

## Verification output

```text
npm run build: exit=0
npm test: 144 tests, 144 pass, 0 fail; exit=0
  CLI: 51 tests, 51 pass, 0 fail
npm run typecheck: exit=0
node scripts/check-scaffold.mjs: scaffold ok (26 required paths); exit=0
node packages/cli/verification/offline.mjs:
  check: PASS with OS network deny; exit=0
  generate --check: PASS with OS network deny; exit=0
  network controls: allowed=0, denied=13 (EPERM/EACCES); offline proof exit=0
```

Regression coverage includes state preservation, throws/rejections, missing and malformed results, unsafe symlinks, output overflow, early exit without a result, and an eval that ignores SIGTERM. The latter is forcibly terminated at the 10-second limit and reported UNKNOWN. The installed-project integration covers add previews without writes, legacy UNKNOWN, then actual gateway eval implementations passing.

## Review and remaining gates

Self-review covered behaviour against the committed plan, repository constraints and local-code/path handling. No Core finding is suppressed, no gateway or production adapter is added, no source is uploaded, and no generated user files are silently rewritten. Local eval code is trusted code; the child process is not a sandbox. Independent agent review was unavailable after the earlier reviewer failed due to usage limits; human review and merge remain outstanding.

Overall scaffold acceptance remains **FAIL**. Generator build/typecheck output, executable default evals and CLI script, add-tool documentation, complete upgrade plans, and Core user-owned-file semantics are still pending. Existing generator/Core branches were preserved without edits. Broader tree/schema/Skill-discovery gaps in the original review are not closed by this change. Passing repository tests do not establish publishability or full design conformance.
