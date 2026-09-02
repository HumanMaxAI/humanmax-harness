# Intent: close remaining Preview P0 gates without npm credentials

Author: docs lane (Cursor + Grok 4.6). Status: accepted 2026-09-02 (human: “按照新规则 继续开发MVP”).

## Problem

The create → run → check loop is green locally (`file:` installs, generated-project CI, pack digest lock). The 2026-09-02 gap review is stale against that work, and several in-Preview §20 gates are still open. Wave 3 of `docs/plans/2026-09-02-preview-green-loop.md` (public `npm create`) is blocked on maintainer npm 2FA / `NPM_TOKEN`, which an agent cannot complete.

Originator ask: keep developing the MVP, following the intent → plan → verify loop.

## Proposed outcome

A Wave 4 execution plan that closes remaining **code-and-docs** Preview P0 gates one lane at a time, starting with the P0 path hole: `humanmax add tool` must emit documentation in the same change set (design §20 G10). Later slices cover contract fixtures (G18), a real `NEEDS_HUMAN_REVIEW` emission on a fixture not the default project (G19), a public adapter conformance suite (G13), an offline `check` proof (G21), and a threat model (G32).

Default generated projects stay installable. `FAIL` / `UNKNOWN` / `NEEDS_HUMAN_REVIEW` are never mapped to `PASS`.

## Affected users and systems

Developers and coding agents using Preview `tool-agent`. Lanes: `generator` first, then `contracts`, `core`, `runtime`, `cli`, `docs`.

## Constraints

- Preview scope does not expand.
- One writer per lane. Stale Wave 1 claims may be replaced only after those branches are ancestors of `main`.
- Do not publish to npm or switch `DEPENDENCY_MODE` to `"published"` until a public install of `@humanmax/cli` is confirmed.
- Do not put `intent.md` / `spec.md` / `plan.md` / `REVIEW.md` at the repository root.
- `packages/core` stays free of network, filesystem writes, and model calls.

## Out of scope

- `adopt --apply`, `upgrade --apply`, `regulated`, wizard `sg-core`, Trust Engine, Moonshot, Python, evidence viewer
- Implementing the `minimal` template (Preview ships `tool-agent`; product review keeps `minimal` only as a strict subset)
- Relicensing extraction rights, DCO vs CLA (launch blockers 2–3, human)
- Pack signature / publisher trust root beyond the existing digest lock (launch blocker 4)
- Reserving npm names by publishing (launch blocker 1 / Wave 3)

## Open questions

None for slice 1 (G10). G19 must not make the default generated `check` fail; confirm the NHR fixture stays off the default path when that slice starts.
