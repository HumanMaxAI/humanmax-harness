# Intent: migrate npm publication to GitHub OIDC

Author: CI coordinator. Status: accepted by the human instruction to implement npm Trusted Publishing.

## Problem

The main-only release job authenticates with a long-lived `NPM_TOKEN`. The token has already blocked the initial unscoped packages because its registry permissions do not cover package creation. Keeping a broad, bypass-2FA token in GitHub after bootstrap also leaves a reusable credential available to the workflow.

## Proposed outcome

Bind every published package to the `HumanMaxAI/humanmax-harness` GitHub Actions workflow and its `prod` environment. The release job uses GitHub OIDC, a pinned npm CLI with Trusted Publishing support, and no npm write secret. Existing test, build, audit, generated-project and CodeQL gates remain mandatory.

## Security boundaries

- GitHub may mint an identity token only for the publish job; quality and CodeQL jobs keep their current permissions.
- npm accepts publication only when the repository, workflow filename, environment and package-side Trusted Publisher configuration match.
- The workflow must not retain a token fallback after migration, because fallback would preserve the reusable credential risk.
- `create-humanmax-agent` and `humanmax` must exist before their Trusted Publisher records can be created. Their one-time bootstrap publication is an external prerequisite, not a workflow bypass.
- Direct `npm publish` remains the approved release behavior. Staged publishing and a manual approval protocol are outside this migration.

## Completion condition

All eight npm packages have package-side Trusted Publisher records for organization `HumanMaxAI`, repository `humanmax-harness`, workflow `ci.yml`, environment `prod`, with direct publish allowed. The workflow contains no `NPM_TOKEN` or `NODE_AUTH_TOKEN` reference, and its structural tests, workspace verification and dependency audit pass.
