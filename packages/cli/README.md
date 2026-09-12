# `@humanmax/cli`

The project-pinned `humanmax` executable for the TypeScript `tool-agent` Preview. The CLI owns filesystem operations and invokes contracts, Core, and the generator; it does not reimplement assurance rules.

From a generated project, invoke `./node_modules/.bin/humanmax <command>`. Help and version also work outside a project. Older generator output points `npm run humanmax` at an unpublished source file; use the installed binary until that generator script is corrected.

| Command | Behaviour |
|---|---|
| `doctor` | Validate project, tool and agent declarations; report pack trust and generator integrity from Core. |
| `dev` | Validate canonical declarations and tool references, then run the local `runFixture()` entry point in a child process. |
| `add tool <id> --effect <class> --dry-run` | Preview the generator's change set without writes. |
| `add eval <id> --dry-run` | Preview a deterministic eval stub without writes. |
| `add tool …` / `add eval …` | Apply the generator's change set after checking output paths and collisions. `--apply` is also accepted; it never authorizes overwriting an existing component. |
| `generate --check` | Report Core findings and fail if generation evidence is incomplete or checks are unsatisfied. No files are regenerated. |
| `upgrade --dry-run` | List the generator's ownership/action plan. No upgrade is applied. |
| `test` | Run project-owned `npm test` and local eval files; preserve each outcome. Exit nonzero unless all results are PASS. |
| `check` | Run deterministic Core checks. High/critical UNKNOWN remains blocking; other result states remain visible. |

Every command accepts `--help`, `--version`, and `--format terminal|json`. `check` and `generate --check` also accept `--format sarif`. Valued options accept either `--format json` or `--format=json`. Effect classes are `read`, `compute`, `reversible-write`, and `irreversible-write`. Unknown, repeated, incompatible or incomplete options are rejected before any writes.

Terminal output includes results and planned paths. JSON uses the versioned `CliResponse` envelope. Configuration/execution errors after argument parsing also return a failed JSON envelope; syntax errors in arguments and help/version remain plain text. SARIF derives from the same Core findings as JSON; if evaluation cannot run, the command exits nonzero without emitting an empty successful scan.

| Exit | Meaning |
|---|---|
| 0 | Command completed; inspect the summary for remaining review/UNKNOWN states. |
| 1 | Findings, incomplete generation evidence, diagnostics or project tests failed. |
| 2 | Invalid usage, incompatible configuration or unsafe project path. |
| 3 | Pack trust cannot be established or the locked digest does not match. |
| 4 | Unexpected failure, or the fixture exceeded execution/output limits. |

`dev` uses a separate result channel so application stdout cannot corrupt CLI JSON. Application logs are not included in that envelope. Execution is limited to the declared timeout (at most 120 seconds) and 1 MiB of captured output. The child process is **not a sandbox**: project code and dependencies must be trusted. Validation of declarations does not implement the runtime's missing input/output schema resolution or establish exclusive control over arbitrary local code. Production enforcement remains unconfigured in the generated fixture.

CLI-owned reads refuse symbolic links, non-files, oversized files and parent-path escapes. Add commands check all planned destinations before writes. These are local preflight checks, not a transaction or protection against a concurrent malicious filesystem writer. Generator/Core limitations, including upgrade plan completeness for subsequently added files and user-owned-file digest handling, remain owned by those packages.

## Verification

At the harness repository root:

```sh
npm run build
npm test -w @humanmax/cli
npm run typecheck -w @humanmax/cli
node packages/cli/verification/offline.mjs
```

The integration test creates a project, performs a real dependency install and exercises its compiled, project-pinned CLI through doctor, dev, add tool/eval, tests, generate/check, and upgrade preview. It compares complete project files around dry runs.

The offline proof runs on macOS using `sandbox-exec` with `deny network*`. An ordinary connection must succeed and the same connection must fail with EPERM/EACCES in the sandbox before `check` and `generate --check` can count as offline evidence. Other platforms return exit 2 and UNKNOWN; this script does not claim cross-platform network isolation. No project source or findings are uploaded to a HumanMax service.

## Local Preview evals

`humanmax test` imports each top-level `evals/*.eval.ts` in a separate child and invokes its exported `evaluate()` function. Return one contracts `ResultState`: `PASS`, `FAIL`, `UNKNOWN`, or `NEEDS_HUMAN_REVIEW`. Both synchronous and async implementations are supported.

```ts
import { runFixture } from "../src/index.ts";
import type { ResultState } from "@humanmax/contracts";

export async function evaluate(): Promise<ResultState> {
  const run = await runFixture();
  return run.read === "ok" && run.write === "review" && !run.writeExecuted
    && run.productionEnforcement === "unconfigured" ? "PASS" : "FAIL";
}
```

Thrown/rejected evaluations and unsuccessful child exits are FAIL. A missing function, legacy static stub, invalid result, empty eval directory or interrupted evaluation is UNKNOWN. Neither UNKNOWN nor NEEDS_HUMAN_REVIEW permits the test command to exit successfully. Local logs and exception payloads are excluded from the result envelope.

Limits: 64 top-level eval files, 256 KiB source per file, 1 MiB captured output, 10 seconds per child and 30 seconds for the complete eval phase. Children are not a sandbox; execute trusted local project code only. This convention does not add external evaluation providers or evidence services.

Existing generator versions emit static eval objects. These now honestly report UNKNOWN until implemented; this CLI does not silently rewrite user-owned evals or their lock. The generator's planned executable gateway eval is separate pending work, as is Core's treatment of edited user-owned files.
