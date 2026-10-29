# Pull request review (this repository)

Use this checklist on every PR. It defines the review policy for humans and coding agents. Keep it in `docs/agents/`; do not create a root `REVIEW.md`. This checklist does not approve merges.

A human code owner merges the PR under branch protection. The agent that wrote the diff cannot approve it.

## Passes

Run three passes. Tag each finding with its pass.

1. **Behaviour.** Compare the diff with the committed plan in `docs/plans/`. Also check the intent, design, or review that the plan cites. Report a finding if non-trivial work has no committed plan.
2. **Constraints.** Check every hard rule in `AGENTS.md`. Reject a second tool registry, a gateway bypass, or an unauthorized Preview expansion. Do not allow `FAIL`, `UNKNOWN`, or `NEEDS_HUMAN_REVIEW` to become `PASS`. Core must have no network, filesystem-write, or model calls. Documentation must stay in the required directory.
3. **Security.** Check that the diff contains no secrets. Check pack and lock reads for path escapes. Reject production-enforcement claims and uploads of source or findings to a HumanMax service.

## What Important means here

Mark a finding **Important** only if it meets one or more of these conditions:

- It would break behaviour or leak data.
- It would bypass the gateway.
- It would expand Preview without a human request.
- It would breach a named `AGENTS.md` constraint.

Style, naming, and optional refactors are nits.

## Cap the nits

Report at most five nits. Give the count of any remaining nits. Do not block a PR on nits.

## Do not report

- Generated `dist/` output that CI already builds
- Conditions already enforced by `npm test`, `npm run typecheck`, or `node scripts/check-scaffold.mjs`, unless the PR weakens that check
- Changelog collisions that a coordinator will resolve by combining entries, unless this PR rewrote another lane's dated bullets

## Agent-authored PRs

1. Add this lane's changelog entry with today's local date. Do not rewrite another lane's entries.
2. Generate the `Co-authored-by` trailer with `node scripts/co-author.mjs`. Include the trailer in the commit.
3. Include verification output in the PR or in the session that opened the PR.
4. Push over SSH as HumanMaxAI. Follow `docs/agents/git-identity.md`.
