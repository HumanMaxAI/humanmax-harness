export function parseSimpleYaml(text: string): unknown {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "" && !line.trim().startsWith("#"));
  if (lines.length === 0) {
    return {};
  }
  let index = 0;

  function indentOf(line: string): number {
    const match = line.match(/^ */);
    return match ? match[0].length : 0;
  }

  function coerce(value: string): unknown {
    if (value === "true") return true;
    if (value === "false") return false;
    if (value === "null" || value === "~") return null;
    if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }

  function parseMap(expectedIndent: number): Record<string, unknown> {
    const object: Record<string, unknown> = {};
    while (index < lines.length && indentOf(lines[index] ?? "") === expectedIndent) {
      const trimmed = (lines[index] ?? "").trim();
      if (trimmed.startsWith("- ")) {
        break;
      }
      const colon = trimmed.indexOf(":");
      const key = trimmed.slice(0, colon).trim();
      const rest = trimmed.slice(colon + 1).trim();
      index += 1;
      if (rest !== "") {
        object[key] = coerce(rest);
      } else if (
        index < lines.length &&
        (lines[index] ?? "").trim().startsWith("- ")
      ) {
        object[key] = parseList(indentOf(lines[index] ?? ""));
      } else if (index < lines.length && indentOf(lines[index] ?? "") > expectedIndent) {
        object[key] = parseMap(indentOf(lines[index] ?? ""));
      } else {
        object[key] = null;
      }
    }
    return object;
  }

  function parseList(expectedIndent: number): unknown[] {
    const items: unknown[] = [];
    while (
      index < lines.length &&
      indentOf(lines[index] ?? "") === expectedIndent &&
      (lines[index] ?? "").trim().startsWith("- ")
    ) {
      const rest = (lines[index] ?? "").trim().slice(2);
      index += 1;
      if (rest.includes(":") && !rest.startsWith("{")) {
        const colon = rest.indexOf(":");
        const key = rest.slice(0, colon).trim();
        const val = rest.slice(colon + 1).trim();
        const item: Record<string, unknown> = { [key]: coerce(val) };
        if (
          index < lines.length &&
          indentOf(lines[index] ?? "") > expectedIndent &&
          !(lines[index] ?? "").trim().startsWith("- ")
        ) {
          Object.assign(item, parseMap(indentOf(lines[index] ?? "")));
        }
        items.push(item);
      } else if (rest === "") {
        items.push(parseMap(indentOf(lines[index] ?? "")));
      } else {
        items.push(coerce(rest));
      }
    }
    return items;
  }

  return parseMap(indentOf(lines[0] ?? ""));
}
