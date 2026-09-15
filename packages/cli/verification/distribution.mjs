import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, mkdir, readFile, writeFile, rm, rename, lstat } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

// This temporary registry serves exact candidate tarballs. Unchanged packages
// still come from public npm; no repository symlinks or package rewrites are used.
const execute = promisify(execFile);
const repo = fileURLToPath(new URL("../../../", import.meta.url));
const root = await mkdtemp(join(tmpdir(), "humanmax-distribution-"));
const records = [];
const candidates = new Map();
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.toLowerCase().startsWith("npm_")));
Object.assign(env, { npm_config_audit: "false", npm_config_fund: "false", npm_config_update_notifier: "false" });
let server;
async function run(command, args, cwd, expected = 0) {
  let result;
  try { result = { ...await execute(command, args, { cwd, env, timeout: 120_000, maxBuffer: 4 * 1024 * 1024 }), code: 0 }; }
  catch (error) { result = error; }
  records.push({ command, args, cwd, exit: result.code, stdout: result.stdout, stderr: result.stderr });
  assert.equal(result.code, expected, `${command} ${args.join(" ")}\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  return result.stdout;
}
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
try {
  // Only changed/unpublished release candidates are substituted. Runtime,
  // contracts and other unchanged dependencies must install from public npm.
  for (const directory of ["project-generator", "cli", "create-humanmax-agent", "humanmax"]) {
    const manifest = JSON.parse(await readFile(join(repo, "packages", directory, "package.json"), "utf8"));
    const [pack] = JSON.parse(await run(npm, ["pack", "-w", manifest.name, "--pack-destination", root, "--json"], repo));
    const bytes = await readFile(join(root, pack.filename));
    assert.equal(`sha512-${createHash("sha512").update(bytes).digest("base64")}`, pack.integrity);
    candidates.set(manifest.name, { manifest, pack, bytes });
  }
  let registry;
  server = createServer((request, response) => {
    const url = new URL(request.url, registry);
    if (request.method !== "GET") { response.writeHead(405).end(); return; }
    const pathname = decodeURIComponent(url.pathname.slice(1));
    for (const { bytes, pack } of candidates.values()) {
      if (pathname === `tarballs/${pack.filename}`) {
        response.writeHead(200, { "content-type": "application/octet-stream" }).end(bytes); return;
      }
    }
    const candidate = candidates.get(pathname);
    if (candidate) {
      const { manifest, pack } = candidate;
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
        name: manifest.name, "dist-tags": { latest: manifest.version },
        versions: { [manifest.version]: { ...manifest, dist: {
          tarball: `${registry}/tarballs/${pack.filename}`, integrity: pack.integrity, shasum: pack.shasum,
        } } },
      }));
      return;
    }
    response.writeHead(302, { location: `https://registry.npmjs.org${url.pathname}${url.search}` }).end();
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  registry = `http://127.0.0.1:${server.address().port}`;
  const bootstrap = join(root, "bootstrap");
  const project = join(root, "agent");
  await mkdir(bootstrap);
  await writeFile(join(bootstrap, "package.json"), '{"private":true,"type":"module"}\n');
  await run(npm, ["install", "create-humanmax-agent@0.1.0", "humanmax@0.1.0", "--ignore-scripts", "--registry", registry], bootstrap);
  const aliasVersion = await run(process.execPath, [join(bootstrap, "node_modules/.bin/humanmax"), "--version"], bootstrap);
  assert.equal(aliasVersion.trim(), candidates.get("@humanmax/cli").manifest.version);
  await run(process.execPath, [join(bootstrap, "node_modules/.bin/create-humanmax-agent"), project, "--defaults"], bootstrap);
  const manifest = JSON.parse(await readFile(join(project, "package.json"), "utf8"));
  assert.doesNotMatch(JSON.stringify(manifest), /file:|bootstrap|node_modules\/.*\/src\//);
  assert.equal(manifest.overrides, undefined);
  assert.equal(manifest.dependencies["@humanmax/runtime-harness"], "0.1.0");
  assert.equal(manifest.devDependencies["@humanmax/cli"], candidates.get("@humanmax/cli").manifest.version);
  await rm(bootstrap, { recursive: true, force: true });
  await run(npm, ["install", "--ignore-scripts", "--registry", registry], project);
  await run(npm, ["ci", "--ignore-scripts", "--registry", registry], project);
  await run(npm, ["ls", "--all"], project);
  for (const name of ["cli", "runtime-harness", "contracts", "project-generator"]) {
    assert.equal((await lstat(join(project, "node_modules/@humanmax", name))).isSymbolicLink(), false);
  }
  // Moving the project proves generated paths do not refer back to its original
  // location. The bootstrap is already gone before npm installs anything.
  const moved = join(root, "moved-agent");
  await rename(project, moved);
  for (const script of ["build", "typecheck", "start", "test"]) await run(npm, ["run", script], moved);
  await run(process.execPath, ["dist/src/index.js"], moved);
  async function cli(args, expected = 0) {
    const response = JSON.parse(await run(npm, ["run", "--silent", "humanmax", "--", ...args, "--format", "json"], moved, expected));
    assert.equal(response.versions.cli, candidates.get("@humanmax/cli").manifest.version);
    return response;
  }
  const doctor = await cli(["doctor"]);
  assert.equal(doctor.summary.fail, 0);
  const dev = await cli(["dev"]);
  assert.deepEqual(dev.results[0], { read: "ok", write: "review", productionEnforcement: "unconfigured", writeExecuted: false });
  const tests = await cli(["test"]);
  assert.equal(tests.summary.pass, 2);
  assert.equal(tests.summary.unknown, 0);
  await cli(["generate", "--check"]);
  await cli(["check"]);
  await cli(["upgrade", "--dry-run"]);
  await cli(["add", "tool", "distribution-write", "--effect", "reversible-write", "--dry-run"]);
  await cli(["add", "tool", "distribution-write", "--effect", "reversible-write"]);
  await cli(["test"]);
  await cli(["generate", "--check"]);
  await cli(["add", "eval", "distribution"]);
  const incomplete = await cli(["test"], 1);
  assert.equal(incomplete.summary.unknown, 1);
  console.log("distribution: PASS; packed bootstrap → independent npm install/ci → relocate → build/typecheck/start → tests/evals → CLI checks/add; exit=0");
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await writeFile(join(root, "evidence.json"), JSON.stringify(records, null, 2));
  if (process.env.HUMANMAX_KEEP_DISTRIBUTION === "1") console.log(`Distribution evidence: ${root}`);
  else await rm(root, { recursive: true, force: true });
}
