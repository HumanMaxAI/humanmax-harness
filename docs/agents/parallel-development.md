# Parallel development

Multiple coding agents develop this repository. Each agent must isolate its work.

## Why

Work on contracts, runtime, generator, CLI, and Core can proceed in parallel after the contract version is stable. Agents must not share a working tree or a write set. Mixed edits can cause gateway bypasses, conflicting layouts, and changelog collisions.

## Default pattern

1. The coordinator reads `AGENTS.md`, the current design, and the current review.
2. The coordinator assigns each task to one lane and one branch.
3. Each implementer creates a worktree under `.worktrees/<lane>-<topic>/`. Each implementer also creates a claim in `.agent-claims/<lane>.json`.
4. Each implementer edits only the claimed write set and adds a changelog bullet.
5. Each implementer runs the lane tests and `node scripts/check-scaffold.mjs`. These checks must pass before integration.
6. The coordinator merges the changes. The coordinator then runs workspace `typecheck` and `test`. Both commands must pass.

## Worktrees

```bash
git worktree add ".worktrees/runtime-gateway" -b feat/runtime-gateway
```

Git ignores `.worktrees/`. Never add a worktree that Git can track.

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

If a lane has a claim, do not edit that lane. Do not delete another agent's claim.

## Dispatch prompt minimum

Include these items in every subagent prompt:

- Lane name and write set
- Files that must not change
- Preview in / out of scope
- The four result states, if the work touches checks
- Required verification command
- “Do not claim production enforcement or certification”

## Integration

After changes from two or more lanes are merged:

1. Run `npm test` and `npm run typecheck` at the repository root. Both commands must exit with code 0.
2. Check `packages/core`. It must have no network or filesystem-write imports.
3. Check the tool registry and action gateway. The changes must not add a second registry or an effectful shortcut.
4. Check documentation placement. Design and review files must remain in their required directories.
