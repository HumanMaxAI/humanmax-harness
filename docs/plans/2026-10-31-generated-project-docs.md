# Plan: Useful generated project documentation

Date: 2026-10-31. Coordinator: generator + docs + CLI verification lanes.
Intent: [Generated documentation](./2026-10-31-generated-project-docs-intent.md).

## Files

- `packages/project-generator/src/generate.ts`: clear starter README, project-named mergeable SECURITY.md, and documentation maintenance instructions in generated AGENTS.md.
- `packages/project-generator/src/generate.test.ts`, `src/tree-snapshot.test.ts`, and `src/upgrade.test.ts`: regression checks for generated documentation, reviewed snapshot changes, and no-write security-document upgrade preview.
- `packages/project-generator/README.md`, `templates/tool-agent/README.md`: document the output and maintenance responsibilities.
- `packages/project-generator/package.json`, `packages/create-humanmax-agent/package.json`, and root `package-lock.json`: prepare 0.2.1 patch candidates; coordinate the shared lockfile update through npm. Existing runtime/CLI pins remain 0.2.0.
- `packages/cli/verification/distribution.mjs`: verify README and SECURITY.md from packed bootstrap generation.
- `CHANGELOG.md` and a dated review under `docs/reviews/`: record fixes and verification.
- `/Users/onesg/Github/HumanMaxAI/playground/sanguo-yanyi/README.md`, `SECURITY.md`, and `.humanmax/generator.lock`: repair only application documentation and its reviewed receipt entries. Keep generatorVersion 0.2.0, every other receipt entry, and all application/control files intact.

## Procedure

1. Commit this plan and intent before implementation.
2. Add semantic generation and upgrade-preview tests. Confirm that missing SECURITY.md and documentation maintenance instructions fail.
3. Implement deterministic starter documentation and prepare the patch versions. Regenerate the lockfile with npm.
4. Review byte-level snapshot changes. Update only hashes explained by the documented output changes. Preserve all assertions.
5. Prepare a before/after patch and backup for sanguo-yanyi. Apply project-specific README and SECURITY.md. Record only their reviewed digests in the generator receipt. Do not regenerate application files or reset unrelated receipt entries.
6. Run build, workspace tests, typecheck, audit, scaffold, and packed-distribution verification. Run the customer's build/typecheck/tests and pinned doctor/generate-check/test commands.
7. Independently review the changes. Record evidence and remaining Preview limits. Push the fix branch for review; do not claim publication before a main release and public verification.

## Proof and risks

- New generation must name the project, emit SECURITY.md as mergeable, track its digest, link it from README, and instruct agents to update docs when behavior changes.
- Security reporting contact remains explicitly unconfigured. The generator must not copy a Harness maintainer's address into a customer's policy.
- Upgrade preview must report the missing SECURITY.md without writing it or overwriting user documentation.
- All repository checks must exit 0. A new generated project must install from candidate tarballs, compile, and pass its own CLI checks.
- The project documentation patch must be reviewable before apply. SHA-256 comparisons must prove all pre-existing files other than README.md and generator.lock are unchanged.
- Recompute only the explicitly reviewed document digests. Do not suppress a finding, alter runtime policy, or rebaseline unrelated drift to obtain PASS.
- A deterministic starter does not automatically understand an application's future purpose. Its README must identify that limitation and the maintenance action.
