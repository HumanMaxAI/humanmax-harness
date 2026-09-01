---
name: humanmax-agent-harness
description: Build and maintain HumanMax agent projects through the project-pinned CLI. Use when adding or changing agents, tools, runtime behaviour, autonomy, evals, or assurance evidence. Do not bypass the action gateway or treat Harness results as certification.
---

# HumanMax Agent Harness

Use the project-pinned `humanmax` CLI. Canonical control decisions live in `.humanmax/`. This Skill does not embed a rule catalogue.

1. Run `humanmax doctor --format json` and identify the generated project contract.
2. Add tools and evals with `humanmax add`; do not hand-copy template boilerplate. Preview writes with `--dry-run`.
3. Keep every effectful action behind the action gateway. There is no direct-call shortcut.
4. Preview project-contract upgrades with `humanmax upgrade --dry-run --format json`. Never apply them silently. Preview does not support `upgrade --apply`.
5. Run `humanmax generate --check --format json`, `humanmax test --format json`, and `humanmax check --format json`.
6. Use JSON rather than scraping terminal text. If compatibility.json does not match the CLI contract, stop.
7. Report remaining FAIL, UNKNOWN, or NEEDS_HUMAN_REVIEW results. Do not convert them to PASS.
8. Never create an approval, risk acceptance, production-enforcement claim, or compliance claim.

Passing these commands is not production enforcement or certification.
