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

## Not done by this workflow

Switching generated projects from local `file:` dependencies to `^0.1.0` stays a separate change, after a public install of `@humanmax/cli` is confirmed.
