import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateProject } from "@humanmax/project-generator";

// This proof needs an OS boundary, not an HTTP proxy or patched fetch function.
if (process.platform !== "darwin") {
  console.error("UNKNOWN: this offline proof requires macOS sandbox-exec; no network-denial evidence recorded on this platform.");
  process.exit(2);
}
const root = mkdtempSync(join(tmpdir(), "humanmax-offline-"));
const server = createServer((socket) => socket.end());
try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  const control = `const net = require('node:net'); const socket = net.connect(${port}, '127.0.0.1'); socket.on('connect', () => { socket.destroy(); process.exit(0); }); socket.on('error', error => { console.error(error.code); process.exit(error.code === 'EPERM' || error.code === 'EACCES' ? 13 : 1); });`;
  const options = { cwd: root, encoding: "utf8", timeout: 10_000 };
  assert.equal(spawnSync(process.execPath, ["-e", control], options).status, 0, "positive network control must connect");
  const prefix = ["-p", "(version 1) (allow default) (deny network*)", process.execPath];
  const blocked = spawnSync("/usr/bin/sandbox-exec", [...prefix, "-e", control], options);
  assert.equal(blocked.status, 13, `negative network control must be denied: ${blocked.stderr}`);
  generateProject({ destination: root, name: "offline-proof", apply: true });
  const cli = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
  for (const args of [["check"], ["generate", "--check"]]) {
    const child = spawnSync("/usr/bin/sandbox-exec", [...prefix, cli, ...args, "--format", "json"], options);
    assert.equal(child.status, 0, child.stderr);
    const response = JSON.parse(child.stdout);
    assert.equal(response.summary.fail, 0);
    assert.equal(response.summary.unknown, 0);
    console.log(`${args.join(" ")}: PASS with OS network deny; exit=${child.status}`);
  }
  console.log("network controls: allowed=0, denied=13 (EPERM/EACCES); offline proof exit=0");
} finally {
  server.close();
  rmSync(root, { recursive: true, force: true });
}
