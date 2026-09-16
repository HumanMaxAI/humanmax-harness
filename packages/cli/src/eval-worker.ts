import { writeSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { RESULT_STATES } from "@humanmax/contracts";

try {
  const module = await import(pathToFileURL(process.argv[2]!).href);
  const result: unknown = typeof module.evaluate === "function" ? await module.evaluate() : undefined;
  const valid = typeof result === "string" && (RESULT_STATES as readonly string[]).includes(result);
  writeSync(3, JSON.stringify(valid ? { result } : { result: "UNKNOWN", reason: "Export evaluate() returning a contract ResultState; no implemented result was supplied." }));
} catch {
  writeSync(3, JSON.stringify({ result: "FAIL", reason: "Evaluation threw or rejected; inspect it locally for details." }));
}
