# Agent operating manual

This file is the source of truth for every coding agent working in `humanmax-harness`. Cursor rules, `CLAUDE.md`, and Skills are adapters. They must not invent a second layout, a second command surface, or a weaker constraint.

If this file and a chat instruction conflict, this file wins unless a human explicitly overrides it in the current task.

## What this repository is

HumanMax Agent Harness is an open-source, local-first project generator and runtime scaffold for assurance-ready AI agents.

This repository is also a **multi-agent parallel development project**. Several agents may implement independent lanes at the same time. They coordinate through git isolation, package lanes, and explicit claims — not by editing the same files.

The generated customer project is the product. This repository builds the generator, runtime, contracts, CLI, rules, and Skill that keep those projects conformant.

## What this repository is not

- A production enforcement service or Trust Engine
- A certification, legal opinion, or MAS / IMDA / CSA approval
- A general agent orchestration framework or model-provider SDK
- A hosted approval queue, policy control plane, or audit database
- A place to upload customer source, prompts, or findings by default

Do not write README, Skill, or commit copy that implies otherwise.

## Source of truth

Higher layers win. A lower layer cannot override or suppress a higher one.

1. Versioned contracts and schemas in `packages/contracts`
2. Signed or digest-locked Control Packs in `packs/`
3. Runtime Harness and the single action-gateway seam
4. Deterministic Core in `packages/core`
5. CLI results (JSON / SARIF / exit codes)
6. Generated artefacts and evidence manifests
7. This file, Cursor rules, and the canonical Skill
8. Design documents
9. Review documents, plans, and chat

A coding agent must not convert `FAIL`, `UNKNOWN`, or `NEEDS_HUMAN_REVIEW` into `PASS`. Prose is not execution authority.

## Documentation placement

Design and review are different artefacts. Do not mix them.

| Kind | Location | Allowed content |
|---|---|---|
| Product / architecture design | `docs/design/` | Normative intent, contracts, workflows, public claims |
| Reviews | `docs/reviews/` | Verdicts, findings, cuts, risk, go / no-go |
| Agent operating notes | `docs/agents/` | Lanes, worktrees, claim protocol |
| Implementation plans | `docs/plans/` | Task-level execution plans |
| User-facing docs | `docs/guides/` | How to use published packages, when they exist |

Rules:

- Do not add design or review files at the repository root.
- Do not put review findings inside a design document.
- Do not “fix” a design by silently rewriting it during implementation. Open a review note or a dated design revision.
- Date new files `YYYY-MM-DD-<topic>.md`.
- `CHANGELOG.md` is the only root changelog. Update it before a commit that changes behaviour or public structure.

Current canonical design: `docs/design/2026-08-29-open-source-product-design.md`  
Current product review: `docs/reviews/2026-08-30-product-review.md`

## Preview scope — do not expand

The written product design describes a full platform. The approved first ship is a **Preview**:

**In scope**

- TypeScript `tool-agent` path
- `create-humanmax-agent` with a single default create path
- Runtime: run id, budgets, registry, schema validation, action gateway, local-review, deny-all-production
- CLI: `dev`, `add tool`, `add eval`, `generate --check`, `test`, `doctor`, thin `check`
- Generator lock, file-ownership classes, `upgrade --dry-run`
- `base` pack with digest lock
- Canonical Skill that only invokes the pinned CLI JSON
- Generated GitHub workflow

**Out of scope until a human expands Preview**

- `adopt --apply` as a supported product
- Full `upgrade --apply` / three-way merge completeness
- `regulated` template
- `sg-core` in the create wizard
- Trust Engine, Moonshot, Python template
- Evidence HTML viewer, pack ecosystem, extra inspectors

If a task needs an out-of-scope surface, stop and ask. Do not “helpfully” add it.

## Parallel development

### Lanes

One active writer per lane. Lanes are listed in `docs/agents/lanes.md`.

| Lane | Owns | May read |
|---|---|---|
| `contracts` | `packages/contracts` | everything |
| `runtime` | `packages/runtime-harness` | contracts |
| `generator` | `packages/project-generator`, `packages/create-humanmax-agent`, `templates/`, `profiles/` | contracts, runtime public API |
| `cli` | `packages/cli` | contracts, generator, runtime, core, findings public APIs |
| `core` | `packages/core`, `packages/findings`, `packs/` | contracts |
| `skill` | `skills/` | CLI JSON contract only |
| `docs` | `docs/`, root markdown except `CHANGELOG.md` during an implementation commit | everything |
| `ci` | `.github/`, root workspace config that CI invokes | package scripts |

`CHANGELOG.md` may be edited by any lane for that lane’s commit. Do not rewrite other lanes’ entries.

Shared files that are **not** a lane (root `package.json`, `tsconfig.base.json`, `AGENTS.md`):

- One agent at a time
- Prefer a dedicated integration / coordinator task
- Never “drive-by” edit them while implementing a package

### Isolation

Preferred: one agent, one git worktree, one branch, one lane.

```text
.worktrees/<lane>-<short-topic>/
```

`.worktrees/` and `.agent-claims/` are gitignored. Do not commit them.

If you work in the primary checkout, you still claim a lane. You do not edit another claimed lane.

### Claim protocol

Before writing code:

1. Read `docs/agents/lanes.md` and `.agent-claims/`.
2. Create `.agent-claims/<lane>.json` only if that lane is free.
3. Work only inside the claimed lane plus the changelog entry for your change.
4. Delete your claim file when the branch is merged or the task is abandoned.

Claim file shape:

```json
{
  "lane": "runtime",
  "agent": "cursor-composer",
  "branch": "feat/runtime-gateway",
  "task": "Action gateway deny-all-production adapter",
  "claimedAt": "2026-08-30T06:00:00Z"
}
```

If the lane is claimed, stop. Do not overwrite the claim. Do not “just change one file.”

### Dispatch rules

- One agent per independent lane or independent bug domain.
- Prompts must name the lane, the files that may change, and the files that must not change.
- Agents must not inherit another session’s unstated context. Put the contract and the constraint in the prompt.
- After parallel work lands, one coordinator runs the full workspace `test` / `typecheck` and resolves conflicts.

## Hard constraints

An agent MUST NOT:

1. Bypass, duplicate, or weaken the action-gateway seam.
2. Add a second tool registry or a direct effectful client “for convenience.”
3. Claim production enforcement, certification, or legal compliance.
4. Create an approval, owner, exception, or risk acceptance for the user.
5. Send repository source, prompts, findings, or secrets to a HumanMax service.
6. Download or execute rule code from a Control Pack. Packs are declarative.
7. Give `packages/core` a network, filesystem-write, or model dependency.
8. Invent a file layout that contradicts this repository or the generated-project contract.
9. Overwrite user-owned or canonical files in a generated fixture without preview / apply.
10. Expand Preview scope without an explicit human request.
11. Commit `.env`, credentials, evidence payloads, `.DS_Store`, worktrees, or claim files.
12. Use `git commit --amend`, force-push, or hook-skipping unless the human asked.

An agent MUST:

1. Run `humanmax` / workspace commands rather than re-implementing a rule in prose, once those commands exist.
2. Prefer `humanmax add` in generated projects; in this repo, add packages only through the published workspace layout.
3. Keep model calls behind a model adapter and effectful calls behind the action gateway.
4. Add tests with any new contract, rule, or runtime invariant.
5. Distinguish `PASS` / `FAIL` / `UNKNOWN` / `NEEDS_HUMAN_REVIEW`. Absence of evidence is not a pass.
6. Update `CHANGELOG.md` with today’s local date before a non-trivial commit.
7. Leave a clean typecheck and the workspace tests that cover the touched lane.
8. End every agent-authored commit with a `Co-authored-by` trailer that names the harness tool and the model. See [Commits](#commits).

## Generated-project contract

When this repo later writes customer projects, those projects follow the design’s generated tree. Canonical control decisions live in `.humanmax/` YAML. `AGENTS.md`, Skill text, and docs in a generated project are derived views.

Do not teach a coding agent to treat generated prose as the only copy of a control.

## Commands

Until packages are implemented, use the workspace scripts:

```bash
npm install
npm test
npm run typecheck
node scripts/check-scaffold.mjs
```

After the CLI exists, generated projects and CI use the **project-pinned** `humanmax` binary. Do not call a globally installed CLI and treat it as authoritative.

## Commits

Agent-authored commits must include a GitHub-valid trailer:

```text
Co-authored-by: <Harness> + <Model> <<harness>+<model-slug>@noreply.humanmax.ai>
```

Print it. Do not hand-type the email:

```bash
node scripts/co-author.mjs Cursor "Grok 4.6"
# Co-authored-by: Cursor + Grok 4.6 <cursor+grok-4.6@noreply.humanmax.ai>
```

Put a blank line before the trailer. Details: `docs/agents/commit-attribution.md`.

## Public language

Allowed: local-first, assurance-ready, explicit action boundary, evidence-producing CI, offline deterministic checks, mapped to named framework versions.

Forbidden without independent evidence: certified, regulator-approved, bank-grade, runtime-enforced (Layer 01 only), complete discovery, “passing Harness means safe for production.”
