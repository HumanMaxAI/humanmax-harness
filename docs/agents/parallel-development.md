# Parallel development

This repository is developed by multiple coding agents. Isolation is a product requirement, not a preference.

## Why

Contracts, runtime, generator, CLI, and Core can move in parallel once the contract version is stable. They must not share a working tree or a write set. Mixed edits produce gateway bypasses, invented layouts, and changelog collisions.

## Default pattern

1. Coordinator reads `AGENTS.md`, the current design, and the current review.
2. Coordinator splits work by lane. One task, one lane, one branch.
3. Each implementer creates a worktree under `.worktrees/<lane>-<topic>/` and a claim in `.agent-claims/<lane>.json`.
4. Implementer writes only the claimed write set plus a changelog bullet.
5. Implementer runs the lane tests and `node scripts/check-scaffold.mjs`.
6. Coordinator merges, then runs workspace `typecheck` and `test`.

## Worktrees

```bash
git worktree add ".worktrees/runtime-gateway" -b feat/runtime-gateway
```

`.worktrees/` is gitignored. Never add a worktree that git can track.

If a native worktree tool exists in the host, use that instead of raw `git worktree add`.

## Claims

Claim before the first edit. Example:

```json
{
  "lane": "runtime",
  "agent": "cursor-composer",
  "branch": "feat/runtime-gateway",
  "task": "Action gateway deny-all-production adapter",
  "claimedAt": "2026-08-30T06:00:00Z"
}
```

A claimed lane is closed. Do not delete someone else’s claim.

## Dispatch prompt minimum

Every subagent prompt must include:

- Lane name and write set
- Files that must not change
- Preview in / out of scope
- The four result states, if the work touches checks
- Required verification command
- “Do not claim production enforcement or certification”

## Integration

After two or more lanes land:

- Re-run `npm test` and `npm run typecheck` at the repository root
- Check that `packages/core` still has no network or filesystem-write imports
- Check that no second tool registry or effectful shortcut appeared
- Confirm design and review files stayed in their directories
