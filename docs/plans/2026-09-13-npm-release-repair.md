# Plan — prepare the authorized npm release

The human requested npm publishing and restored npm login. The CLI/docs writer also claims the free CI lane and coordinates root release scripts/configuration. Generator, Core and contracts remain occupied and will not be edited.

1. Repair `.github/workflows/ci.yml`: preserve test, build, audit, typecheck and generated-project gates; move secret availability checks from the unsupported job condition to step-level environment checks. Preserve main-only publication.
2. Repair `scripts/publish-workspaces.mjs`: correctly unwrap npm workspace version output, skip only verified existing versions, fail on authentication/network errors rather than treating them as absent, and support a read-only release preview. Add meaningful stubbed-registry tests in `scripts/publish-workspaces.test.mjs`; include them through the root test script.
3. Prepare `@humanmax/cli@0.1.1` and its lock entry for the previously verified defect fixes. These correct invalid argument acceptance, boundary handling and false PASS outcomes; consumers must implement legacy evals. Do not bump or republish unchanged claimed packages.
4. Build and pack the CLI; install its tarball in an isolated consumer using actual npm registry dependencies. Exercise help/version and generated-project operations, recording any distribution defects without suppressing them. Verify workspace tests/typecheck, audit, workflow syntax, and release preview.
5. Commit and push reviewable changes with attribution. Publish through the repository's main-only pipeline after human review/merge; do not self-approve or bypass that rule. If an occupied-lane distribution issue prevents a working install, retain its evidence and request only the required explicit takeover.

No production enforcement, public certification claim, generator rewrite, tag overwrite, unpublished version overwrite, npm credential disclosure, or new service is authorized by this plan.

Reference: GitHub documents that secrets cannot be used directly in `if` expressions and should be exposed through environment variables for step conditions: https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets . npm version immutability: https://docs.npmjs.com/cli/commands/npm-publish/ .
