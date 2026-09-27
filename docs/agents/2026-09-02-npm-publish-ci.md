# npm publish from CI

**Date:** 2026-09-02

**Updated:** 2026-09-27

Harness publishes Preview packages from GitHub Actions on `main` only. The `publish` job runs after `workspace` (test, typecheck and `npm audit --audit-level=low`), `generated-project`, and `codeql`. A pull request never publishes.

The publish job authenticates to npm through Trusted Publishing with GitHub OIDC. It has `contents: read` and `id-token: write`, runs on a GitHub-hosted runner, and uses pinned npm 11.19.0. It does not read an npm write token. Quality and CodeQL jobs cannot mint an OIDC token and do not use the `prod` environment.

## One-time bootstrap prerequisite

npm requires a package to exist before a Trusted Publisher can be attached. The initial `create-humanmax-agent@0.1.0` and `humanmax@0.1.0` publications were completed on 2026-09-27 through an interactive npm session with 2FA. Both installed commands were then verified from a clean public-registry installation.

No future release should repeat the bootstrap path or copy a local npm credential into the repository, workflow, or GitHub environment.

## Package-side Trusted Publisher configuration

Configure each package at npmjs.com → Package → Settings → Trusted Publisher → GitHub Actions with these exact, case-sensitive values:

| Field | Value |
|---|---|
| Organization or user | `HumanMaxAI` |
| Repository | `humanmax-harness` |
| Workflow filename | `ci.yml` |
| Environment | `prod` |
| Allowed action | direct `npm publish` |

The record was created and read back from npm for all eight packages on 2026-09-27:

- `@humanmax/contracts`
- `@humanmax/findings`
- `@humanmax/core`
- `@humanmax/runtime-harness`
- `@humanmax/project-generator`
- `@humanmax/cli`
- `create-humanmax-agent`
- `humanmax`

The repository URL in every package manifest must continue to identify `https://github.com/HumanMaxAI/humanmax-harness`. npm validates the workflow identity only when a publish is attempted, so a saved configuration is not proof that the values match.

After the OIDC workflow is merged, delete the `prod` environment's `NPM_TOKEN`, revoke the npm token, and set package publishing access to require 2FA and disallow traditional tokens. This does not disable the configured Trusted Publisher.

## Release behavior

`scripts/publish-workspaces.mjs` skips a package when that exact version already exists on the registry, so a green `main` rebuild does not fail. Preview a release without publishing or OIDC:

```sh
node scripts/publish-workspaces.mjs --dry-run
```

The script resolves registry state before publishing, treats only E404 as absent, and verifies the exact version after publication. Authentication and network failures stop the release. Registry propagation is retried for up to three minutes without publishing the same version again. Other lookup errors fail immediately.

Trusted Publishing requires npm 11.5.1 or later and Node 22.14.0 or later. The workflow keeps Node 22 and installs exact npm 11.19.0 without lifecycle scripts before dependency installation. OIDC publication from this public repository automatically creates npm provenance attestations.

Changes to the workflow take effect only on a new `main` run after merge. Re-running an older run uses that commit's workflow.

## Verification

Before merging the migration:

1. Confirm `npm view create-humanmax-agent version` and `npm view humanmax version` both return `0.1.0`.
2. Run `npm trust list <package> --json` for all eight packages and confirm the exact Trusted Publisher identity above.
3. Confirm `.github/workflows/ci.yml` contains no `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or `secrets.*` reference in the publish job.
4. Run `node --test scripts/workflow-security.test.mjs`, full workspace tests, typecheck, build, scaffold verification and `npm audit --audit-level=low`.
5. Merge and verify that the new `main` publish job succeeds without the environment secret.

Generator 0.1.1 defaults to fixed npm versions. The generated-project job verifies candidate tarballs through a temporary registry before publication, including direct runtime installation and project independence. See the [release candidate verification](../reviews/2026-09-13-npm-release-candidate.md).
