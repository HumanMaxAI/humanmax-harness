# Intent: internal AI-native SDLC adapter

Author: docs lane (Cursor + Grok 4.6). Status: accepted 2026-09-02 (human: “do A”).

## Problem

Agents in this repository already write code faster than the surrounding process. Ideas live in chat, plans appear after the first edit, and “done” is claimed without pasted verification. The Preview gap review showed the cost: repository CI was green while a generated project did not install.

Anthropic’s AI-native SDLC playbook describes the same loop we need (intent → spec → plan → diff → review), but its filenames (`intent.md`, `CLAUDE.md`, root `REVIEW.md`) and later plays (headless production, Claude Tag) conflict with `AGENTS.md` and Preview scope.

## Proposed outcome

This repository keeps its own artifact names and runs a tighter loop:

- a dated proto-spec before new design or plan work
- a committed plan before the first implementation edit on non-trivial work
- pasted verification before an agent claims done
- identical PR review passes that check the diff against the plan and `AGENTS.md`

No new product surface. No generated customer `intent.md` trees. No Trust Engine, hosted on-call, or production-acting agents.

## Affected users and systems

Coding agents and humans working in `humanmax-harness`. Not generated customer projects.

## Constraints

- `AGENTS.md` remains the operating source of truth. `CLAUDE.md` and Cursor rules are adapters.
- Documentation stays under `docs/` with the existing kind split. Do not add `intent.md`, `spec.md`, `plan.md`, or `REVIEW.md` at the repository root.
- Preview scope does not expand.
- The action gateway, Core purity, and `FAIL` / `UNKNOWN` / `NEEDS_HUMAN_REVIEW` rules do not change.
- Docs lane write set plus a short `AGENTS.md` pointer so agents actually load the loop.

## Open questions

None for this adapter. Encoding the same loop into generated customer projects waits until Preview’s create → run → check loop is published.
