/** Finite, local JSON Schema 2020-12 subset for candidate answers. */
type JsonObject = Record<string, unknown>;
const KEYS = new Set(["$schema", "$id", "$defs", "$ref", "title", "description", "type", "enum", "const", "properties", "required", "additionalProperties", "items", "minItems", "maxItems", "minLength", "maxLength", "minimum", "maximum"]);
const TYPES = new Set(["null", "boolean", "object", "array", "number", "integer", "string"]);
const isObject = (value: unknown): value is JsonObject => typeof value === "object" && value !== null && !Array.isArray(value);

export function canonicalJson(value: unknown): string {
  const seen = new WeakSet<object>();
  function walk(item: unknown, depth: number): unknown {
    if (depth > 32) throw new Error("value-depth-exceeded");
    if (item === null || typeof item === "string" || typeof item === "boolean") return item;
    if (typeof item === "number" && Number.isFinite(item)) return item;
    if (typeof item !== "object") throw new Error("unsupported-json-value");
    if (seen.has(item)) throw new Error("cyclic-json-value");
    seen.add(item);
    const result = Array.isArray(item) ? item.map(child => walk(child, depth + 1)) :
      Object.fromEntries(Object.keys(item as JsonObject).sort().map(key => [key, walk((item as JsonObject)[key], depth + 1)]));
    seen.delete(item);
    return result;
  }
  return JSON.stringify(walk(value, 0));
}

export function assertSupportedOutputSchema(schema: unknown): void {
  if (Buffer.byteLength(canonicalJson(schema), "utf8") > 64 * 1024) throw new Error("output-schema-too-large");
  const root = schema;
  let nodes = 0;
  const visiting = new Set<unknown>();
  function visit(node: unknown, depth: number): void {
    if (++nodes > 1000 || depth > 24) throw new Error("output-schema-complexity-exceeded");
    if (typeof node === "boolean") return;
    if (!isObject(node)) throw new Error("output-schema-node-invalid");
    if (visiting.has(node)) throw new Error("output-schema-cycle");
    visiting.add(node);
    for (const key of Object.keys(node)) if (!KEYS.has(key)) throw new Error("output-schema-keyword-unsupported");
    if (node.$schema !== undefined && node.$schema !== "https://json-schema.org/draft/2020-12/schema") throw new Error("output-schema-dialect-unsupported");
    if (node.$id !== undefined && (typeof node.$id !== "string" || !node.$id.startsWith("https://"))) throw new Error("output-schema-id-unsupported");
    if (node.type !== undefined && (typeof node.type !== "string" || !TYPES.has(node.type))) throw new Error("output-schema-type-unsupported");
    for (const key of ["title", "description"] as const) if (node[key] !== undefined && typeof node[key] !== "string") throw new Error("output-schema-metadata-invalid");
    for (const key of ["minItems", "maxItems", "minLength", "maxLength"] as const) if (node[key] !== undefined && (!Number.isSafeInteger(node[key]) || (node[key] as number) < 0)) throw new Error("output-schema-bound-invalid");
    for (const key of ["minimum", "maximum"] as const) if (node[key] !== undefined && (typeof node[key] !== "number" || !Number.isFinite(node[key]))) throw new Error("output-schema-bound-invalid");
    if (node.enum !== undefined && (!Array.isArray(node.enum) || node.enum.length === 0)) throw new Error("output-schema-enum-invalid");
    if (node.const !== undefined) canonicalJson(node.const);
    if (node.enum !== undefined) for (const entry of node.enum as unknown[]) canonicalJson(entry);
    if (node.required !== undefined && (!Array.isArray(node.required) || !node.required.every(v => typeof v === "string") || new Set(node.required).size !== node.required.length)) throw new Error("output-schema-required-invalid");
    if (node.$defs !== undefined && !isObject(node.$defs)) throw new Error("output-schema-defs-invalid");
    if (node.properties !== undefined && !isObject(node.properties)) throw new Error("output-schema-properties-invalid");
    if (node.$ref !== undefined) {
      if (typeof node.$ref !== "string" || !/^#\/\$defs\/[A-Za-z0-9_-]+$/.test(node.$ref)) throw new Error("output-schema-ref-unsupported");
      const name = node.$ref.slice("#/$defs/".length);
      if (!isObject(root) || !isObject(root.$defs) || !(name in root.$defs)) throw new Error("output-schema-ref-missing");
      visit(root.$defs[name], depth + 1);
    }
    for (const key of ["$defs", "properties"] as const) {
      if (isObject(node[key])) for (const child of Object.values(node[key])) visit(child, depth + 1);
    }
    for (const key of ["items", "additionalProperties"] as const) if (node[key] !== undefined) visit(node[key], depth + 1);
    visiting.delete(node);
  }
  visit(schema, 0);
}

export type OutputValidation = { ok: true } | { ok: false; reasonCodes: string[] };

export function validateStructuredOutput(schema: unknown, value: unknown): OutputValidation {
  assertSupportedOutputSchema(schema);
  const root = schema;
  let visited = 0;
  const active = new Set<unknown>();
  function matches(node: unknown, candidate: unknown, depth: number): boolean {
    if (++visited > 10000 || depth > 32) return false;
    if (typeof node === "boolean") return node;
    if (!isObject(node)) return false;
    if (node.$ref !== undefined) {
      const name = (node.$ref as string).slice("#/$defs/".length);
      if (!isObject(root) || !isObject(root.$defs) || !matches(root.$defs[name], candidate, depth + 1)) return false;
    }
    if (node.type !== undefined) {
      const type = node.type;
      const valid = type === "null" ? candidate === null : type === "array" ? Array.isArray(candidate) :
        type === "object" ? isObject(candidate) : type === "integer" ? Number.isSafeInteger(candidate) :
        type === "number" ? typeof candidate === "number" && Number.isFinite(candidate) : typeof candidate === type;
      if (!valid) return false;
    }
    if (node.const !== undefined && canonicalJson(candidate) !== canonicalJson(node.const)) return false;
    if (Array.isArray(node.enum) && !node.enum.some(v => canonicalJson(candidate) === canonicalJson(v))) return false;
    if (typeof candidate === "string") {
      if (node.minLength !== undefined && candidate.length < (node.minLength as number)) return false;
      if (node.maxLength !== undefined && candidate.length > (node.maxLength as number)) return false;
    }
    if (typeof candidate === "number") {
      if (node.minimum !== undefined && candidate < (node.minimum as number)) return false;
      if (node.maximum !== undefined && candidate > (node.maximum as number)) return false;
    }
    if (candidate !== null && typeof candidate === "object") {
      if (active.has(candidate)) return false;
      active.add(candidate);
      try {
        if (Array.isArray(candidate)) {
          if (node.minItems !== undefined && candidate.length < (node.minItems as number)) return false;
          if (node.maxItems !== undefined && candidate.length > (node.maxItems as number)) return false;
          if (node.items !== undefined && !candidate.every(v => matches(node.items, v, depth + 1))) return false;
        } else {
          const object = candidate as JsonObject;
          if (Array.isArray(node.required) && !node.required.every(k => Object.hasOwn(object, k))) return false;
          const props = isObject(node.properties) ? node.properties : {};
          for (const [key, entry] of Object.entries(object)) {
            const child = Object.hasOwn(props, key) ? props[key] : node.additionalProperties;
            if (child !== undefined && !matches(child, entry, depth + 1)) return false;
          }
        }
      } finally { active.delete(candidate); }
    }
    return true;
  }
  try {
    return matches(schema, value, 0) ? { ok: true } : { ok: false, reasonCodes: ["output-schema-invalid"] };
  } catch { return { ok: false, reasonCodes: ["output-json-invalid"] }; }
}
