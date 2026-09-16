import { spawnSync } from "node:child_process";
import { lstatSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { RESULT_STATES, type ResultState } from "@humanmax/contracts";
import { projectPath, readProjectFile } from "./project.ts";

export type EvalResult = { runner: "eval"; path: string; result: ResultState; reason?: string };

export function runEvals(root: string): EvalResult[] {
  const unknown = (path: string, reason: string): EvalResult => ({ runner: "eval", path, result: "UNKNOWN", reason });
  const directory = projectPath(root, "evals");
  if (!lstatSync(directory, { throwIfNoEntry: false })?.isDirectory()) return [unknown("evals", "No eval directory was supplied.")];
  const files = readdirSync(directory).filter(name => name.endsWith(".eval.ts")).sort();
  if (!files.length || files.length > 64) return [unknown("evals", "Expected 1–64 local eval files.")];
  const worker = fileURLToPath(new URL(import.meta.url.endsWith(".ts") ? "./eval-worker.ts" : "./eval-worker.js", import.meta.url));
  const deadline = Date.now() + 30_000;
  return files.map(name => {
    const path = `evals/${name}`;
    try {
      readProjectFile(root, path);
    } catch {
      return { runner: "eval", path, result: "FAIL", reason: "Refusing an unsafe eval path or oversized file." };
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) return unknown(path, "Evaluation time budget exhausted.");
    const child = spawnSync(process.execPath, ["--experimental-strip-types", worker, projectPath(root, path)], {
      cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe", "pipe"],
      timeout: Math.min(10_000, remaining), killSignal: "SIGKILL", maxBuffer: 1024 * 1024,
    });
    if (child.error || child.signal) return unknown(path, "Evaluation did not complete within execution/output limits.");
    if (child.status !== 0) return { runner: "eval", path, result: "FAIL", reason: "Evaluation process exited unsuccessfully." };
    if (!child.output[3]) return unknown(path, "Evaluation returned no result.");
    try {
      const data: unknown = JSON.parse(child.output[3].toString());
      if (typeof data !== "object" || data === null || !("result" in data) ||
          typeof data.result !== "string" || !(RESULT_STATES as readonly string[]).includes(data.result)) {
        return unknown(path, "Invalid evaluation result.");
      }
      return { runner: "eval", path, result: data.result as ResultState,
        ...("reason" in data && typeof data.reason === "string" ? { reason: data.reason } : {}) };
    } catch {
      return unknown(path, "Invalid evaluation result.");
    }
  });
}
