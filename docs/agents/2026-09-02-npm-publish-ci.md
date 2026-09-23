# npm publish from CI

**Date:** 2026-09-02

Harness publishes Preview packages from GitHub Actions on `main` only. The `publish` job runs after `workspace` (test, typecheck, `npm audit --audit-level=high`) and `generated-project`. A pull request never publishes.

## Environment secret

Set `NPM_TOKEN` on `HumanMaxAI/humanmax-harness` under Settings → Environments → **prod** → Environment secrets. The `publish` job references `environment: prod` so GitHub supplies that environment's secret after any configured environment protections pass. The quality jobs do not reference this environment.

The token must be an npm **granular access token** with:

- Read and write
- Bypass 2FA
- Packages: `@humanmax/*`, `humanmax`, `create-humanmax-agent`

CI maps it to `NODE_AUTH_TOKEN`. A missing token fails the publish job with a configuration error; a green workflow must not silently skip publication for missing credentials. Do not put the token in the repository, in `.env` that gets committed, or in workflow logs.

Changes to the workflow take effect on a new main run after merge. Re-running a run from an older commit still uses that commit's workflow and does not pick up the environment binding.

## Idempotence

`scripts/publish-workspaces.mjs` skips a package when that exact version already exists on the registry, so a green `main` rebuild does not fail.

Preview the release without publishing or requiring a token:

```sh
node scripts/publish-workspaces.mjs --dry-run
```

The script unwraps npm's workspace-name/version map, resolves all registry lookups before publishing, treats only E404 as absent, and verifies the resulting registry version after publication. Authentication and network failures stop the release. The workflow checks secret availability in a step; secrets are not supported in its job-level condition.

The npm registry may briefly return E404 after accepting a publish. Post-publish exact-version verification retries that absence for up to three minutes without publishing the package again. Other lookup errors remain immediate failures. If the version is still absent after the bounded wait, the release stops and reports the publish exit status plus the verification window. The three-minute bound covers the observed CLI 0.1.1 propagation, which completed just after the former two-minute window expired.

As of 2026-09-23, the four library packages have public `0.1.0` versions, and `@humanmax/project-generator` plus `@humanmax/cli` have public `0.1.1` versions. `create-humanmax-agent` and `humanmax` still return E404 because the CLI verification timeout stopped their publication. The generated-project candidate verification is documented in the [release candidate verification](../reviews/2026-09-13-npm-release-candidate.md); public verification of the remaining entry packages still depends on a successful main workflow.

## Not done by this workflow

Generator 0.1.1 now defaults to fixed npm versions. The generated-project job verifies the candidate tarballs through a temporary registry before the publish job, including direct runtime installation and project independence. See the [dependency repair verification](../reviews/2026-09-15-npm-dependency-verification.md). Public npm verification of newly published versions still follows the actual release; a successful candidate test does not mean publication happened.
