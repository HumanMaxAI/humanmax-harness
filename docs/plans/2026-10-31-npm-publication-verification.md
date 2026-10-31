# npm publication verification plan

1. Commit this plan before implementation.
2. Add regression tests in scripts/publish-workspaces.test.mjs. Cover exact-version lookup, mismatched identity, HTTP errors, delayed visibility beyond 180 seconds, and bounded failure.
3. Update scripts/publish-workspaces.mjs. Query the exact-version public registry resource without credentials. Request cache revalidation and bound each request. Allow 600 seconds of scheduled waits. Keep non-404 responses and invalid data as failures. Never republish during verification.
4. Preserve publish output redaction. Include bounded diagnostics when a successful command has no verified public result.
5. Update CHANGELOG.md and record verification in docs/reviews/2026-10-31-npm-publication-verification.md.
6. Run script tests, workspace tests, typecheck, scaffold, and public dry-run verification. Request independent review. Push a review branch through HumanMaxAI SSH.

Risk: registry requests can add time beyond scheduled waits. Each request must have a timeout. A public lookup failure must not authorize another publish. Package source, generated workflows, permissions, and release versions remain outside this change.

Sources: npm CLI 11.19.0 lib/commands/view.js; https://api-docs.npmjs.com/; run 41190639045; public npm metadata inspected on 2026-10-31.
