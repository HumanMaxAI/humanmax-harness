# HumanMax Agent Harness

Open-source, local-first project generator and runtime scaffold for assurance-ready AI agents.

This repository is **Preview**. From this clone you can create a TypeScript `tool-agent`, run it through the action gateway, and get JSON check results. Packages are not published to npm yet; `npm create humanmax-agent@latest` is not a supported path.

The generated project is the product. Passing local checks is not production enforcement or certification.

## First run

Requires Node 22+.

```bash
npm install
npm test
npm run typecheck

node --experimental-strip-types packages/create-humanmax-agent/src/cli.ts ./my-agent --defaults
cd my-agent
npm install
npm test
npm start
npm run humanmax -- doctor --format json
npm run humanmax -- check --format json
```

Default create path: TypeScript, `tool-agent`, generic fixture, `assisted`, `base`, GitHub CI. Preview does not generate `sg-core`, apply upgrades, or run `adopt`.

Read tools execute. Write tools stop at the action gateway (`review`). `productionEnforcement` stays `unconfigured`.

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

This repository is a multi-agent parallel project. Read `AGENTS.md` and claim a lane before editing. Preferred isolation is a git worktree under `.worktrees/`.

## What this is not

Harness does not enforce production actions, issue certification, or replace IAM, GRC, SIEM, or a secrets manager.

## License

Apache-2.0. See `LICENSE` and `NOTICE`.
