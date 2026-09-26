# Intent: add free GitHub CodeQL SAST before npm publication

Author: CI coordinator. Status: accepted through the human request to use GitHub's free SAST.

## Problem

The public repository has dependency auditing and package-content verification but no checked-in CodeQL workflow. The available GitHub credential cannot read the repository's code-scanning settings, and no existing workflow runs first-party static analysis before publication.

## Proposed outcome

Run GitHub CodeQL on JavaScript/TypeScript and GitHub Actions for every pull request and main push. Use the `security-extended` query suite, upload results to GitHub code scanning, fail the job when SARIF contains an alert, and make publication depend on the SAST job.

## Constraints and scope

Grant only `contents: read` and `security-events: write` to the CodeQL job. Do not bind it to the `prod` environment or expose npm credentials. Use no build step for the interpreted-language database. If repository Default setup is already active, GitHub must be switched to Advanced setup before this checked-in workflow can upload results.

## Open questions

The initial CodeQL result is UNKNOWN until GitHub runs the workflow. The current CLI credential lacks permission to inspect Code Scanning configuration or alerts.
