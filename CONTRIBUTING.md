# Contributing

1. Read `AGENTS.md`. It is binding for humans and coding agents.
2. For non-trivial work, follow the development loop in `docs/agents/2026-09-02-ai-native-sdlc.md` (intent, plan, pasted verification). Review PRs with `docs/agents/pr-review.md`.
3. Claim a free lane (`docs/agents/lanes.md`) before you write code.
4. Prefer a worktree under `.worktrees/` for that lane.
5. Stay inside Preview scope unless a maintainer expands it.
6. Update `CHANGELOG.md` with today’s date before you commit.
7. Run `npm test` and `npm run typecheck`.
8. Agent-authored commits must end with `Co-authored-by: <Harness> + <Model> <email>`. Run `node scripts/co-author.mjs Cursor "Grok 4.6"` (or the current harness and model). See `docs/agents/commit-attribution.md`.
9. Do not commit `.env`, worktrees, claim files, or `.DS_Store`.

External contribution terms (DCO vs CLA) are an open decision. Until that is published, do not assume a contribution licence beyond the repository’s Apache-2.0 grant from the company.
