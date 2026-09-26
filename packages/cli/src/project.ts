import { closeSync, constants, fstatSync, lstatSync, openSync, readSync, readdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { readCanonicalYaml, validate, YamlParseError, type HarnessProject } from "@humanmax/contracts";
import { readProjectSnapshot, type ProjectSnapshot } from "@humanmax/project-generator";
import { usageError } from "./errors.ts";

const MAX_BYTES = 256 * 1024;
const MAX_DECLARATIONS = 256;

/** CLI-owned reads and write previews cannot follow project-controlled links. */
export function projectPath(root: string, path: string): string {
  const parts = path.replaceAll("\\", "/").split("/");
  if (isAbsolute(path) || parts.includes("..") || path.includes("\0") || !path) {
    throw usageError("Path escapes the project boundary");
  }
  let full = root;
  for (const [index, part] of parts.entries()) {
    full = join(full, part);
    const stat = lstatSync(full, { throwIfNoEntry: false });
    if (!stat) continue;
    if (stat.isSymbolicLink()) throw usageError(`Refusing symbolic link: ${path}`);
    if (index < parts.length - 1 && !stat.isDirectory()) throw usageError(`Not a directory: ${path}`);
  }
  return full;
}

export function readProjectFile(root: string, path: string): string | undefined {
  const full = projectPath(root, path);
  let fd: number;
  try {
    fd = openSync(full, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    if (isErrno(error, "ENOENT")) return undefined;
    if (isErrno(error, "ELOOP")) throw usageError(`Refusing symbolic link: ${path}`);
    throw error;
  }
  try {
    const stat = fstatSync(fd);
    if (!stat.isFile()) throw usageError(`Refusing non-file: ${path}`);
    if (stat.size > MAX_BYTES) throw usageError(`File exceeds ${MAX_BYTES} bytes: ${path}`);
    const buffer = Buffer.alloc(MAX_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      const count = readSync(fd, buffer, length, buffer.length - length, null);
      if (!count) break;
      length += count;
    }
    if (length > MAX_BYTES) throw usageError(`File exceeds ${MAX_BYTES} bytes: ${path}`);
    return buffer.subarray(0, length).toString("utf8");
  } finally {
    closeSync(fd);
  }
}

function isErrno(error: unknown, code: string): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error && error.code === code;
}

export function snapshotProject(root: string): ProjectSnapshot {
  try {
    const text = readProjectFile(root, ".humanmax/generator.lock");
    if (text !== undefined) {
      const lock: unknown = JSON.parse(text);
      if (!isRecord(lock) || (lock.files !== undefined && (!isRecord(lock.files) ||
          Object.values(lock.files).some((entry) => !isRecord(entry))))) {
        throw usageError("Invalid .humanmax/generator.lock file map");
      }
    }
    return readProjectSnapshot(root);
  } catch (error) {
    if (error instanceof YamlParseError || error instanceof SyntaxError ||
        (error instanceof Error && error.name === "UnsafePathError")) {
      throw usageError(error.message);
    }
    throw error;
  }
}

export function validateDeclarations(root: string, snapshot: ProjectSnapshot): HarnessProject {
  const checked = validate("HarnessProject", snapshot.project);
  if (!checked.ok) throw usageError(checked.errors.join("; "));
  const project = checked.value;
  if (project.spec.generator.template !== "tool-agent" || project.spec.generator.language !== "typescript" ||
      project.spec.profiles.length !== 1 || project.spec.profiles[0] !== "base") {
    throw usageError("Preview supports TypeScript tool-agent with the base profile only");
  }
  // These IDs are only a cross-reference check, never an execution registry.
  const toolIds = new Set<string>();
  for (const declaration of snapshot.tools) {
    const tool = validate("Tool", declaration);
    if (!tool.ok) throw usageError(tool.errors.join("; "));
    if (toolIds.has(tool.value.metadata.id)) throw usageError(`Duplicate tool: ${tool.value.metadata.id}`);
    toolIds.add(tool.value.metadata.id);
  }
  const dir = projectPath(root, ".humanmax/agents");
  if (!lstatSync(dir, { throwIfNoEntry: false })?.isDirectory()) throw usageError("Missing .humanmax/agents directory");
  const files = readdirSync(dir).filter((name) => /\.ya?ml$/.test(name)).sort();
  if (!files.length || files.length > MAX_DECLARATIONS) throw usageError("Expected 1–256 agent declarations");
  const agentIds = new Set<string>();
  for (const name of files) {
    const path = `.humanmax/agents/${name}`;
    const text = readProjectFile(root, path);
    const result = validate("Agent", readCanonicalYaml(text ?? "", { source: path }));
    if (!result.ok) throw usageError(`${path}: ${result.errors.join("; ")}`);
    if (agentIds.has(result.value.metadata.id)) throw usageError(`Duplicate agent: ${result.value.metadata.id}`);
    agentIds.add(result.value.metadata.id);
    for (const id of result.value.spec.tools) {
      if (!toolIds.has(id)) throw usageError(`${path} references undeclared tool: ${id}`);
    }
  }
  if (!agentIds.has("default")) throw usageError("Preview requires the default agent declaration");
  return project;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
