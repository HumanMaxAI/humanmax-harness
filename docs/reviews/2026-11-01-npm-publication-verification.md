# npm publication verification review

## Finding

Run [41190639045](https://github.com/HumanMaxAI/humanmax-harness/actions/runs/41190639045) failed after npm publish returned exit 0 for project-generator 0.2.1. Verification began by 09:57:09 UTC on October 31. The public registry records the version timestamp as 10:00:16.371 UTC. The script allowed only 180 seconds of scheduled waits.

The public package metadata response had Cache-Control: public, max-age=300. npm 11.19.0 view already uses preferOnline. The specific cache or validation stage that delayed the runner is UNKNOWN. The observed delay exceeded the script's waiting window. This is sufficient to explain the timeout without an authentication failure.

The generator version is now public. The bootstrap version returned 404 during this review. The release is partial.

## Change

1. Query the exact public version resource with no credentials. Request cache revalidation. Bound each request to 15 seconds.
2. Verify both package name and version. Treat only HTTP 404 as absence. Stop on other HTTP errors, network errors, and invalid data.
3. Allow 121 checks with 120 scheduled waits of 5 seconds. Total scheduled waiting time is 600 seconds. Requests add elapsed time. An HTTP failure stops the process immediately.
4. Keep preflight checks before all publication writes. Skip versions that are already public. Never republish while waiting.
5. Preserve bounded, redacted npm output when the command succeeds but public verification times out.

This change does not guarantee that npm completes publication within the waiting window. It does not change package versions, permissions, or generated project behavior.

## Evidence

The tests first failed because the exact-version helper did not exist and the old retry bound did not cover the regression scenario.

```text
node --test scripts/publish-workspaces.test.mjs
tests 12; pass 12; fail 0; skipped 0

npm test
exit 0; tests 167; fail 0; skipped 0

npm run typecheck
exit 0

npm run build
exit 0

node scripts/check-scaffold.mjs
scaffold ok (26 required paths)

git diff --check
exit 0
```

The full workspace run included the first 10 publisher tests. The final focused run also covered two added tests: async preflight failure before any write, and redacted diagnostics after a successful but invisible publication. All other test files were unchanged after the full run.

The public generator tarball downloaded successfully. Its 22,007 bytes matched the SHA-512 integrity field in the exact-version metadata.

Public dry-run output:

```text
skip @humanmax/contracts@0.2.0 (already on the registry)
skip @humanmax/findings@0.2.0 (already on the registry)
skip @humanmax/core@0.2.0 (already on the registry)
skip @humanmax/runtime-harness@0.2.0 (already on the registry)
skip @humanmax/project-generator@0.2.1 (already on the registry)
skip @humanmax/cli@0.2.0 (already on the registry)
would publish create-humanmax-agent@0.2.1
skip humanmax@0.2.0 (already on the registry)
```

Independent review by the release_review agent found no actionable defects. It ran all 12 publisher tests and additional async ordering probes. This is agent review evidence. Human merge approval remains required under docs/agents/pr-review.md.

Sources: [npm CLI 11.19.0 view implementation](https://github.com/npm/cli/blob/v11.19.0/lib/commands/view.js), [npm registry API](https://api-docs.npmjs.com/), and [public exact-version metadata](https://registry.npmjs.org/@humanmax%2Fproject-generator/0.2.1).
