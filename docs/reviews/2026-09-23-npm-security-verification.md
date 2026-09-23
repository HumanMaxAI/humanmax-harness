# npm release security verification — 2026-09-23

Scope: all eight npm workspace package candidates and the main-only publication gate. No package was published by this verification.

## Verdict

READY for human review and the existing main-only release process. The committed dependency graph has no npm advisory at any severity as of this review. The candidate archives contain only declared package files, have no install-time lifecycle script, and installed together successfully with scripts disabled.

This evidence does not prove that first-party code has no unknown vulnerability. npm audit reports known dependency advisories, and static inspection cannot establish the absence of every defect. The release gate therefore states the narrower property it can enforce: zero known npm advisories at publication time.

## Dependency and supply-chain evidence

```text
npm audit --json:
  info=0 low=0 moderate=0 high=0 critical=0 total=0
npm audit --omit=dev --json:
  info=0 low=0 moderate=0 high=0 critical=0 total=0
npm audit signatures:
  3 external packages have verified registry signatures
third-party runtime dependencies:
  none; public package runtime dependencies point only to @humanmax packages
install-time lifecycle scripts in workspace packages:
  none
```

The external packages in the root lock are development-only: `@types/node@22.20.1`, `typescript@5.9.3`, and `undici-types@6.21.0`. None declares an install script in the lock.

## Candidate archive evidence

`npm pack --dry-run --json --workspaces` produced manifests for all eight candidates. Entries were limited to each package's declared `dist`, schemas, declarative base pack, README, package metadata, and the `humanmax` wrapper. No `.env`, credential, private-key, test fixture, repository claim, or unrelated workspace file was included.

Secret-shaped token and private-key scans returned no match in tracked source or built output. Built output contained no absolute developer or GitHub runner path. The static dynamic-execution scan found no `eval`, `Function` constructor, Node VM execution, or shell command construction. CLI child processes use fixed executables and argument arrays; local eval execution is path-checked and bounded by file, count, time, and output limits.

All eight tarballs were installed together into an isolated consumer with `--ignore-scripts`. The consumer production audit reported zero vulnerabilities, `humanmax --version` returned `0.1.1`, and `create-humanmax-agent --help` completed successfully.

## Release gate

The workspace job now runs `npm audit --audit-level=low`. Its regression test also verifies that publication still depends on both the workspace and generated-project jobs. This blocks main publication for any npm advisory severity while preserving the existing generated-project distribution gate and `prod` environment secret boundary.

## Residual risk

The CLI intentionally executes project-owned tests and local eval files when the user invokes those commands. Those files are code belonging to the local project; they are not downloaded as executable Control Pack rules. Eval execution has explicit path, size, count, time and output bounds, while `npm test` remains the project's own command and therefore carries the same trust assumption as invoking it directly.

Advisory databases and signatures can change after release. Re-run the native audits on every release and keep automated dependency monitoring enabled. Human review and a successful main workflow remain required before publication.
