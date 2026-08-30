# Product review — HumanMax Agent Harness

**Date:** 2026-08-30  
**Subject:** Design v0.3 draft (`docs/design/2026-08-29-open-source-product-design.md`)  
**Verdict:** Conditional approve — keep the constitution, cut the first public ship to a Preview developer loop.

This file is a review. It does not replace the design. Implementation follows the Preview cut below unless a later dated design revision supersedes it.

## Verdict

The product identity is correct: the generated project is the product; CLI, Skill, and CI share one contract; Layer 01 cannot grant production authority; `UNKNOWN` is not `PASS`; the north-star is a Harness-mediated run plus generated CI, not download counts.

The written P0 is a platform. Shipping it as one release will stall the first green path and make every surface look unfinished. Approve direction. Do not build the listed P0 as a single MVP.

## Hold

- Generated project as the product, with Skill invoking pinned CLI JSON
- Layer 01 cannot imply production enforcement
- Absence of evidence is not a pass
- Local-first, no HumanMax account, no source upload by default
- Apache-2.0 intent and no dark-pattern degradation toward cloud
- North-star metric: monthly projects that reach a real local run and a passing generated gate

## Change before the first public ship

1. **P0 is a platform, not an MVP.** Create, runtime, a wide CLI, rule engine, packs, adopt, evidence, Skill, and four-class upgrades is 6–9 months of honest work.
2. **Two products in one release.** The primary job is create → add tool → run → green CI. Check / evidence / exceptions serve security and risk. Keep those thin in Preview.
3. **First-run axes are too many.** Default path: TypeScript, `tool-agent`, generic fixture, `assisted`, `base`, GitHub CI. Ask `sg-core` and extra Skills after the first green run.
4. **Layer 01 must be visible in five minutes.** Undeclared tools fail closed. A gateway bypass fails CI. Production stays `unconfigured`. Trust Engine is a later attach.
5. **`adopt` and full upgrade apply are not Preview.** Weak retrofit or merge demos will become the public review.
6. **Names, relicensing, DCO vs CLA, and pack trust root are launch blockers.** A finished generator that cannot be published is not a product.

## Preview P0

Ship:

- `create-humanmax-agent` with `--defaults` and one default path
- TypeScript `tool-agent` (keep `minimal` only if it stays a strict subset)
- Runtime Harness with local-review and deny-all-production adapters
- CLI: `dev`, `add tool`, `add eval`, `generate --check`, `test`, `doctor`, thin `check`
- Lock file, ownership classes, `upgrade --dry-run`
- Canonical Skill that only calls CLI JSON
- Generated GitHub workflow and `base` pack digest lock

Defer:

- `adopt --apply`, complete `upgrade --apply`, `regulated`, wizard `sg-core`
- Trust Engine, Moonshot, Python template, evidence viewer, pack ecosystem

Success moment stays a real Harness-mediated run, not a folder of policy files.

## Primary user

Agent and platform engineers who know a security review is coming. This is not a hobby create-app. Risk owners are a later surface on the same contract.

## Market

SidClaw and Google Agents CLI are the create-UX comparators. Control Zero is the enforcement comparator. Do not become another orchestrator. Do not rebuild Moonshot. The wedge is neutral generate + constitution + action boundary + lineage + evidence CI + offline + open enforcement seam — only if each item is actually crisp.

## Launch blockers

1. GitHub organisation, npm scope, CLI name
2. Relicensing and extraction rights
3. DCO versus CLA
4. Pack signature format and publisher trust root
