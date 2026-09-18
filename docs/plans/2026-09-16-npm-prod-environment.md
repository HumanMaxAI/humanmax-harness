# Plan: bind npm publication to prod

Intent: [npm publication environment](2026-09-16-npm-prod-environment-intent.md).

## Files and order

1. CI lane: add environment: prod to the publish job in .github/workflows/ci.yml. Replace the optional credential output/skip with a required-token guard that exits 1 and names the configuration to fix. Keep the main push condition and both prerequisite jobs.
2. Docs lane: update docs/agents/2026-09-02-npm-publish-ci.md for Settings → Environments → prod → Environment secrets and the missing-token failure behavior.
3. Add the CI fix to CHANGELOG.md with today's date.

## Risks and boundaries

Only the publish job receives prod secrets; PR quality jobs do not reference it. Existing environment approval and branch restrictions stay under GitHub control. Binding an environment makes its secrets available to that job as designed. Do not change permissions, package versions, publisher logic or generated artifacts. Re-running an old run uses its old workflow; verification requires the merged fix on main.

## Proof

Run actionlint on the workflow and the scaffold check. Execute the credential guard with an empty token (must fail) and a non-secret placeholder (must pass without printing its value). Review the diff for retained main-only gate, both quality dependencies, unchanged publication command and secret handling. Paste exit-bearing output before claiming the fix ready. Actual npm publication requires main workflow logs plus a public registry version check after merge.

Reference: https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments (environment secrets are available to jobs referencing that environment).
