# Intent: Publish Preview 0.2.0 to npm

Date: 2026-10-30. Status: accepted by the human in this chat.

## Request

The human requested npm publication. The human explicitly authorized takeover of the lanes needed to update versions, verify the release, and publish.

## Observed problem

The latest main CI run succeeded but skipped all eight packages. Their current versions already exist on npm. Public npm packages require Node 22 or later. The current main branch requires Node 26 or later and has not published that change.

## Outcome

Prepare all eight Preview packages as 0.2.0. Synchronize internal dependencies and generated project pins. Verify packed candidates, publish through the existing main-only GitHub Actions Trusted Publisher, and verify public installation.

## Constraints

Preserve Preview scope, contracts, base pack versions and digests, the action gateway, and all four result states. Do not publish from a local token or bypass CI gates. Do not change unrelated active work. Preserve the Node 22 package line for existing users.

## Version decision

Use a new Preview minor version because the Node 26 requirement is incompatible with the 0.1.x line. Existing users who need Node 22 must remain on 0.1.x. No new runtime enforcement or certification claim is permitted.
