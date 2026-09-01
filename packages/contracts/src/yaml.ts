import { Buffer } from "node:buffer";

export type YamlErrorCode =
  | "input-not-a-string"
  | "input-too-large"
  | "too-many-lines"
  | "too-many-nodes"
  | "max-depth-exceeded"
  | "invalid-limit"
  | "invalid-character"
  | "invalid-indentation"
  | "tab-indentation"
  | "missing-key-separator"
  | "duplicate-key"
  | "unterminated-quote"
  | "invalid-escape"
  | "unsafe-number"
  | "multiple-documents"
  | "unsupported-syntax";

export type YamlReadLimits = {
  readonly maxBytes: number;
  readonly maxLines: number;
  readonly maxDepth: number;
  readonly maxNodes: number;
};

export type YamlReadOptions = {
  readonly limits?: Partial<YamlReadLimits>;
  readonly source?: string;
};

export const YAML_READ_LIMITS: YamlReadLimits = Object.freeze({
  maxBytes: 1_048_576,
  maxLines: 20_000,
  maxDepth: 32,
  maxNodes: 50_000,
});

export class YamlParseError extends Error {
  readonly code: YamlErrorCode;
  readonly line: number;
  readonly source: string | undefined;

  constructor(
    code: YamlErrorCode,
    detail: string,
    line = 0,
    source?: string,
  ) {
    const where = [source, line > 0 ? `line ${line}` : undefined]
      .filter((part) => part !== undefined)
      .join(" ");
    super(where === "" ? detail : `${where}: ${detail}`);
    this.name = "YamlParseError";
    this.code = code;
    this.line = line;
    this.source = source;
  }
}

type LogicalLine = {
  indent: number;
  text: string;
  line: number;
};

const CONTROL_CHARACTERS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
const PLAIN_KEY = /^([^\s:#][^:]*?)\s*:(?:\s(.*))?$/;
const QUOTED_KEY_TAIL = /^\s*:(?:\s(.*))?$/;
const INTEGER = /^[-+]?\d+$/;
const NUMBER = /^[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?$/;
const RESERVED_SCALAR_HEADS = new Set([
  "[",
  "]",
  "{",
  "}",
  "&",
  "*",
  "!",
  "%",
  "@",
  "`",
  "|",
  ">",
  ",",
]);
const DOUBLE_QUOTE_ESCAPES = new Map([
  ['"', '"'],
  ["\\", "\\"],
  ["/", "/"],
  ["0", "\0"],
  ["a", "\u0007"],
  ["b", "\b"],
  ["e", "\u001b"],
  ["f", "\f"],
  ["n", "\n"],
  ["r", "\r"],
  ["t", "\t"],
  ["v", "\v"],
  [" ", " "],
]);

/**
 * Parse the canonical YAML subset that HumanMax `.humanmax/` declarations use.
 *
 * The reader is deterministic and side-effect free: it takes a string and never
 * touches the network, the filesystem, or a model. Malformed input throws a
 * {@link YamlParseError} instead of degrading into a partial object, because a
 * silently mis-parsed declaration can turn a real FAIL into an apparent PASS.
 */
export function readCanonicalYaml(
  text: string,
  options: YamlReadOptions = {},
): unknown {
  if (typeof text !== "string") {
    throw new YamlParseError(
      "input-not-a-string",
      "YAML input must be a string",
      0,
      options.source,
    );
  }
  const limits = resolveLimits(options.limits, options.source);
  const source = options.source;

  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > limits.maxBytes) {
    throw new YamlParseError(
      "input-too-large",
      `input is ${bytes} bytes, limit is ${limits.maxBytes}`,
      0,
      source,
    );
  }

  const lines = scan(stripBom(text).replace(/\r\n?/g, "\n"), limits, source);
  if (lines.length === 0) {
    return null;
  }
  return parseDocument(lines, limits, source);
}

function resolveLimits(
  overrides: Partial<YamlReadLimits> | undefined,
  source: string | undefined,
): YamlReadLimits {
  const limits = { ...YAML_READ_LIMITS, ...overrides };
  for (const key of ["maxBytes", "maxLines", "maxDepth", "maxNodes"] as const) {
    const value = limits[key];
    if (!Number.isSafeInteger(value) || value <= 0) {
      throw new YamlParseError(
        "invalid-limit",
        `${key} must be a positive integer`,
        0,
        source,
      );
    }
  }
  return limits;
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function scan(
  text: string,
  limits: YamlReadLimits,
  source: string | undefined,
): LogicalLine[] {
  const raw = text.split("\n");
  if (raw.length > limits.maxLines) {
    throw new YamlParseError(
      "too-many-lines",
      `input has ${raw.length} lines, limit is ${limits.maxLines}`,
      0,
      source,
    );
  }

  const lines: LogicalLine[] = [];
  for (let position = 0; position < raw.length; position += 1) {
    const line = position + 1;
    const original = raw[position] ?? "";
    if (CONTROL_CHARACTERS.test(original)) {
      throw new YamlParseError(
        "invalid-character",
        "control characters are not allowed in a declaration",
        line,
        source,
      );
    }
    const content = stripComment(original, line, source);
    if (content.trim() === "") {
      continue;
    }
    let indent = 0;
    while (content[indent] === " ") {
      indent += 1;
    }
    if (content[indent] === "\t") {
      throw new YamlParseError(
        "tab-indentation",
        "indentation must use spaces, not tabs",
        line,
        source,
      );
    }
    lines.push({ indent, text: content.slice(indent), line });
  }

  const first = lines[0];
  const start = first !== undefined && first.text === "---" ? 1 : 0;
  for (let position = start; position < lines.length; position += 1) {
    const entry = lines[position];
    if (
      entry !== undefined &&
      entry.indent === 0 &&
      (entry.text === "---" || entry.text === "...")
    ) {
      throw new YamlParseError(
        "multiple-documents",
        "only a single YAML document is supported",
        entry.line,
        source,
      );
    }
  }
  return lines.slice(start);
}

function stripComment(
  line: string,
  lineNumber: number,
  source: string | undefined,
): string {
  let quote: '"' | "'" | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quote === '"') {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === '"') {
        quote = undefined;
      }
      continue;
    }
    if (quote === "'") {
      if (char === "'") {
        if (line[index + 1] === "'") {
          index += 1;
          continue;
        }
        quote = undefined;
      }
      continue;
    }
    const previous = index === 0 ? undefined : line[index - 1];
    const atValueStart = index === 0 || previous === " " || previous === "\t";
    if ((char === '"' || char === "'") && atValueStart) {
      quote = char;
      continue;
    }
    if (char === "#" && atValueStart) {
      return trimEnd(line.slice(0, index));
    }
  }
  if (quote !== undefined) {
    throw new YamlParseError(
      "unterminated-quote",
      "quoted scalar is not closed on the same line",
      lineNumber,
      source,
    );
  }
  return trimEnd(line);
}

function trimEnd(value: string): string {
  return value.replace(/[ \t]+$/, "");
}

function parseDocument(
  lines: LogicalLine[],
  limits: YamlReadLimits,
  source: string | undefined,
): unknown {
  let cursor = 0;
  let nodes = 0;

  function fail(code: YamlErrorCode, detail: string, line: number): never {
    throw new YamlParseError(code, detail, line, source);
  }

  function countNode(line: number): void {
    nodes += 1;
    if (nodes > limits.maxNodes) {
      fail(
        "too-many-nodes",
        `document exceeds the ${limits.maxNodes} node limit`,
        line,
      );
    }
  }

  function checkDepth(depth: number, line: number): void {
    if (depth > limits.maxDepth) {
      fail(
        "max-depth-exceeded",
        `nesting is deeper than the ${limits.maxDepth} level limit`,
        line,
      );
    }
  }

  function isSequenceEntry(text: string): boolean {
    return text === "-" || text.startsWith("- ");
  }

  function parseNode(indent: number, depth: number): unknown {
    const line = lines[cursor];
    if (line === undefined) {
      fail("unsupported-syntax", "unexpected end of document", 0);
    }
    checkDepth(depth, line.line);
    return isSequenceEntry(line.text)
      ? parseSequence(indent, depth)
      : parseMapping(indent, depth);
  }

  function parseMapping(
    indent: number,
    depth: number,
  ): Record<string, unknown> {
    const mapping: Record<string, unknown> = {};
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line === undefined || line.indent < indent) {
        break;
      }
      if (line.indent > indent) {
        fail(
          "invalid-indentation",
          `expected indentation ${indent}, found ${line.indent}`,
          line.line,
        );
      }
      if (isSequenceEntry(line.text)) {
        fail(
          "invalid-indentation",
          "sequence entry found where a mapping key was expected",
          line.line,
        );
      }
      const entry = splitKey(line.text);
      if (entry === undefined) {
        fail(
          "missing-key-separator",
          `expected "key: value", found ${JSON.stringify(line.text)}`,
          line.line,
        );
      }
      if (Object.prototype.hasOwnProperty.call(mapping, entry.key)) {
        fail("duplicate-key", `duplicate key ${JSON.stringify(entry.key)}`, line.line);
      }
      countNode(line.line);
      cursor += 1;
      const value =
        entry.rest === ""
          ? parseBlockValue(indent, depth)
          : parseScalar(entry.rest, line.line);
      Object.defineProperty(mapping, entry.key, {
        value,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    return mapping;
  }

  function parseBlockValue(indent: number, depth: number): unknown {
    const next = lines[cursor];
    if (next === undefined) {
      return null;
    }
    if (next.indent > indent) {
      checkDepth(depth + 1, next.line);
      return parseNode(next.indent, depth + 1);
    }
    // A sequence may sit at the same indentation as the key that owns it.
    if (next.indent === indent && isSequenceEntry(next.text)) {
      checkDepth(depth + 1, next.line);
      return parseSequence(indent, depth + 1);
    }
    return null;
  }

  function parseSequence(indent: number, depth: number): unknown[] {
    const items: unknown[] = [];
    while (cursor < lines.length) {
      const line = lines[cursor];
      if (line === undefined || line.indent < indent) {
        break;
      }
      if (line.indent > indent) {
        fail(
          "invalid-indentation",
          `expected indentation ${indent}, found ${line.indent}`,
          line.line,
        );
      }
      if (!isSequenceEntry(line.text)) {
        break;
      }
      countNode(line.line);

      const offset = sequenceContentOffset(line.text);
      const rest = line.text.slice(offset).trim();
      if (rest === "") {
        cursor += 1;
        const next = lines[cursor];
        if (next !== undefined && next.indent > indent) {
          checkDepth(depth + 1, next.line);
          items.push(parseNode(next.indent, depth + 1));
        } else {
          items.push(null);
        }
        continue;
      }

      if (splitKey(rest) === undefined && !isSequenceEntry(rest)) {
        items.push(parseScalar(rest, line.line));
        cursor += 1;
        continue;
      }

      const itemIndent = indent + offset;
      lines[cursor] = { indent: itemIndent, text: rest, line: line.line };
      checkDepth(depth + 1, line.line);
      items.push(parseNode(itemIndent, depth + 1));
    }
    return items;
  }

  function parseScalar(text: string, line: number): unknown {
    const head = text[0];
    if (head === '"') {
      return parseQuoted(text, line, '"');
    }
    if (head === "'") {
      return parseQuoted(text, line, "'");
    }
    if (text === "[]") {
      return [];
    }
    if (text === "{}") {
      return {};
    }
    if (head !== undefined && RESERVED_SCALAR_HEADS.has(head)) {
      fail(
        "unsupported-syntax",
        `scalars starting with ${JSON.stringify(head)} are not supported; quote the value`,
        line,
      );
    }
    if (text === "~" || text === "null" || text === "Null" || text === "NULL") {
      return null;
    }
    if (text === "true" || text === "True" || text === "TRUE") {
      return true;
    }
    if (text === "false" || text === "False" || text === "FALSE") {
      return false;
    }
    if (INTEGER.test(text)) {
      const value = Number(text);
      if (!Number.isSafeInteger(value)) {
        fail(
          "unsafe-number",
          `integer ${text} cannot be represented exactly; quote it to keep it a string`,
          line,
        );
      }
      return value;
    }
    if (NUMBER.test(text)) {
      const value = Number(text);
      if (!Number.isFinite(value)) {
        fail(
          "unsafe-number",
          `number ${text} is not finite; quote it to keep it a string`,
          line,
        );
      }
      return value;
    }
    return text;
  }

  function parseQuoted(text: string, line: number, quote: '"' | "'"): string {
    let out = "";
    let index = 1;
    while (index < text.length) {
      const char = text[index];
      if (quote === '"' && char === "\\") {
        const escape = text[index + 1];
        if (escape === undefined) {
          fail("unterminated-quote", "escape sequence is truncated", line);
        }
        if (escape === "u") {
          const hex = text.slice(index + 2, index + 6);
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            fail("invalid-escape", `invalid \\u escape ${JSON.stringify(hex)}`, line);
          }
          out += String.fromCharCode(Number.parseInt(hex, 16));
          index += 6;
          continue;
        }
        const mapped = DOUBLE_QUOTE_ESCAPES.get(escape);
        if (mapped === undefined) {
          fail("invalid-escape", `unsupported escape \\${escape}`, line);
        }
        out += mapped;
        index += 2;
        continue;
      }
      if (char === quote) {
        if (quote === "'" && text[index + 1] === "'") {
          out += "'";
          index += 2;
          continue;
        }
        break;
      }
      out += char;
      index += 1;
    }
    if (index >= text.length) {
      fail("unterminated-quote", "quoted scalar is not closed", line);
    }
    if (index !== text.length - 1) {
      fail(
        "unsupported-syntax",
        "unexpected content after a quoted scalar",
        line,
      );
    }
    return out;
  }

  const root = lines[0];
  if (root === undefined) {
    return null;
  }
  const value = parseNode(root.indent, 1);
  const trailing = lines[cursor];
  if (trailing !== undefined) {
    fail(
      "invalid-indentation",
      `expected indentation ${root.indent}, found ${trailing.indent}`,
      trailing.line,
    );
  }
  return value;
}

function sequenceContentOffset(text: string): number {
  let offset = 1;
  while (text[offset] === " ") {
    offset += 1;
  }
  return offset;
}

function splitKey(text: string): { key: string; rest: string } | undefined {
  const head = text[0];
  if (head === '"' || head === "'") {
    const end = findClosingQuote(text, head);
    if (end === undefined) {
      return undefined;
    }
    const tail = QUOTED_KEY_TAIL.exec(text.slice(end + 1));
    if (tail === null) {
      return undefined;
    }
    return {
      key: decodeQuotedKey(text.slice(0, end + 1), head),
      rest: (tail[1] ?? "").trim(),
    };
  }
  const match = PLAIN_KEY.exec(text);
  if (match === null) {
    return undefined;
  }
  return { key: (match[1] ?? "").trim(), rest: (match[2] ?? "").trim() };
}

function findClosingQuote(text: string, quote: '"' | "'"): number | undefined {
  let index = 1;
  while (index < text.length) {
    const char = text[index];
    if (quote === '"' && char === "\\") {
      index += 2;
      continue;
    }
    if (char === quote) {
      if (quote === "'" && text[index + 1] === "'") {
        index += 2;
        continue;
      }
      return index;
    }
    index += 1;
  }
  return undefined;
}

function decodeQuotedKey(text: string, quote: '"' | "'"): string {
  const inner = text.slice(1, -1);
  return quote === "'"
    ? inner.replaceAll("''", "'")
    : inner.replaceAll("\\\\", "\\").replaceAll('\\"', '"');
}
