# Intent: cover observed npm registry propagation

Author: CI coordinator. Status: accepted through the ongoing human request to complete npm publication and the supplied failing workflow output.

## Problem

The main publish job waited 120 seconds after npm accepted `@humanmax/cli@0.1.1`, then failed about 0.2 seconds before the registry exposed that exact version. The package is public, but the false failure stopped the ordered release before `create-humanmax-agent` and `humanmax` were attempted.

## Proposed outcome

Keep exact-version verification and extend its default bounded propagation window to three minutes. A rerun from the fixed main revision skips versions that are already public and proceeds to the two remaining entry packages.

## Constraints and scope

Do not republish existing versions, weaken preflight failures, change package contents or versions, or publish outside the main-only workflow. Authentication, permission, network and malformed registry responses remain immediate failures.

## Open questions

The remaining entry packages are unverified until this change reaches `main`, the publish job succeeds, and the public registry exposes their exact versions.
