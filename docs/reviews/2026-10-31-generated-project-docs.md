# Generated project documentation repair verification

Date: 2026-10-31.
Plan: [Documentation repair](../plans/2026-10-31-generated-project-docs.md).

## Findings and repair

The published 0.2.0 starter named its README correctly but did not generate SECURITY.md. The README remained a generic fixture description after the reported application was developed. Generated agent instructions did not require documentation maintenance.

Generator and bootstrap 0.2.1 candidates now emit a project-named, mergeable SECURITY.md. The reporting channel remains explicitly unconfigured. README distinguishes the fixture entry point from an application server and gives maintenance actions. Generated AGENTS.md requires README and SECURITY updates with relevant behavior changes. Deterministic generation does not infer future application features or automatically synchronize docs.

## Repository verification

| Check | Result | Exit |
|---|---|---|
| Regression tests before implementation | Missing security documentation and missing upgrade preview reproduced | 1, expected |
| `npm run build` | All buildable packages compiled | 0 |
| `npm test` | 165 passed; 0 failed; 0 skipped | 0 |
| `npm run typecheck` | All typed packages passed | 0 |
| `npm audit --audit-level=low` | 0 vulnerabilities | 0 |
| `node scripts/check-scaffold.mjs` | `scaffold ok (26 required paths)` | 0 |
| `node packages/cli/verification/distribution.mjs` | Packed bootstrap emitted named README and SECURITY.md, tracked the security document, and passed independent installation/relocation/CLI verification | 0 |
| `node scripts/publish-workspaces.mjs --dry-run` | Generator and bootstrap 0.2.1 would publish; six unchanged 0.2.0 packages skipped | 0 |
| `git diff --check` | No whitespace errors | 0 |

Snapshot review found one added path: SECURITY.md, class mergeable. Changes to existing digests are limited to README.md, AGENTS.md, the generator version in project.yaml, and generator.lock. Other paths, classes, digests, pack content, runtime source, and result states remain unchanged.

## Reported project verification

The local sanguo-yanyi README now documents its observed interactive chronicle, actual server command, fixture command, tools, and limitations. SECURITY.md documents its local server and gateway boundaries, request limits, external font requests, and unconfigured reporting channel. AGENTS.md now requires documentation maintenance.

A before/after patch and original document/receipt backups were saved locally before apply. Only README and AGENTS receipt entries were updated, and a mergeable SECURITY.md entry was added. The recorded generatorVersion remains 0.2.0. All 30 unrelated pre-existing files and unrelated receipt entries remain identical. No application source or canonical control declaration was rewritten.

| Project command | Result | Exit |
|---|---|---|
| `npm run build` | Compiled | 0 |
| `npm run typecheck` | Types passed | 0 |
| `npm test` | 10 passed; 0 failed; 0 skipped | 0 |
| Project-pinned `humanmax doctor --format json` | 6 PASS; 0 FAIL; 0 UNKNOWN | 0 |
| Project-pinned `humanmax generate --check --format json` | 6 PASS; 0 FAIL; 0 UNKNOWN | 0 |
| Project-pinned `humanmax test --format json` | 2 PASS; 0 FAIL; 0 UNKNOWN | 0 |
| Project-pinned `humanmax check --format json` | 6 PASS; 0 FAIL; 0 UNKNOWN | 0 |

## Review and limits

An independent read-only review found no blocking issue. It separately checked the document receipt changes, all 30 unrelated customer files, snapshots, version consistency, and diff hygiene. It did not submit human approval.

The repaired local project is verified. The generator patch is a release candidate until main CI publishes 0.2.1 and public npm is verified. Existing installed projects do not receive automatic document replacements. Full upgrade apply remains outside Preview. These documents and checks do not establish production enforcement, a complete security review, or certification.
