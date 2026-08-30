---
name: humanmax-agent-harness
description: Build and maintain HumanMax agent projects through the project-pinned CLI. Use when adding or changing agents, tools, runtime behaviour, autonomy, approvals, evals, or assurance evidence. Do not bypass the action gateway or treat Harness results as certification.
---

# HumanMax Agent Harness

This Skill is a stub until the CLI JSON contract is implemented.

When the CLI exists:

1. Run `humanmax doctor --format json`.
2. Add tools with `humanmax add`. Do not hand-copy template boilerplate.
3. Keep effectful actions behind the action gateway.
4. Run `humanmax generate --check`, `humanmax test`, and `humanmax check --format json`.
5. Never create an approval, exception, production-enforcement claim, or compliance claim.

For work **inside this repository**, follow `/AGENTS.md` and claim a lane. Do not invent a second file layout.
