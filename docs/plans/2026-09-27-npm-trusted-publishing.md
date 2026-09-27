# Plan: npm Trusted Publishing

Intent: [migrate npm publication to GitHub OIDC](2026-09-27-npm-trusted-publishing-intent.md).

## Files and order

1. Update `scripts/workflow-security.test.mjs` first so it requires `id-token: write`, a supported pinned npm version, no package-manager cache in the release job, and no long-lived npm credential references.
2. Update `.github/workflows/ci.yml` to grant the publish job OIDC permission, install npm 11.19.0 without lifecycle scripts, remove the secret preflight and publish without token environment variables.
3. Rewrite `docs/agents/2026-09-02-npm-publish-ci.md` around package-side Trusted Publisher setup, the one-time bootstrap prerequisite, exact identity fields, verification and token revocation.
4. Normalize `packages/humanmax/package.json` to the registry manifest after bootstrap publication exposes npm's path correction; preserve the same executable mapping.
5. Append the behavior and security change to `CHANGELOG.md`.

## External configuration

Configure each existing npm package with GitHub Actions as Trusted Publisher using:

- Organization or user: `HumanMaxAI`
- Repository: `humanmax-harness`
- Workflow filename: `ci.yml`
- Environment: `prod`
- Allowed action: direct `npm publish`

The two unpublished unscoped packages require one successful bootstrap publication before the same record can be added. Do not merge the final workflow until all eight records exist.

## Proof

Show the workflow security test failing before the workflow edit and passing after it. Run script tests, workflow parsing, full workspace tests, typecheck, build, scaffold verification and `npm audit --audit-level=low`. Review the diff for secret references and confirm the publish job alone has `id-token: write`.
