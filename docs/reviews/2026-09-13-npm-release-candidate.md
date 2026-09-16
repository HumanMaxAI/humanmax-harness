# npm release candidate — 2026-09-13

Scope: [release repair plan](../plans/2026-09-13-npm-release-repair.md). Publication is authorized by the human; npm login now verifies as `humanmax`. No version was published in this verification.

## Prepared changes

- CLI candidate `0.1.1` contains the previously verified argument, boundary and eval defect fixes. The root lock records the same version. Legacy static eval objects now return UNKNOWN, so consumers must implement them.
- The workflow retains main-only publishing after both existing quality jobs. Secret presence is checked in a step instead of the invalid job-level expression.
- The publisher correctly unwraps `npm pkg get version -w` output. It preflights every package, distinguishes missing versions from registry/authentication failures, offers `--dry-run`, and verifies versions after publishing.

## Consumer verification

Packed `@humanmax/cli@0.1.1`, installed its tarball in an isolated consumer with real npm registry dependencies and without repository file links. The installed binary reports `0.1.1` and help successfully. A project created through the published generator installs but `dev` fails with `ERR_MODULE_NOT_FOUND` for `@humanmax/runtime-harness`: the generator still emits local file dependencies and the CLI's consumer tree does not contain that package. This is an unresolved generator distribution defect, not an npm login failure.

Control experiment: explicitly installing published `@humanmax/runtime-harness@0.1.0` into the consumer supplies the generated file link's target. The packed CLI then passes doctor, dev, add-tool preview/apply, deterministic check, generate-check and upgrade preview. Its `test` command exits 1 with UNKNOWN for the legacy eval, then exits 0 when that disposable eval actually checks `runFixture()`. The eval was restored afterwards. This verifies CLI compatibility in a project with its required dependency installed; it does not validate the unmodified bootstrap experience.

Local evidence and the tarball are under `/var/folders/rk/1yq9fg7n0l3459k1j2t63qy40000gn/T/humanmax-npm-release-b5rcmrae/`. Payload logs remain outside git.

## Verification output

```text
npm whoami: humanmax; exit=0
npm run build: exit=0
npm test: 149 tests, 149 pass, 0 fail; exit=0
npm test with Node 22: 149 tests, 149 pass, 0 fail; exit=0
npm run typecheck: exit=0
npm audit --audit-level=high: 0 vulnerabilities; exit=0
actionlint v1.7.12 (workflow syntax/expressions): exit=0
actionlint against the original workflow: exit=1, secrets context forbidden at job-level if
node scripts/publish-workspaces.mjs --dry-run: exit=0
  skip five unchanged scoped packages at 0.1.0
  would publish @humanmax/cli@0.1.1
  would publish create-humanmax-agent@0.1.0
  would publish humanmax@0.1.0
```

## Remaining gates

Full scaffold distribution acceptance is FAIL. Generator/Core issues documented in the earlier scaffold review remain open and their lanes remain occupied. The dry-run output is a publication plan, not acceptance evidence for those packages.

The current branch has not received human review/merge. Main-only CI publication remains the repository policy. The available GitHub CLI account has read-only repository permission and cannot inspect Actions secrets; the in-app GitHub session is signed out. npm login on this machine does not establish that GitHub Actions has an NPM_TOKEN. These are separate credentials and no token was copied or exposed.

Self-review covered the committed scope, state preservation, publication preflight and secret handling. This is not independent merge approval. Do not mark the whole release successful or publish from a feature branch without an explicit human override of the main-only policy.
