# AI-native SDLC adapter (this repository)

**Date:** 2026-09-02  
**Intent:** [`../plans/2026-09-02-ai-native-sdlc-intent.md`](../plans/2026-09-02-ai-native-sdlc-intent.md)  
**PR review:** [`pr-review.md`](./pr-review.md)

This file explains the development process. It does not amend the product design or expand Preview.

The binding constraints are in `/AGENTS.md`. This note explains how a change moves through artifacts in this repository.

## What this is

This note maps the [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) to existing repository terms. For each non-trivial change, commit an artifact that the next stage can read. Humans remain accountable at each gate.

## What this is not

- A second source of truth above contracts, packs, the action gateway, or Core
- A licence to convert `FAIL`, `UNKNOWN`, or `NEEDS_HUMAN_REVIEW` into `PASS`
- A generated-project contract. Customer templates do not gain `intent.md` / `spec.md` trees in Preview
- Anthropic enterprise controls (Claude Tag, Claude Security, managed MDM, headless production)

## Artifact chain

Use these artifact names. Do not copy the playbook's root filenames.

| Stage | Artifact | Location |
|---|---|---|
| Plan | Proto-spec (intent) | `docs/plans/YYYY-MM-DD-<topic>-intent.md` |
| Design | Normative spec | `docs/design/YYYY-MM-DD-<topic>.md` |
| Accept / cut | Review | `docs/reviews/YYYY-MM-DD-<topic>.md` |
| Build | Implementation plan | `docs/plans/YYYY-MM-DD-<topic>.md` |
| Build | Diff + tests | the branch |
| Test | Command output | pasted in the session / PR before “done” |
| Deploy | PR + changelog | GitHub; human merge |

`AGENTS.md` is this repository's committed operating file. `CLAUDE.md` is an adapter. Do not make a root `CLAUDE.md` the source of truth in place of `AGENTS.md`.

Source of truth order is unchanged: contracts → packs → gateway → Core → CLI JSON → generated artefacts → this file’s adapters.

## When an intent file is required

Check whether a design, review, or plan already records the originator's request. If none does, write `docs/plans/YYYY-MM-DD-<topic>-intent.md` before starting the new artifact. This requirement applies to a new design, a new review that starts work, or a new plan.

Skip the intent file when:

- the human already pointed at an existing design, review, or plan for this change
- the change is trivial: comment typo, changelog-only, or a one-line adapter that cannot change behaviour

### Intent template

```markdown
# Intent: <short name>

Author: <lane or person>. Status: draft | accepted | closed.

## Problem
What cannot be done today, in the originator’s words.

## Proposed outcome
What better looks like.

## Affected users and systems
Who and which packages / docs.

## Constraints
Preview scope, lane, files that must not change, hard AGENTS.md rules.

## Out of scope
What we are not doing, including good ideas.

## Open questions
Anything a product owner or tech lead must answer before design or plan.
```

The originator corrects the intent file. Start design or planning only after acceptance. Acceptance requires a merge or an explicit human instruction to proceed. Do not start implementation from a draft intent.

## Plan before the first implementation edit

Start non-trivial work with read-only inspection. Include these items in the plan:

1. Files that change (and the lane that owns them)
2. Order of work
3. Risks and what must not change
4. Proof: which commands or tests show it worked

Commit the plan as `docs/plans/YYYY-MM-DD-<topic>.md` before the first implementation edit. If implementation departs from the plan, update the plan in the same commit as that departure.

The plan must contain enough context for a new session to implement the change without reading the chat.

## Verify before claiming done

Absence of evidence is `UNKNOWN`, not a pass.

Before an agent says the work is complete:

1. Run the commands that cover the touched lane. Run `node scripts/check-scaffold.mjs` by default. If packages changed, also run `npm test` and `npm run typecheck`. The required commands must exit with code 0.
2. Paste the output and exit code. A short excerpt is acceptable if it includes the summary and exit code.
3. If a check fails, fix the code. Change the test only if the test contains the bug and the plan identified that correction.
4. Do not weaken a failing check to make the branch pass.

See the Preview gap review in `docs/reviews/2026-09-02-preview-gap-review.md`. It records that passing repository tests did not prove that a generated project could install.

## Parallel work

Follow the lane, claim, and worktree procedures in `lanes.md` and `parallel-development.md`. Each lane has one writer. Different subfolders do not permit two writers in a claimed lane.

## Production gate

The action gateway and deny-all-production remain the deterministic hooks. Skills and this note are advisory. Advisory text cannot approve a production action, create an exception, or close a finding.

Do not add a headless maintain loop, Trust Engine, or an agent that deploys past the production gate.

## When Claude is wrong twice

If an agent repeats a mistake that this note or `AGENTS.md` should prevent, correct the applicable operating file in that change. Do not leave the correction only in chat.
