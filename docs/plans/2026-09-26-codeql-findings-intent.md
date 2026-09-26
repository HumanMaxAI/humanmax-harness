# Intent: remediate CodeQL release findings

Author: CI, CLI, generator, and contracts lanes. Status: accepted by the 2026-09-26 CI failure report.

## Problem

The main-branch release workflow is correctly blocking npm publication, but it reports only an alert count. CodeQL 2.27.1 `security-extended` currently reports five JavaScript/TypeScript findings, so the user cannot see the affected rules and locations from the failed job and the remaining unpublished packages cannot proceed.

## Proposed outcome

Remove the actionable findings without weakening the release gate. When a future SARIF report contains results, print a bounded rule-and-location summary before publication remains blocked.

## Affected users and systems

- Maintainers diagnosing the GitHub Actions release gate
- CLI users passing uncontrolled arguments or child-process output
- Generator and snapshot readers operating on project-controlled paths
- Contracts users parsing quoted YAML keys

## Constraints

- Preserve the fail-closed CodeQL gate and the Preview command surface.
- Keep reads within the existing project and pack boundaries; do not follow symbolic links.
- Do not expose source excerpts or secrets in CI diagnostics.
- Respect active lane claims. The contracts fix cannot start while `.agent-claims/contracts.json` is owned by another writer unless the claim is released or the human explicitly authorizes takeover.

## Out of scope

- Changing CodeQL query suites or suppressing findings solely to unblock publication
- Adding new generator or CLI features
- Publishing packages locally

## Open questions

None for the CI, CLI, and generator findings. Contracts implementation ownership remains governed by the active claim.
