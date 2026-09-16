# npm dependency repair verification — 2026-09-15

Scope: [generator npm dependency plan](../plans/2026-09-14-generator-npm-dependencies.md). The user confirmed continuation following the generator takeover question. The old generator branch/worktree remains intact; Core and contracts were not edited.

## Outcome

The dependency failure recorded in the [previous candidate review](2026-09-13-npm-release-candidate.md) is fixed in the new candidate: default output contains exact public-package version requirements and a direct runtime dependency, with no file paths or checkout overrides. Repository tests opt into a library-only local dependency mode; the create CLI has one default published path.

Generated build/typecheck scripts and their compiler/type dependencies now work. The npm CLI script resolves the installed executable. The default eval actually runs the gateway fixture, and generator receipts match version 0.1.1. Added eval stubs still return UNKNOWN until implemented. Seven expected snapshot contents changed; generated paths and ownership classes are unchanged. The published-output snapshot now hashes every byte without normalizing checkout paths.

## Distribution proof

The proof serves exact packed candidates (generator 0.1.1, CLI 0.1.1, bootstrap 0.1.0 and wrapper 0.1.0) through a disposable loopback npm registry. Unchanged runtime/contracts/Core dependencies come from public npm. This is prepublication candidate verification, not evidence that the new versions already exist on public npm.

It installs the actual packed bootstrap/wrapper, checks wrapper version, generates an unmodified default project, removes the bootstrap directory, installs dependencies and reinstalls from the npm lock. It checks `npm ls --all`, refuses symlinked harness installations in the proof, relocates the project and runs build/typecheck/start, compiled JavaScript, npm tests, the default eval, doctor/dev/check/generate/upgrade-preview and add-tool operations. Adding an unimplemented eval exits 1 with UNKNOWN as required.

```text
npm run build: exit=0
npm test: 150 tests, 150 pass, 0 fail; exit=0
npm test on Node 22.23.2: 150 tests, 150 pass, 0 fail; exit=0
npm run typecheck: exit=0
npm audit --audit-level=high: 0 vulnerabilities; exit=0
actionlint v1.7.12: exit=0
distribution proof on Node 26: PASS; exit=0
distribution proof on Node 22: PASS; exit=0
offline check and generate --check: PASS with OS network deny; exit=0
network controls: allowed=0, denied=13 (EPERM/EACCES)
```

The final Node 22 distribution tarballs and local logs are retained outside git at `/var/folders/rk/1yq9fg7n0l3459k1j2t63qy40000gn/T/humanmax-distribution-tWzQuI/`. The earlier Node 22 run is retained at `/var/folders/rk/1yq9fg7n0l3459k1j2t63qy40000gn/T/humanmax-distribution-bU3rJj/`.

Read-only registry preflight exits 0 and proposes generator/CLI 0.1.1 plus the first bootstrap/wrapper 0.1.0 releases; it skips the four unchanged published packages. No registry errors are treated as successful publication.

## Remaining release work and limits

An independent read-only agent reviewed behaviour, repository constraints and the distribution proof and found no reproducible important issue. It also confirmed the unpublished bootstrap/wrapper versions return E404. It did not repeat the execution tests and does not provide human merge approval.

No npm candidate was published by this verification. The branch must still receive human review/merge and run the main-only publishing workflow. Creating its PR through the available GitHub connector returned 403; the SSH remote can accept the branch, but that does not grant the connector permission to create a PR or inspect Actions secrets. Local npm login is separate from the CI NPM_TOKEN.

This closes dependency/build/default-eval gates. It does not close Core user-owned-file digest semantics, full upgrade/add-artifact coverage, runtime schema resolution or broader generated-tree/Skill-discovery findings. Automatic generated workflow triggers remain disabled. Full product conformance and production enforcement are not claimed.
