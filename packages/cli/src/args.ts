import { EFFECT_CLASSES, PREVIEW_CLI_COMMANDS, type EffectClass } from "@humanmax/contracts";
import { usageError } from "./errors.ts";

export const OUTPUT_FORMATS = ["terminal", "json", "sarif"] as const;
export type OutputFormat = (typeof OUTPUT_FORMATS)[number];
export const SARIF_COMMANDS = ["check", "generate"] as const;

export type Arguments = {
  command: string;
  rest: string[];
  flags: Set<string>;
  format: OutputFormat;
  effect?: EffectClass;
};

export function parseArgs(argv: string[]): Arguments {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const positionals: string[] = [];
  const booleans = ["--help", "--version", "--check", "--dry-run", "--apply"];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("-")) {
      positionals.push(arg);
      continue;
    }
    const [raw, ...parts] = arg.split("=");
    const name = raw === "-h" ? "--help" : raw === "-v" ? "--version" : raw!;
    if (!booleans.includes(name) && name !== "--format" && name !== "--effect") {
      throw usageError(`Unknown option: ${name}`);
    }
    if (flags.has(name)) throw usageError(`Duplicate option: ${name}`);
    flags.add(name);
    if (booleans.includes(name)) {
      if (parts.length) throw usageError(`${name} takes no value`);
      continue;
    }
    const value = parts.length ? parts.join("=") : argv[++i];
    if (!value || value.startsWith("-")) throw usageError(`${name} requires a value`);
    values.set(name, value);
  }
  const command = positionals[0] ?? "";
  if (command && !(PREVIEW_CLI_COMMANDS as readonly string[]).includes(command)) {
    throw usageError(`Unknown command: ${command}`);
  }
  const format = values.get("--format") ?? "terminal";
  if (!(OUTPUT_FORMATS as readonly string[]).includes(format)) {
    throw usageError(`--format requires one of: ${OUTPUT_FORMATS.join(", ")}`);
  }
  const result: Arguments = { command, rest: positionals.slice(1), flags, format: format as OutputFormat };
  if (flags.has("--help") || flags.has("--version")) return result;
  if (!command) throw usageError("Usage: humanmax <command>; use --help for Preview commands.");
  const allowed = new Set(["--format"]);
  if (command === "generate") allowed.add("--check");
  if (command === "upgrade" || command === "add") allowed.add("--dry-run");
  if (command === "add") {
    allowed.add("--apply");
    if (result.rest[0] === "tool") allowed.add("--effect");
  }
  for (const flag of flags) {
    if (!allowed.has(flag)) throw usageError(`${flag} is not supported for ${command}`);
  }
  if (format === "sarif" && !(SARIF_COMMANDS as readonly string[]).includes(command)) {
    throw usageError("--format sarif is only available for check and generate --check");
  }
  if (command === "generate" && !flags.has("--check")) throw usageError("Preview generate only supports --check");
  if (command === "upgrade" && !flags.has("--dry-run")) throw usageError("Preview only supports humanmax upgrade --dry-run");
  if (command !== "add" && result.rest.length) throw usageError(`${command} takes no positional arguments`);
  if (command === "add") {
    const [kind, id] = result.rest;
    if (result.rest.length !== 2 || (kind !== "tool" && kind !== "eval") || !id) {
      throw usageError("Usage: humanmax add tool <id> --effect <class> | humanmax add eval <id>");
    }
    if (!/^[a-z][a-z0-9-]*$/.test(id)) throw usageError(`Invalid identifier: ${id}`);
    if (flags.has("--apply") && flags.has("--dry-run")) throw usageError("--apply and --dry-run cannot be combined");
    if (kind === "tool") {
      const effect = values.get("--effect");
      if (!effect || !(EFFECT_CLASSES as readonly string[]).includes(effect)) {
        throw usageError(`--effect requires one of: ${EFFECT_CLASSES.join(", ")}`);
      }
      result.effect = effect as EffectClass;
    }
  }
  return result;
}
