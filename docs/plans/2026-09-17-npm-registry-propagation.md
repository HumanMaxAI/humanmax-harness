# Plan: retry npm registry verification

Intent: [tolerate npm registry propagation](2026-09-17-npm-registry-propagation-intent.md).

## Files and order

1. Add a regression test in `scripts/publish-workspaces.test.mjs` that simulates a successful publish followed by temporary E404 responses, plus a bounded failure case.
2. Update `scripts/publish-workspaces.mjs` to retry only post-publish E404 verification with injectable waiting for fast deterministic tests. Keep preflight lookups fail-closed.
3. Record the behavior in `docs/agents/2026-09-02-npm-publish-ci.md` and `CHANGELOG.md`.

## Risks and boundaries

The retry must not convert authentication, permission, network or malformed responses into success. It must have a fixed upper bound, must not republish during retries, and must not report success before exact-version verification. Publication remains ordered and idempotent. No secret value may enter diagnostics.

## Proof

Run the focused publisher tests, scaffold check, workspace tests and typecheck. Run the publisher dry-run against the public registry. Review the diff for bounded retry behavior, one publish call per absent package and unchanged fail-closed preflight behavior. After merge, verify the main workflow and exact public npm versions.
