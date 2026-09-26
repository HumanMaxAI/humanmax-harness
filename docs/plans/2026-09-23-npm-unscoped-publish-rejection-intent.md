# Intent: expose and resolve unscoped npm publish rejection

Author: CI coordinator. Status: accepted through the human-supplied failure from the merged main workflow.

## Problem

The publisher successfully identifies the six existing scoped versions, then `npm publish` exits 1 for the first new unscoped package, `create-humanmax-agent@0.1.0`. Registry verification confirms the version is absent, but the script discards npm stderr and reports only a generic failure. The same GitHub token previously published scoped packages, so access limited to the `@humanmax` scope is the leading cause.

## Proposed outcome

Failed publishes include a bounded, redacted npm diagnostic so the registry rejection is actionable without exposing credentials. The release guide explicitly requires initial unscoped-package access through a read/write token covering All Packages, plus the existing non-interactive 2FA requirement.

## Constraints and scope

Do not print authentication headers, token-shaped values or unbounded subprocess output. Do not publish locally, rename public packages, weaken registry verification, or bypass the main-only workflow. Treat token scope as a strong evidence-based diagnosis until a rerun exposes npm's exact response.

## Open questions

The exact npm rejection code remains UNKNOWN because the merged script discarded stderr. It will be resolved by the next main run after the diagnostic change and token-scope correction.
