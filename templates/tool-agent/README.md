# `tool-agent`

Preview starter: one read tool plus one reversible write tool. Effectful calls must pass through the action gateway.

`create-humanmax-agent <dir> --defaults` renders this template through `@humanmax/project-generator`. Do not copy an ad-hoc agent project into this directory.

Generated layout:

- `.humanmax/project.yaml` — `template: tool-agent`, `productionEnforcement: unconfigured`, `enforcementAdapter: local-review`
- `.humanmax/generator.lock` — file ownership classes
- `src/index.ts` — fixture run (`runFixture`)
- `src/tools.ts` — `knowledge-read` (read) and `notes-write` (reversible-write)
- `tests/gateway.test.ts` — green fixture plus undeclared-tool deny
- `evals/gateway.eval.ts` — FAIL cannot be rewritten to PASS
- `skills/humanmax-agent-harness/SKILL.md` — calls project-pinned CLI JSON
- `.github/workflows/humanmax.yml` — `npm test`, `humanmax generate --check`, `humanmax check`

Passing those tests is not production enforcement or certification.
