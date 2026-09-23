# Intent: block npm publication on any known dependency vulnerability

Author: CI coordinator. Status: accepted through the human request to verify every package before publication.

## Problem

The current workspace audit reports zero vulnerabilities at every severity, but the release workflow uses `npm audit --audit-level=high`. A future low or moderate advisory could therefore leave the quality job green and allow the dependent publish job to run.

## Proposed outcome

Require the committed dependency graph to have no npm advisory at any severity before publication. Record separate evidence for the complete workspace graph, production-only graph, dependency signatures, candidate package contents and isolated installation of all eight tarballs.

## Constraints and scope

Keep publication main-only and dependent on both quality jobs. Do not claim that an npm advisory scan proves the absence of unknown defects or vulnerabilities in first-party code. Do not add third-party scanners, dependencies, permissions or secret access.

## Open questions

The security gate and candidate evidence remain unverified on GitHub until the branch is reviewed, merged and the main workflow succeeds.
