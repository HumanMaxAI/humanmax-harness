import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  EXIT_CODES,
  PREVIEW_CLI_COMMANDS,
  validate,
  type CliResponse,
  type EffectClass,
} from "@humanmax/contracts";
import { evaluate } from "@humanmax/core";
import {
  addEval,
  addTool,
  planUpgrade,
  readProjectSnapshot,
} from "@humanmax/project-generator";

export const EXIT_USAGE = EXIT_CODES.usage;

export { PREVIEW_CLI_COMMANDS };

export function previewCommands(): readonly string[] {
  return PREVIEW_CLI_COMMANDS;
}

const usage = `Usage: humanmax <command>

Preview commands: ${PREVIEW_CLI_COMMANDS.join(", ")}

  humanmax doctor [--format json]
  humanmax check [--format json]
  humanmax generate --check [--format json]
  humanmax upgrade --dry-run [--format json]
  humanmax add tool <id> --effect <class> [--dry-run]
  humanmax add eval <id> [--dry-run]
  humanmax test [--format json]
  humanmax dev [--format json]

Preview does not apply upgrades, generate sg-core, or claim production enforcement.
`;

type Io = {
  cwd: string;
  stdout: { write(chunk: string): void };
  stderr: { write(chunk: string): void };
};

export async function runCli(argv: string[], io: Io): Promise<number> {
  const { flags, positionals } = parseArgs(argv);
  if (flags.has("-h") || flags.has("--help") || positionals.length === 0) {
    io.stderr.write(usage);
    return EXIT_CODES.usage;
  }
  const command = positionals[0];
  if (!command || !(PREVIEW_CLI_COMMANDS as readonly string[]).includes(command)) {
    io.stderr.write(usage);
    return EXIT_CODES.usage;
  }
  try {
    if (command === "upgrade" && (flags.has("--apply") || !flags.has("--dry-run"))) {
      io.stderr.write("Preview only supports humanmax upgrade --dry-run.\n");
      return EXIT_CODES.usage;
    }
    const root = findProjectRoot(io.cwd);
    const format = flagValue(argv, "--format") ?? "terminal";
    const response = await dispatch(command, positionals.slice(1), flags, root, argv);
    print(io, response, format);
    return response.status === "completed" ? EXIT_CODES.ok : EXIT_CODES.failed;
  } catch (error) {
    io.stderr.write(`${error instanceof Error ? error.message : error}\n`);
    return EXIT_CODES.failed;
  }
}

async function dispatch(
  command: string,
  rest: string[],
  flags: Set<string>,
  root: string,
  argv: string[],
): Promise<CliResponse> {
  if (command === "doctor") {
    return doctor(root);
  }
  if (command === "check") {
    return runCheck(root, "check");
  }
  if (command === "generate") {
    if (!flags.has("--check")) {
      throw new Error("Preview generate only supports --check");
    }
    return runCheck(root, "generate --check");
  }
  if (command === "upgrade") {
    const plan = planUpgrade({ destination: root });
    return respond("upgrade", root, "completed", plan.files, {
      pass: plan.files.filter((file) => file.action === "unchanged").length,
      fail: 0,
      unknown: 0,
      needsHumanReview: plan.files.filter((file) => file.action !== "unchanged").length,
    });
  }
  if (command === "add") {
    return runAdd(root, rest, flags, argv);
  }
  if (command === "test") {
    const spawned = spawnSync("npm", ["test"], { cwd: root, encoding: "utf8" });
    const status = spawned.status === 0 ? "completed" : "failed";
    return respond("test", root, status, [
      { exitCode: spawned.status, stdout: spawned.stdout, stderr: spawned.stderr },
    ]);
  }
  if (command === "dev") {
    const moduleUrl = pathToFileURL(join(root, "src/index.ts")).href;
    const mod = (await import(moduleUrl)) as {
      runFixture?: () => Promise<unknown>;
    };
    if (!mod.runFixture) {
      throw new Error("Generated project does not export runFixture()");
    }
    const result = await mod.runFixture();
    return respond("dev", root, "completed", [result]);
  }
  throw new Error(`Unsupported command: ${command}`);
}

function runAdd(
  root: string,
  rest: string[],
  flags: Set<string>,
  argv: string[],
): CliResponse {
  const kind = rest[0];
  const id = rest[1];
  if ((kind !== "tool" && kind !== "eval") || !id) {
    throw new Error("Usage: humanmax add tool <id> --effect <class> | humanmax add eval <id>");
  }
  if (kind === "eval") {
    const plan = addEval({ destination: root, id, dryRun: flags.has("--dry-run") });
    return respond("add eval", root, "completed", plan.files);
  }
  const effect = flagValue(argv, "--effect") as EffectClass | undefined;
  if (!effect) {
    throw new Error("humanmax add tool requires --effect");
  }
  const plan = addTool({
    destination: root,
    id,
    effect,
    dryRun: flags.has("--dry-run"),
  });
  return respond("add tool", root, "completed", plan.files);
}

function doctor(root: string): CliResponse {
  const snapshot = readProjectSnapshot(root);
  const project = snapshot.project as {
    spec?: {
      generator?: { template?: string };
      runtime?: { productionEnforcement?: string; enforcementAdapter?: string };
      profiles?: string[];
    };
  } | undefined;
  return respond("doctor", root, "completed", [
    {
      template: project?.spec?.generator?.template ?? "unknown",
      profiles: project?.spec?.profiles ?? [],
      productionEnforcement: project?.spec?.runtime?.productionEnforcement ?? "unknown",
      enforcementAdapter: project?.spec?.runtime?.enforcementAdapter ?? "unknown",
    },
  ]);
}

function runCheck(root: string, command: string): CliResponse {
  const snapshot = readProjectSnapshot(root);
  const evaluation = evaluate(snapshot);
  const failed =
    evaluation.summary.fail > 0 ||
    evaluation.findings.some(
      (finding) =>
        finding.result === "UNKNOWN" &&
        (finding.severity === "high" || finding.severity === "critical"),
    );
  return respond(
    command,
    root,
    failed ? "failed" : "completed",
    evaluation.findings,
    evaluation.summary,
  );
}

function respond(
  command: string,
  root: string,
  status: CliResponse["status"],
  results: unknown[],
  summary?: CliResponse["summary"],
): CliResponse {
  const projectYaml = join(root, ".humanmax/project.yaml");
  const packLock = join(root, ".humanmax/packs.lock");
  const response: CliResponse = {
    apiVersion: "humanmax.ai/cli-response/v1alpha1",
    kind: "CliResponse",
    command,
    status,
    versions: { cli: "0.0.0", core: "0.0.0", contracts: "0.0.0" },
    project: {
      root,
      configDigest: digestFile(projectYaml),
      packLockDigest: digestFile(packLock),
    },
    summary: summary ?? {
      pass: status === "completed" ? 1 : 0,
      fail: status === "failed" ? 1 : 0,
      unknown: 0,
      needsHumanReview: 0,
    },
    results,
    coverage: {
      skippedPaths: [],
      limitations: [
        "Preview does not claim production enforcement or certification.",
      ],
    },
  };
  const checked = validate("CliResponse", response);
  if (!checked.ok) {
    throw new Error(checked.errors.join("; "));
  }
  return response;
}

function print(io: Io, response: CliResponse, format: string): void {
  if (format === "json") {
    io.stdout.write(`${JSON.stringify(response)}\n`);
    return;
  }
  io.stdout.write(
    `${response.command}: ${response.status} pass=${response.summary.pass} fail=${response.summary.fail} unknown=${response.summary.unknown}\n`,
  );
}

export function findProjectRoot(start: string): string {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, ".humanmax/project.yaml"))) {
      return realpathSync(dir);
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("Not a HumanMax generated project (missing .humanmax/project.yaml)");
    }
    dir = parent;
  }
}

function parseArgs(argv: string[]): { flags: Set<string>; positionals: string[] } {
  const flags = new Set<string>();
  const positionals: string[] = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg) continue;
    if (arg.startsWith("--") || arg.startsWith("-")) {
      flags.add(arg);
      const next = argv[i + 1];
      if (next && !next.startsWith("-")) {
        i += 1;
      }
      continue;
    }
    positionals.push(arg);
  }
  return { flags, positionals };
}

function flagValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  if (index === -1) return undefined;
  const value = argv[index + 1];
  return value && !value.startsWith("-") ? value : undefined;
}

function digestFile(path: string): string {
  if (!existsSync(path)) {
    return "sha256:missing";
  }
  return `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
}
