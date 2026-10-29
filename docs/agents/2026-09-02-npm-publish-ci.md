# npm publish from CI

**Date:** 2026-09-02

Harness publishes Preview packages from GitHub Actions on `main` only. The `publish` job runs after `workspace` and `generated-project`. The `workspace` job runs tests, typecheck, and `npm audit --audit-level=high`. A pull request never publishes.

## Environment secret

1. Open `HumanMaxAI/humanmax-harness` in GitHub.
2. Go to Settings → Environments → **prod** → Environment secrets.
3. Set `NPM_TOKEN` with the token permissions listed below.
4. Confirm that the `publish` job references `environment: prod`. GitHub supplies the secret after any configured environment protections pass.

The quality jobs do not reference this environment.

The token must be an npm **granular access token** with:

- Read and write
- Bypass 2FA
- Packages: `@humanmax/*`, `humanmax`, `create-humanmax-agent`

CI maps `NPM_TOKEN` to `NODE_AUTH_TOKEN`. If the token is missing, the publish job fails with a configuration error. A successful workflow must not silently skip publication because credentials are missing. Do not put the token in the repository, a committed `.env` file, or workflow logs.

Workflow changes take effect on a new `main` run after merge. If you repeat a run from an older commit, GitHub uses that commit's workflow. That run does not receive the new environment binding.

## Idempotence

`scripts/publish-workspaces.mjs` skips a package if the registry already contains that exact version. An otherwise successful `main` rebuild does not fail because the version already exists.

1. Run the command below to preview the release. The command does not publish packages or require a token.
2. Inspect the planned versions and registry results. A successful preview does not prove publication.

```sh
node scripts/publish-workspaces.mjs --dry-run
```

The script unwraps npm's workspace-name/version map. It resolves all registry lookups before publication. Only E404 means that a version is absent. After publication, the script verifies the resulting registry version. Authentication and network failures stop the release.

The workflow checks secret availability in a step. Secrets are not supported in its job-level condition.

The npm registry may briefly return E404 after it accepts a publish. If post-publish exact-version verification returns E404, verification retries for up to two minutes. The script does not publish the package again. Other lookup errors fail immediately. If the version remains absent after that wait, the release stops. It reports the publish exit status and the verification window.

Historical facts as of 2026-09-13: the six scoped packages had public `0.1.0` versions. This did not prove that generated-project distribution worked. See the [release candidate verification](../reviews/2026-09-13-npm-release-candidate.md). At that date, `create-humanmax-agent` and `humanmax` returned E404. The prepared CLI version was `0.1.1`.

Do not treat a dry-run plan as permission to publish the remaining scaffold packages before their acceptance gaps are resolved.

## Not done by this workflow

Generator 0.1.1 defaults to fixed npm versions. Before publication, the generated-project job verifies candidate tarballs through a temporary registry. The job checks direct runtime installation and project independence. See the [dependency repair verification](../reviews/2026-09-15-npm-dependency-verification.md).

Verify newly published versions on public npm after the actual release. A successful candidate test does not prove that publication occurred.
