# Intent: tolerate npm registry propagation

Author: CI coordinator. Status: accepted through the ongoing human request to complete npm publication and the supplied failing workflow output.

## Problem

The publish command returned exit code 0 for `@humanmax/project-generator@0.1.1`, but the immediately following registry lookup returned E404. The workflow stopped before publishing the CLI. The public registry later exposed project-generator 0.1.1, proving the write succeeded and its metadata was temporarily unavailable.

## Proposed outcome

Publication waits for a bounded period when an exact newly published version still returns E404. It continues as soon as the version is visible and fails with a useful diagnostic if the version never appears.

## Constraints and scope

Keep the pre-publication registry checks strict and preserve the existing package order and idempotence. Retry only the post-publication absence expected during propagation; authentication, network and malformed registry responses still fail immediately. Do not change package versions, package contents, release permissions or Preview scope.

## Open questions

The actual CLI release remains unverified until the fix reaches `main`, its publish job succeeds, and the public registry exposes the expected versions.
