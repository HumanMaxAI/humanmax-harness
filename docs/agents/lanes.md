# Lanes

Each lane has one active writer. The binding rules are in `/AGENTS.md`.

| Lane | Write set | Notes |
|---|---|---|
| `contracts` | `packages/contracts/**` | Schema and public types. Other lanes depend on this. Change it first, in isolation. |
| `runtime` | `packages/runtime-harness/**` | Mechanics and the action-gateway seam. No production authority. |
| `generator` | `packages/project-generator/**`, `packages/create-humanmax-agent/**`, `templates/**`, `profiles/**` | Deterministic generation only. No hidden Core writes. |
| `cli` | `packages/cli/**` | Filesystem, prompts, output formats. Calls other packages. Does not reimplement Core rules. |
| `core` | `packages/core/**`, `packages/findings/**`, `packs/**` | Pure evaluation. No network, no model, no filesystem writes. |
| `skill` | `skills/**` | Invokes CLI JSON. Does not embed the rule catalogue. |
| `docs` | `docs/**` | Design, reviews, agent ops, guides. Does not rewrite implementation to match a review. |
| `ci` | `.github/**` | Thin wrappers over workspace scripts and the released CLI. |

## Shared files

Only one agent may edit these shared files at a time. Use a coordinator when possible:

- `AGENTS.md`
- `CLAUDE.md`
- `package.json`
- `package-lock.json`
- `tsconfig.base.json`
- `.gitignore`
- `LICENSE`, `NOTICE`, `GOVERNANCE.md`, `CONTRIBUTING.md`, `SECURITY.md`

Each commit may only add its own `CHANGELOG.md` entries. Each lane adds its own bullets. Do not rewrite another lane's dated entry.

## Conflict rule

If two tasks need the same lane, run the tasks sequentially. Split the second task or wait. Different subfolders do not permit two writers in one lane.
