# Plan: remediate CodeQL release findings

Intent: [`2026-09-26-codeql-findings-intent.md`](./2026-09-26-codeql-findings-intent.md)

## Files and lanes

- `scripts/check-codeql-sarif.mjs`, `scripts/check-codeql-sarif.test.mjs` (`ci`): emit bounded rule, path, and line diagnostics while retaining the non-zero result gate.
- `packages/cli/src/index.ts`, `packages/cli/src/index.test.ts`, `packages/cli/src/project.ts`, `packages/cli/src/project.test.ts` (`cli`): replace the polynomial ANSI expression with the Node bounded parser and bind checked file metadata to the opened descriptor.
- `packages/project-generator/src/safe-fs.ts`, `packages/project-generator/src/safe-fs.test.ts`, `packages/project-generator/src/generate.test.ts` (`generator`): read through a non-following descriptor with identity checks and remove the hard-coded `/tmp` dry-run fixture that creates a false production finding.
- `packages/contracts/src/yaml.ts`, `packages/contracts/src/yaml.test.ts` (`contracts`): decode quoted keys once in source order. This step waits for the current contracts claim to be released or explicitly overridden.
- `CHANGELOG.md`: append the remediation and diagnostic behavior change.

## Order

1. Add regression tests for bounded SARIF diagnostics, ANSI stripping, descriptor-backed reads, and quoted-key escaping.
2. Implement CI, CLI, and generator fixes in their claimed lanes.
3. Re-run CodeQL 2.27.1 `security-extended`; expect only the claimed contracts finding to remain before the contracts change.
4. Resolve contracts ownership, implement its single-pass decoder, and re-run CodeQL expecting zero results.
5. Run scaffold, build, typecheck, workspace tests, npm audit, workflow lint, and publication dry-run checks.

## Risks and invariants

- ANSI removal must remain compatible with existing JSON and SARIF output and must not become input-size dependent in superlinear time.
- File reads must reject missing files, non-files, oversized files, symbolic links, and path replacement races without reading an untrusted target.
- CI output must not include source snippets, finding messages, or unbounded SARIF-controlled strings.
- The CodeQL job must retain least-privilege permissions and publication must continue to depend on it.

## Proof

- `node --test scripts/check-codeql-sarif.test.mjs scripts/workflow-security.test.mjs`
- Lane-focused Node tests for CLI, generator, and contracts
- CodeQL CLI 2.27.1 with `javascript-security-extended.qls`, verifying zero SARIF results
- `node scripts/check-scaffold.mjs`
- `npm run build && npm run typecheck && npm test`
- `npm audit --audit-level=low`
- `node scripts/publish-workspaces.mjs --dry-run`
- `actionlint .github/workflows/ci.yml`
