import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, realpathSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import {
  EXIT_CODES,
  PACK_LOCK_API_VERSION,
  PREVIEW_CLI_COMMANDS,
  readCanonicalYaml,
  validate,
  type CliResponse,
  type EffectClass,
  type ResultState,
  YamlParseError,
} from "@humanmax/contracts";
import { evaluate } from "@humanmax/core";
import {
  addEval,
  addTool,
  planUpgrade,
  generateProject,
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
import { projectPath, readProjectFile, snapshotProject, validateDeclarations } from "./project.ts";
import { runFixture } from "./fixture.ts";
import { runEvals } from "./evals.ts";
import { parseArgs, type OutputFormat } from "./args.ts";
export { OUTPUT_FORMATS, SARIF_COMMANDS } from "./args.ts";
export type { OutputFormat } from "./args.ts";

export const EXIT_USAGE = EXIT_CODES.usage;

export { PREVIEW_CLI_COMMANDS };
export { CliError, exitCodeForError } from "./errors.ts";
export { sarifKind, sarifLevel, toSarif } from "./sarif.ts";
export { packageVersions } from "./versions.ts";

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
  let request: ReturnType<typeof parseArgs> | undefined;
  try {
    const parsed = parseArgs(argv);
    request = parsed;
    const { command, flags, format } = parsed;
    if (flags.has("--help")) {
      io.stdout.write(usage);
      return EXIT_CODES.ok;
    }
    if (flags.has("--version")) {
      io.stdout.write(`${packageVersions().cli}\n`);
      return EXIT_CODES.ok;
    }
    const root = findProjectRoot(io.cwd);
    assertPackLockSupported(root);
    const response = await dispatch(command, parsed.rest, flags, root, parsed.effect);
    print(io, response, format);
    if (hasPackTrustFailure(response)) {
      return EXIT_CODES.packTrust;
    }
    return response.status === "completed" ? EXIT_CODES.ok : EXIT_CODES.failed;
  } catch (error) {
    const failure = error instanceof YamlParseError ? usageError(error.message) : error;
    const code = exitCodeForError(failure);
    const message = stripAnsi(errorMessage(failure));
    io.stderr.write(`${message}\n`);
    if (request?.format === "json") {
      const response: CliResponse = {
        apiVersion: "humanmax.ai/cli-response/v1alpha1", kind: "CliResponse",
        command: request.command, status: "failed", versions: packageVersions(),
        project: { root: resolve(io.cwd), configDigest: "sha256:unavailable", packLockDigest: "sha256:unavailable" },
        summary: { pass: 0, fail: code === EXIT_CODES.internal ? 0 : 1, unknown: code === EXIT_CODES.internal ? 1 : 0, needsHumanReview: 0 },
        results: [{ result: code === EXIT_CODES.internal ? "UNKNOWN" : "FAIL", exitCode: code, message }],
        coverage: { skippedPaths: [], limitations: ["Command did not complete; no successful check is evidenced."] },
      };
      print(io, response, "json");
    }
    return code;
  }
}

async function dispatch(
  command: string,
  rest: string[],
  flags: Set<string>,
  root: string,
  effect: EffectClass | undefined,
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
    snapshotProject(root);
    const preview = generateProject({ destination: root, name: basename(root), dryRun: true });
    for (const file of preview.files) readProjectFile(root, file.path);
    const plan = planUpgrade({ destination: root });
    return respond("upgrade", root, "completed", plan.files, {
      pass: plan.files.filter((file) => file.action === "unchanged").length,
      fail: 0,
      unknown: 0,
      needsHumanReview: plan.files.filter((file) => file.action !== "unchanged").length,
    });
  }
  if (command === "add") {
    return runAdd(root, rest, flags, effect);
  }
  if (command === "test") {
    return runProjectTests(root);
  }
  if (command === "dev") {
    const snapshot = snapshotProject(root);
    const project = validateDeclarations(root, snapshot);
    const evaluation = evaluate({ ...snapshot, generatorLock: undefined });
    if (evaluation.findings.some((finding) => finding.result !== "PASS")) {
      return respond("dev", root, "failed", evaluation.findings, evaluation.summary);
    }
    projectPath(root, "src/index.ts");
    const result = runFixture(root, project.spec.runtime.defaultBudgets.timeoutSeconds);
    return respond("dev", root, "completed", [result]);
  }
  throw usageError(`Unsupported command: ${command}`);
}

function runAdd(
  root: string,
  rest: string[],
  flags: Set<string>,
  effect: EffectClass | undefined,
): CliResponse {
  const kind = rest[0];
  const id = rest[1];
  if ((kind !== "tool" && kind !== "eval") || !id) {
    throw usageError(
      "Usage: humanmax add tool <id> --effect <class> | humanmax add eval <id>",
    );
  }
  const snapshot = snapshotProject(root);
  validateDeclarations(root, snapshot);
  const target = kind === "tool" ? `.humanmax/tools/${id}.tool.yaml` : `evals/${id}.eval.ts`;
  if (readProjectFile(root, target) !== undefined) throw usageError(`Component already exists: ${id}`);
  for (const path of ["src/tools.ts", ".humanmax/agents/default.agent.yaml", ".humanmax/generator.lock"]) {
    readProjectFile(root, path);
  }
  if (kind === "eval") {
    const plan = addEval({ destination: root, id, dryRun: flags.has("--dry-run") });
    return respond("add eval", root, "completed", plan.files);
  }
  if (!effect) {
    throw usageError("humanmax add tool requires --effect");
  }
  const request = { destination: root, id, effect };
  const preview = addTool({ ...request, dryRun: true });
  for (const file of preview.files) {
    const existing = readProjectFile(root, file.path);
    if (existing !== undefined && file.path !== "src/tools.ts" && file.path !== ".humanmax/agents/default.agent.yaml") {
      throw usageError(`Refusing to overwrite existing file: ${file.path}`);
    }
  }
  const plan = flags.has("--dry-run") ? preview : addTool(request);
  return respond("add tool", root, "completed", plan.files);
}

function doctor(root: string): CliResponse {
  const snapshot = snapshotProject(root);
  const evaluation = evaluate({ ...snapshot, generatorLock: snapshot.generatorLock ?? {} });
  let project;
  let diagnostic;
  try {
    project = validateDeclarations(root, snapshot);
  } catch (error) {
    if (exitCodeForError(error) !== EXIT_CODES.usage && !(error instanceof YamlParseError)) throw error;
    diagnostic = { result: "FAIL", message: errorMessage(error) };
  }
  const summary = { ...evaluation.summary };
  if (diagnostic) summary.fail += 1;
  return respond("doctor", root,
    summary.fail || summary.unknown || summary.needsHumanReview ? "failed" : "completed",
    [{
      template: project?.spec.generator.template ?? "unknown",
      profiles: project?.spec.profiles ?? [],
      productionEnforcement: project?.spec.runtime.productionEnforcement ?? "unknown",
      enforcementAdapter: project?.spec.runtime.enforcementAdapter ?? "unknown",
      versions: packageVersions(),
    }, ...evaluation.findings, ...(diagnostic ? [diagnostic] : [])], summary);
}

function runCheck(root: string, command: string): CliResponse {
  const snapshot = snapshotProject(root);
  const evaluation = evaluate({ ...snapshot, generatorLock: snapshot.generatorLock ?? {} });
  const failed =
    evaluation.summary.fail > 0 ||
    (command === "generate --check" && evaluation.findings.some((finding) => finding.result !== "PASS")) ||
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
  const results = [
    {
      runner: "npm test", result, exitCode, signal,
      stdoutTail: tail(spawned.stdout), stderrTail: tail(spawned.stderr),
    },
    ...runEvals(root),
  ];
  const summary = {
    pass: results.filter(item => item.result === "PASS").length,
    fail: results.filter(item => item.result === "FAIL").length,
    unknown: results.filter(item => item.result === "UNKNOWN").length,
    needsHumanReview: results.filter(item => item.result === "NEEDS_HUMAN_REVIEW").length,
  };
  return respond("test", root, results.every(item => item.result === "PASS") ? "completed" : "failed", results, summary);
}

function respond(
  command: string,
  root: string,
  status: CliResponse["status"],
  results: unknown[],
  summary?: CliResponse["summary"],
): CliResponse {
  const response: CliResponse = {
    apiVersion: "humanmax.ai/cli-response/v1alpha1",
    kind: "CliResponse",
    command,
    status,
    versions: packageVersions(),
    project: {
      root,
      configDigest: digestFile(root, ".humanmax/project.yaml"),
      packLockDigest: digestFile(root, PACK_LOCK_PATH),
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
    ...response.results.map((result) => `  ${stripAnsi(JSON.stringify(result))}`),
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
  let parsed: unknown;
  try {
    const text = readProjectFile(root, PACK_LOCK_PATH);
    if (text === undefined) return;
    parsed = readCanonicalYaml(text, { source: PACK_LOCK_PATH });
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

function digestFile(root: string, path: string): string {
  const text = readProjectFile(root, path);
  if (text === undefined) {
    return "sha256:missing";
  }
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

/** Child output reaches the JSON envelope, which must stay free of ANSI text. */
export function stripAnsi(text: string): string {
  const clean: string[] = [];
  let index = 0;
  while (index < text.length) {
    const code = text.charCodeAt(index);
    if (code === 0x1b) {
      const kind = text[index + 1];
      if (kind === "]") {
        const end = oscEnd(text, index + 2);
        if (end !== undefined) {
          index = end;
          continue;
        }
        appendVisible(text, index + 2, clean);
        break;
      }
      if (kind === "[") {
        const end = csiEnd(text, index + 2);
        if (end !== undefined) {
          index = end;
          continue;
        }
        index += 2;
        continue;
      }
      index += kind === undefined ? 1 : 2;
      continue;
    }
    if (!isStrippedControl(code)) clean.push(text[index]!);
    index += 1;
  }
  return clean.join("");
}

function oscEnd(text: string, start: number): number | undefined {
  for (let index = start; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code === 0x07) return index + 1;
    if (code === 0x1b && text[index + 1] === "\\") return index + 2;
  }
  return undefined;
}

function csiEnd(text: string, start: number): number | undefined {
  let index = start;
  while (index < text.length && inRange(text.charCodeAt(index), 0x30, 0x3f)) index += 1;
  while (index < text.length && inRange(text.charCodeAt(index), 0x20, 0x2f)) index += 1;
  return index < text.length && inRange(text.charCodeAt(index), 0x40, 0x7e) ? index + 1 : undefined;
}

function appendVisible(text: string, start: number, output: string[]): void {
  let index = start;
  while (index < text.length) {
    const code = text.charCodeAt(index);
    if (code === 0x1b) {
      index += text[index + 1] === undefined ? 1 : 2;
      continue;
    }
    if (!isStrippedControl(code)) output.push(text[index]!);
    index += 1;
  }
}

function isStrippedControl(code: number): boolean {
  return (code >= 0x00 && code <= 0x08) || code === 0x0b || code === 0x0c ||
    (code >= 0x0e && code <= 0x1f) || code === 0x7f || code === 0x9b;
}

function inRange(value: number, low: number, high: number): boolean {
  return value >= low && value <= high;
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
