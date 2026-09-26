import { lstatSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_REPORTS = 64;
const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

function sarifReports(root) {
  const pending = [resolve(root)];
  const reports = [];
  let totalBytes = 0;
  while (pending.length) {
    const path = pending.pop();
    const stat = lstatSync(path, { throwIfNoEntry: false });
    if (!stat) throw new Error(`CodeQL SARIF path does not exist: ${path}`);
    if (stat.isSymbolicLink()) throw new Error(`refusing symbolic link in CodeQL SARIF output: ${path}`);
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path).sort().reverse()) pending.push(resolve(path, entry));
      continue;
    }
    if (!stat.isFile() || !(path.endsWith(".sarif") || path.endsWith(".sarif.json"))) continue;
    reports.push(path);
    totalBytes += stat.size;
    if (reports.length > MAX_REPORTS || totalBytes > MAX_TOTAL_BYTES) {
      throw new Error("CodeQL SARIF output exceeds report count or size limits");
    }
  }
  if (!reports.length) throw new Error("no SARIF reports found in CodeQL output");
  return reports;
}

export function checkCodeqlSarif(root) {
  const files = sarifReports(root);
  let alerts = 0;
  for (const file of files) {
    let report;
    try {
      report = JSON.parse(readFileSync(file, "utf8"));
    } catch {
      throw new Error(`invalid SARIF JSON: ${file}`);
    }
    if (report?.version !== "2.1.0" || !Array.isArray(report.runs) || !report.runs.length) {
      throw new Error(`invalid SARIF report: ${file}`);
    }
    for (const run of report.runs) {
      if (run?.results !== undefined && !Array.isArray(run.results)) {
        throw new Error(`invalid SARIF results: ${file}`);
      }
      alerts += run?.results?.length ?? 0;
    }
  }
  if (alerts) throw new Error(`CodeQL reported ${alerts} alert(s); publication blocked`);
  return { files: files.length, alerts };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error("Usage: node scripts/check-codeql-sarif.mjs <sarif-directory>");
  const result = checkCodeqlSarif(process.argv[2]);
  console.log(`CodeQL SARIF ok (${result.files} report(s), ${result.alerts} alerts)`);
}
