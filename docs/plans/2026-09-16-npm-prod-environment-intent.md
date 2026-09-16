# Intent: npm publication environment

Author: CI coordinator. Status: accepted through the ongoing human request to publish npm and the clarification that NPM_TOKEN is an Environment secret.

## Problem

The human reports that the workflow completed but npm still exposes CLI 0.1.0. The latest publish job skipped because its NPM_TOKEN was empty. The human confirms the token is an Environment secret; GitHub lists the existing environment as prod.

## Proposed outcome

The main-only publish job references prod so GitHub supplies its environment secret. Missing credentials fail visibly instead of reporting a successful skipped release.

## Constraints and scope

Claim CI and docs lanes. Change only the workflow, publication operating note, dated plan and changelog. Keep all quality gates and environment protections. Never copy, display or move secret values. No package changes, direct local publishing or expansion of Preview.

## Open questions

Actual publication remains unverified until the human merges the change and the main workflow publishes successfully.
