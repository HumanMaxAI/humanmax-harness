# HumanMax Agent Harness

Open-source, local-first project generator and runtime scaffold for assurance-ready AI agents.

This repository is in **Preview scaffold**. Packages exist and compile, but they do not yet generate a customer project. The product promise is:

> Create a local-first, assurance-ready agent project with explicit action boundaries, jurisdiction-aware controls and evidence-producing CI.

The generated project is the product. This monorepo builds the generator, Runtime Harness, contracts, CLI, rules, and Agent Skill that keep those projects conformant.

## Documentation

| Kind | Path |
|---|---|
| Design | [`docs/design/`](./docs/design/) |
| Reviews | [`docs/reviews/`](./docs/reviews/) |
| Agent constraints | [`AGENTS.md`](./AGENTS.md) |
| Parallel lanes | [`docs/agents/`](./docs/agents/) |

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

Preview default create path: TypeScript, `tool-agent`, generic fixture, `assisted`, `base`, GitHub CI.

## Develop

Requires Node 22+.

```bash
npm install
npm test
npm run typecheck
```

This repository is a multi-agent parallel project. Read `AGENTS.md` and claim a lane before editing. Preferred isolation is a git worktree under `.worktrees/`.

## What this is not

Harness does not enforce production actions, issue certification, or replace IAM, GRC, SIEM, or a secrets manager. Passing local checks is not proof that production is runtime-enforced.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
