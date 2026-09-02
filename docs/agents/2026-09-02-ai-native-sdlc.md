# AI-native SDLC adapter (this repository)

**Date:** 2026-09-02  
**Intent:** [`../plans/2026-09-02-ai-native-sdlc-intent.md`](../plans/2026-09-02-ai-native-sdlc-intent.md)  
**PR review:** [`pr-review.md`](./pr-review.md)

This file is an operating note. It does not amend the product design. It does not expand Preview.

Binding constraints stay in `/AGENTS.md`. This note only says how a change moves through artifacts in *this* repo.

## What this is

A mapping of the [AI-native SDLC playbook](https://claude.com/blog/the-ai-native-sdlc-playbook) onto names we already use. Each non-trivial change commits an artifact the next step can read. Humans stay accountable at the gates.

## What this is not

- A second source of truth above contracts, packs, the action gateway, or Core
- A licence to convert `FAIL`, `UNKNOWN`, or `NEEDS_HUMAN_REVIEW` into `PASS`
- A generated-project contract. Customer templates do not gain `intent.md` / `spec.md` trees in Preview
- Anthropic enterprise controls (Claude Tag, Claude Security, managed MDM, headless production)

## Artifact chain

Keep these names. Do not copy the playbook’s root filenames.

| Stage | Artifact | Location |
|---|---|---|
| Plan | Proto-spec (intent) | `docs/plans/YYYY-MM-DD-<topic>-intent.md` |
| Design | Normative spec | `docs/design/YYYY-MM-DD-<topic>.md` |
| Accept / cut | Review | `docs/reviews/YYYY-MM-DD-<topic>.md` |
| Build | Implementation plan | `docs/plans/YYYY-MM-DD-<topic>.md` |
| Build | Diff + tests | the branch |
| Test | Command output | pasted in the session / PR before “done” |
| Deploy | PR + changelog | GitHub; human merge |

`AGENTS.md` is this repository’s committed operating file. `CLAUDE.md` is an adapter. Do not replace `AGENTS.md` with a root `CLAUDE.md` as source of truth.

Source of truth order is unchanged: contracts → packs → gateway → Core → CLI JSON → generated artefacts → this file’s adapters.

## When an intent file is required

Write `docs/plans/YYYY-MM-DD-<topic>-intent.md` before a new design, a new review that starts work, or a new plan, when the originator’s words are not already in one of those files.

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

The originator corrects the file. Accepting it (merge, or an explicit human “do this”) is what starts design or plan. Do not start implementation from a draft intent.

## Plan before the first implementation edit

Non-trivial work starts read-only. The plan names:

1. Files that change (and the lane that owns them)
2. Order of work
3. Risks and what must not change
4. Proof: which commands or tests show it worked

Commit the plan as `docs/plans/YYYY-MM-DD-<topic>.md`. If implementation departs from the plan, update the plan in the same commit as the departure.

A session that has never seen the chat should be able to implement from the plan alone.

## Verify before claiming done

Absence of evidence is `UNKNOWN`, not a pass.

Before an agent says the work is complete:

1. Run the commands that cover the touched lane. Default: `node scripts/check-scaffold.mjs`, and when packages changed, `npm test` and `npm run typecheck`.
2. Paste the exit-bearing output (or a tight excerpt that includes the summary and exit code).
3. Fix the code, not the test, unless the test itself is the bug and the plan said so.
4. Do not weaken a failing check to make the branch green.

The Preview gap review (`docs/reviews/2026-09-02-preview-gap-review.md`) is the worked example: green repository tests were not evidence that a generated project installed.

## Parallel work

Lanes, claims, and worktrees in `lanes.md` and `parallel-development.md` are the parallel-session play. One writer per lane. Do not share a claimed lane by staying in different subfolders.

## Production gate

The action gateway and deny-all-production remain the deterministic hooks. Skills and this note are advisory. Advisory text cannot approve a production action, create an exception, or close a finding.

Do not add a headless maintain loop, Trust Engine, or an agent that deploys past the production gate.

## When Claude is wrong twice

If an agent repeats a mistake this note or `AGENTS.md` should have caught, correct the operating file in that change. Do not leave the correction in chat.
