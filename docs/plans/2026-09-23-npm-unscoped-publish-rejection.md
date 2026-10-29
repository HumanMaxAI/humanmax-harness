# Plan: diagnose unscoped npm publication

Intent: [expose and resolve unscoped npm publish rejection](2026-09-23-npm-unscoped-publish-rejection-intent.md).

## Files and order

1. Add publisher tests proving a nonzero npm publish includes useful registry stderr, redacts token-shaped values and truncates excessive output.
2. Update `scripts/publish-workspaces.mjs` to attach the sanitized bounded diagnostic only to failed publish errors.
3. Update `docs/agents/2026-09-02-npm-publish-ci.md`, the dated security review and `CHANGELOG.md` with the unscoped first-publish token requirement and observed failure.

## Risks and boundaries

Subprocess output is untrusted and may contain credentials or excessive data. Redaction must occur before truncation so a secret split by the retained boundary cannot leak. Successful publish output and registry polling behavior remain unchanged.

## Proof

Show the diagnostic regression failing first, then passing with visible error context and hidden credentials. Re-run publisher and workflow tests, complete workspace tests/typecheck/build/audit, candidate dry-run and diff review. The actual cause and publication remain unverified until the human updates the environment token, merges the fix and the main workflow runs again.
