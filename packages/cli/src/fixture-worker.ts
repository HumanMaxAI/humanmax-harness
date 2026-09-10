import { writeSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// A separate result channel keeps project console/stdout output out of CLI JSON.
try {
  const module = await import(pathToFileURL(join(process.cwd(), "src/index.ts")).href);
  if (typeof module.runFixture !== "function") {
    writeSync(3, JSON.stringify({ error: "Generated project does not export runFixture()", kind: "usage" }));
    process.exitCode = 2;
  } else {
    const result: unknown = await module.runFixture();
    writeSync(3, JSON.stringify({ result: result ?? null }));
  }
} catch {
  // Project exception messages may contain inputs, credentials or payloads.
  writeSync(3, JSON.stringify({ error: "Project fixture failed; inspect it locally for details", kind: "internal" }));
  process.exitCode = 4;
}
