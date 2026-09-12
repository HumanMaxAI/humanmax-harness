# npm publish from CI

**Date:** 2026-09-02

Harness publishes Preview packages from GitHub Actions on `main` only. The `publish` job runs after `workspace` (test, typecheck, `npm audit --audit-level=high`) and `generated-project`. A pull request never publishes.

## Repository secret

Set `NPM_TOKEN` on `HumanMaxAI/humanmax-harness` (Settings → Secrets and variables → Actions).

The token must be an npm **granular access token** with:

- Read and write
- Bypass 2FA
- Packages: `@humanmax/*`, `humanmax`, `create-humanmax-agent`

CI maps it to `NODE_AUTH_TOKEN`. Do not put the token in the repository, in `.env` that gets committed, or in workflow logs.

## Idempotence

`scripts/publish-workspaces.mjs` skips a package when that exact version already exists on the registry, so a green `main` rebuild does not fail.

Preview the release without publishing or requiring a token:

```sh
node scripts/publish-workspaces.mjs --dry-run
```

The script unwraps npm's workspace-name/version map, resolves all registry lookups before publishing, treats only E404 as absent, and verifies the resulting registry version after publication. Authentication and network failures stop the release. The workflow checks secret availability in a step; secrets are not supported in its job-level condition.

As of 2026-09-13, the six scoped packages have public `0.1.0` versions. This is not evidence that the generated-project distribution works: see the [release candidate verification](../reviews/2026-09-13-npm-release-candidate.md). `create-humanmax-agent` and `humanmax` return E404, and the prepared CLI version is `0.1.1`. Do not treat a dry-run plan as permission to publish the remaining scaffold packages before their acceptance gaps are resolved.

## Not done by this workflow

Switching generated projects from local `file:` dependencies to `^0.1.0` stays a separate change, after a public install of `@humanmax/cli` is confirmed.
