import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  EXIT_CODES,
  PACK_LOCK_API_VERSION,
  PREVIEW_CLI_COMMANDS,
  readCanonicalYaml,
  validate,
  type CliResponse,
  type EffectClass,
  type ResultState,
} from "@humanmax/contracts";
import { evaluate } from "@humanmax/core";
import {
  addEval,
  addTool,
  planUpgrade,
  readProjectSnapshot,
} from "@humanmax/project-generator";
import {
  errorMessage,
  exitCodeForError,
  internalError,
  packTrustError,
  usageError,
} from "./errors.ts";
import { toSarif } from "./sarif.ts";
import { packageVersions } from "./versions.ts";

export const EXIT_USAGE = EXIT_CODES.usage;

export { PREVIEW_CLI_COMMANDS };
export { CliError, exitCodeForError } from "./errors.ts";
export { sarifKind, sarifLevel, toSarif } from "./sarif.ts";
export { packageVersions } from "./versions.ts";

export const OUTPUT_FORMATS = ["terminal", "json", "sarif"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];

/**
 * Only finding-producing commands may emit SARIF. An empty SARIF run from a
 * command that produces no findings would read as a clean scan.
 */
export const SARIF_COMMANDS = ["check", "generate"] as const;

const PACK_LOCK_PATH = ".humanmax/packs.lock";
const TAIL_LINES = 20;

export function previewCommands(): readonly string[] {
  return PREVIEW_CLI_COMMANDS;
}

const usage = `Usage: humanmax <command>

Preview commands: ${PREVIEW_CLI_COMMANDS.join(", ")}

  humanmax doctor [--format terminal|json]
  humanmax check [--format terminal|json|sarif]
  humanmax generate --check [--format terminal|json|sarif]
  humanmax upgrade --dry-run [--format terminal|json]
  humanmax add tool <id> --effect <class> [--dry-run]
  humanmax add eval <id> [--dry-run]
  humanmax test [--format terminal|json]
  humanmax dev [--format terminal|json]

Exit codes: 0 completed, 1 findings or tests met the failure threshold,
2 usage or configuration error, 3 pack trust error, 4 internal failure.

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
    const format = parseFormat(argv, command);
    if (command === "upgrade" && (flags.has("--apply") || !flags.has("--dry-run"))) {
      throw usageError("Preview only supports humanmax upgrade --dry-run.");
    }
    const root = findProjectRoot(io.cwd);
    assertPackLockSupported(root);
    const response = await dispatch(command, positionals.slice(1), flags, root, argv);
    print(io, response, format);
    if (hasPackTrustFailure(response)) {
      return EXIT_CODES.packTrust;
    }
    return response.status === "completed" ? EXIT_CODES.ok : EXIT_CODES.failed;
  } catch (error) {
    io.stderr.write(`${errorMessage(error)}\n`);
    return exitCodeForError(error);
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
      throw usageError("Preview generate only supports --check");
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
    return runProjectTests(root);
  }
  if (command === "dev") {
    const moduleUrl = pathToFileURL(join(root, "src/index.ts")).href;
    const mod = (await import(moduleUrl)) as {
      runFixture?: () => Promise<unknown>;
    };
    if (!mod.runFixture) {
      throw usageError("Generated project does not export runFixture()");
    }
    const result = await mod.runFixture();
    return respond("dev", root, "completed", [result]);
  }
  throw usageError(`Unsupported command: ${command}`);
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
    throw usageError(
      "Usage: humanmax add tool <id> --effect <class> | humanmax add eval <id>",
    );
  }
  if (kind === "eval") {
    const plan = addEval({ destination: root, id, dryRun: flags.has("--dry-run") });
    return respond("add eval", root, "completed", plan.files);
  }
  const effect = flagValue(argv, "--effect") as EffectClass | undefined;
  if (!effect) {
    throw usageError("humanmax add tool requires --effect");
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
      versions: packageVersions(),
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

function runProjectTests(root: string): CliResponse {
  const spawned = spawnSync("npm", ["test"], { cwd: root, encoding: "utf8" });
  if (spawned.error) {
    throw internalError(
      `Could not start the project test runner: ${spawned.error.message}`,
    );
  }
  const exitCode = typeof spawned.status === "number" ? spawned.status : null;
  const signal = spawned.signal ?? null;
  const result: ResultState =
    exitCode === 0 ? "PASS" : exitCode === null ? "UNKNOWN" : "FAIL";
  return respond(
    "test",
    root,
    result === "PASS" ? "completed" : "failed",
    [
      {
        runner: "npm test",
        result,
        exitCode,
        signal,
        stdoutTail: tail(spawned.stdout),
        stderrTail: tail(spawned.stderr),
      },
    ],
    {
      pass: result === "PASS" ? 1 : 0,
      fail: result === "FAIL" ? 1 : 0,
      unknown: result === "UNKNOWN" ? 1 : 0,
      needsHumanReview: 0,
    },
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
  const packLock = join(root, PACK_LOCK_PATH);
  const response: CliResponse = {
    apiVersion: "humanmax.ai/cli-response/v1alpha1",
    kind: "CliResponse",
    command,
    status,
    versions: packageVersions(),
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
    throw internalError(checked.errors.join("; "));
  }
  return response;
}

function print(io: Io, response: CliResponse, format: OutputFormat): void {
  if (format === "json") {
    io.stdout.write(`${JSON.stringify(response)}\n`);
    return;
  }
  if (format === "sarif") {
    io.stdout.write(`${JSON.stringify(toSarif(response))}\n`);
    return;
  }
  const lines = [
    `${response.command}: ${response.status} pass=${response.summary.pass} fail=${response.summary.fail} unknown=${response.summary.unknown} needsHumanReview=${response.summary.needsHumanReview}`,
    ...response.coverage.limitations.map((limitation) => `  limitation: ${limitation}`),
  ];
  io.stdout.write(`${lines.join("\n")}\n`);
}

export function findProjectRoot(start: string): string {
  let dir = resolve(start);
  while (true) {
    if (existsSync(join(dir, ".humanmax/project.yaml"))) {
      return realpathSync(dir);
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw usageError(
        "Not a HumanMax generated project (missing .humanmax/project.yaml)",
      );
    }
    dir = parent;
  }
}

/**
 * The CLI cannot verify a pack lock written against a schema it does not know,
 * so an unsupported lock is a trust failure rather than a finding. Lock content
 * itself stays a Core rule.
 */
function assertPackLockSupported(root: string): void {
  const path = join(root, PACK_LOCK_PATH);
  if (!existsSync(path)) {
    return;
  }
  let parsed: unknown;
  try {
    parsed = readCanonicalYaml(readFileSync(path, "utf8"), { source: path });
  } catch (error) {
    throw packTrustError(
      `Cannot read ${PACK_LOCK_PATH}, so pack trust cannot be established: ${errorMessage(error)}`,
    );
  }
  const apiVersion =
    typeof parsed === "object" && parsed !== null && "apiVersion" in parsed
      ? parsed.apiVersion
      : undefined;
  if (typeof apiVersion === "string" && apiVersion !== PACK_LOCK_API_VERSION) {
    throw packTrustError(
      `${PACK_LOCK_PATH} declares ${apiVersion}; this CLI can only verify ${PACK_LOCK_API_VERSION}.`,
    );
  }
}

function hasPackTrustFailure(response: CliResponse): boolean {
  return response.results.some(
    (item) =>
      typeof item === "object" &&
      item !== null &&
      "ruleId" in item &&
      item.ruleId === "HMX-PACK-001" &&
      "result" in item &&
      item.result === "FAIL",
  );
}

function parseFormat(argv: string[], command: string): OutputFormat {
  const index = argv.indexOf("--format");
  if (index === -1) {
    return "terminal";
  }
  const value = argv[index + 1];
  if (!value || !(OUTPUT_FORMATS as readonly string[]).includes(value)) {
    throw usageError(`--format requires one of: ${OUTPUT_FORMATS.join(", ")}`);
  }
  const format = value as OutputFormat;
  if (format === "sarif" && !(SARIF_COMMANDS as readonly string[]).includes(command)) {
    throw usageError(
      `--format sarif is only available for: ${SARIF_COMMANDS.join(", ")}. Other commands produce no findings, and an empty SARIF run would read as a clean scan.`,
    );
  }
  return format;
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

const OSC_SEQUENCE = /\u001B\][\s\S]*?(?:\u0007|\u001B\\)/g;
const CSI_SEQUENCE = /\u001B\[[0-?]*[ -\/]*[@-~]/g;
const OTHER_ESCAPE = /\u001B[@-Z\\-_]/g;
const CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u009B]/g;

/** Child output reaches the JSON envelope, which must stay free of ANSI text. */
export function stripAnsi(text: string): string {
  return text
    .replace(OSC_SEQUENCE, "")
    .replace(CSI_SEQUENCE, "")
    .replace(OTHER_ESCAPE, "")
    .replace(CONTROL_CHARACTERS, "");
}

function tail(output: string | null | undefined): string[] {
  if (!output) {
    return [];
  }
  const lines = stripAnsi(output)
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line !== "");
  return lines.slice(-TAIL_LINES);
}
