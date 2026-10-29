# Plan: gate publication on CodeQL SAST

Intent: [add free GitHub CodeQL SAST before npm publication](2026-09-23-codeql-sast-intent.md).

## Files and order

1. Add tests for a small SARIF gate that accepts zero results and rejects alerts or malformed/missing reports.
2. Add `scripts/check-codeql-sarif.mjs` to enforce the local result gate without interpreting result severity as a pass.
3. Add a least-privilege CodeQL job to `.github/workflows/ci.yml` using `javascript-typescript`, `build-mode: none`, `security-extended`, and CodeQL Action v4. Make publish depend on it.
4. Extend workflow regression tests, the npm publication operating note, security review and changelog.

## Risks and boundaries

CodeQL alerts may block publication until reviewed and fixed; that is intended. The checker must fail closed when reports are missing or malformed. Pull requests from forks may have restricted upload permissions under GitHub's token model. Default and Advanced CodeQL setup cannot upload duplicate CodeQL results simultaneously.

## Proof

Show SARIF and workflow tests failing before implementation, then passing. Run the complete workspace build/tests/typecheck, npm audit at low severity, workflow YAML validation and publication dry-run. The authoritative SAST proof is the first successful GitHub CodeQL job and its uploaded alert set.

References: [CodeQL advanced setup](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configuring-advanced-setup-for-code-scanning), [supported languages](https://docs.github.com/en/code-security/concepts/code-scanning/codeql/codeql-code-scanning), and [merge protection](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/manage-your-configuration/set-merge-protection).
