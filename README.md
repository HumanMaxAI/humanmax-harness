# HumanMax Agent Harness

HumanMax Agent Harness is an open-source, local-first project generator and runtime scaffold for assurance-ready AI agents.

This repository is in **Preview scaffold**. Packages exist and compile. They do not yet generate a customer project. The product goal is:

> Create a local-first, assurance-ready agent project with explicit action boundaries, jurisdiction-aware controls and evidence-producing CI.

The generated project is the product. This monorepo builds the generator, Runtime Harness, contracts, CLI, rules, and Agent Skill. These components keep generated projects conformant.

## Documentation

| Kind | Path |
|---|---|
| Design | [`docs/design/`](./docs/design/) |
| Reviews | [`docs/reviews/`](./docs/reviews/) |
| Agent constraints | [`AGENTS.md`](./AGENTS.md) |
| Parallel lanes | [`docs/agents/`](./docs/agents/) |
| Writing style | [Documentation style guide](./docs/agents/2026-10-29-documentation-style.md) |

Design and review are stored separately. Do not add either at the repository root.

## Workspace

```text
packages/create-humanmax-agent   bootstrap command
packages/project-generator       templates, overlays, safe writes
packages/runtime-harness         run state, budgets, action gateway
packages/contracts               public identifiers and schemas
packages/core                    deterministic checks (no network)
packages/cli                     project-pinned `humanmax`
packages/findings                rule catalogue
```

The Preview default create path uses TypeScript, `tool-agent`, a generic fixture, `assisted`, `base`, and GitHub CI.

## Develop

Use Node 22 or later.

Multiple coding agents develop this repository in parallel.

1. Read [AGENTS.md](./AGENTS.md) and claim a lane before editing.
2. Use a Git worktree under `.worktrees/` for the preferred isolation method.
3. Run these commands in order. Installation must succeed before you run the checks. Each check must exit with code 0.

```bash
npm install
npm test
npm run typecheck
```

## What this is not

Harness does not enforce production actions or issue certification. It does not replace IAM, GRC, SIEM, or a secrets manager. Passing local checks does not prove runtime enforcement in production.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
