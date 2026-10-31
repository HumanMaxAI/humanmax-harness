# npm publication verification intent

The user reports repeated release failures and long waits. Run 41190639045 returned success from npm publish for project-generator 0.2.1. The script stopped after 37 checks and 180 seconds of scheduled waits. The public registry now exposes that version. Its publication timestamp is 10:00:16 UTC. The runner entered verification by 09:57:09 UTC.

The metadata response currently has a 300-second cache lifetime. This supports delayed visibility as a cause. It does not establish which cache served the runner's requests. npm 11.19.0 view already requests preferOnline. Adding that flag alone cannot fix this failure.

Use the exact-version registry resource for public verification. Keep a bounded retry window and reject unverified results. Recover a partial release by skipping public versions. Do not change package versions or npm permissions.
