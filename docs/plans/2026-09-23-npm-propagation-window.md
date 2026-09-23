# Plan: extend npm propagation verification

Intent: [cover observed npm registry propagation](2026-09-23-npm-propagation-window-intent.md).

## Files and order

1. Add a regression case in `scripts/publish-workspaces.test.mjs` that exceeds the old 120-second-equivalent default and succeeds within the new default.
2. Increase the bounded default in `scripts/publish-workspaces.mjs` to three minutes without changing retry classification or publish ordering.
3. Record the observed boundary and new window in `docs/agents/2026-09-02-npm-publish-ci.md` and `CHANGELOG.md`.

## Risks and boundaries

The longer wait must apply only after npm returns success and the exact version remains absent. It must not hide credential, network or malformed response failures, and one absent package must still receive only one publish call.

## Proof

Demonstrate the new regression failing before the implementation edit and passing afterward. Run the complete workspace tests, typecheck, build, high-severity audit, scaffold check and public-registry dry-run. After merge, verify the main workflow and all intended public package versions.
