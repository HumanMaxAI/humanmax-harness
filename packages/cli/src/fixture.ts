import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { internalError, usageError } from "./errors.ts";

export function runFixture(root: string, timeoutSeconds: number): unknown {
  const source = import.meta.url.endsWith(".ts");
  const worker = fileURLToPath(new URL(source ? "./fixture-worker.ts" : "./fixture-worker.js", import.meta.url));
  const child = spawnSync(process.execPath, ["--experimental-strip-types", worker], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe", "pipe"],
    timeout: Math.min(timeoutSeconds * 1000, 120_000),
    maxBuffer: 1024 * 1024,
  });
  if (child.error || child.signal) throw internalError("Project fixture did not finish within execution/output limits");
  const output = child.output[3];
  if (!output) throw internalError("Project fixture returned no result");
  const body = JSON.parse(output.toString()) as { result?: unknown; error?: string; kind?: string };
  if (body.error) {
    throw body.kind === "usage" ? usageError(body.error) : internalError(body.error);
  }
  if (child.status !== 0 || !("result" in body)) throw internalError("Project fixture failed without a result");
  return body.result;
}
