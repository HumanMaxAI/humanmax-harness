# Pull request review (this repository)

Use this checklist on every PR. It is the review policy for humans and coding agents. It is not a root `REVIEW.md` and it does not approve merges.

Branch protection and a human code owner still merge. The agent that wrote the diff cannot approve it.

## Passes

Run three passes. Tag each finding with its pass.

1. **Behaviour.** The diff matches the committed plan in `docs/plans/` (and the intent, design, or review it cites). Missing plan on non-trivial work is a finding.
2. **Constraints.** `AGENTS.md` hard rules: no second tool registry, no gateway bypass, no Preview expansion, no `FAIL` / `UNKNOWN` / `NEEDS_HUMAN_REVIEW` mapped to `PASS`, Core stays free of network / filesystem-write / model calls, docs stay in the right directory.
3. **Security.** Secrets out of the diff, no path escape in pack or lock reads, no production-enforcement claim, no upload of source or findings to a HumanMax service.

## What Important means here

Reserve **Important** for findings that would break behaviour, leak data, bypass the gateway, expand Preview without a human request, or breach a named `AGENTS.md` constraint.

Style, naming, and optional refactors are nits.

## Cap the nits

Report at most five nits. Summarise the rest as a count. Do not block on nits.

## Do not report

- Generated `dist/` output that CI already builds
- Anything `npm test`, `npm run typecheck`, or `node scripts/check-scaffold.mjs` already enforces, unless the PR weakens that check
- Changelog collisions that a coordinator will concatenate, unless this PR rewrote another lane’s dated bullets

## Agent-authored PRs

- Changelog dated today, append-only for this lane
- `Co-authored-by` trailer from `node scripts/co-author.mjs`
- Verification output present in the PR or the session that opened it
- Push over SSH as HumanMaxAI (`docs/agents/git-identity.md`)
