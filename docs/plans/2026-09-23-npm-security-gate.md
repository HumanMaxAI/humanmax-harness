# Plan: strengthen the npm release security gate

Intent: [block npm publication on any known dependency vulnerability](2026-09-23-npm-security-gate-intent.md).

## Files and order

1. Add a workflow regression test under `scripts/` proving the release prerequisite runs `npm audit --audit-level=low` and the publish job still depends on both quality jobs.
2. Change `.github/workflows/ci.yml` to fail on npm advisories at low severity or above.
3. Update the npm publication operating note and changelog.
4. Record the dated security verification in `docs/reviews/`, including the limits of the evidence.

## Risks and boundaries

The stricter gate may block publication for low-severity advisories; that is the intended fail-closed behavior. The change must not expose the npm token, run package installation scripts, alter published package contents or imply that automated scanning can guarantee the absence of unknown vulnerabilities.

## Proof

Show the new workflow test failing against the high-severity threshold and passing after the edit. Run workflow syntax validation, the full workspace build/tests/typecheck, complete and production-only npm audits, registry signature verification, candidate pack inspection, secret/install-script scans and an isolated install of all eight tarballs with scripts disabled.
