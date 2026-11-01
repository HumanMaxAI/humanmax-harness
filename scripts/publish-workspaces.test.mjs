import assert from "node:assert/strict";
import { test } from "node:test";
import { publishWorkspaces } from "./publish-workspaces.mjs";

function registry({ existing = false, error, publishFails = false, publishStderr = "", visibilityDelay = 0 } = {}) {
  const calls = [];
  let published = false;
  let postPublishLookups = 0;
  const fake = { calls, run(args) {
    calls.push(args);
    if (args[0] === "pkg") return { status: 0, stdout: JSON.stringify({ "@humanmax/cli": "0.1.1" }) };
    if (args[0] === "view") {
      assert.equal(args[1], "@humanmax/cli@0.1.1");
      if (error) return { status: 1, stdout: JSON.stringify({ error: { code: error } }) };
      if (published) postPublishLookups += 1;
      const visible = published && postPublishLookups > visibilityDelay;
      return existing || visible ? { status: 0, stdout: '"0.1.1"' }
        : { status: 1, stdout: '{"error":{"code":"E404"}}' };
    }
    if (args[0] === "publish") {
      if (publishFails) return { status: 1, stdout: "", stderr: publishStderr };
      published = true;
      return { status: 0, stdout: "" };
    }
    throw new Error(`unexpected operation ${args[0]}`);
  } };
  fake.lookup = async (name, version) => {
    const result = fake.run(["view", `${name}@${version}`]);
    const data = JSON.parse(result.stdout);
    if (result.status === 0 && data === version) return true;
    if (data?.error?.code === "E404") return false;
    throw new Error("registry lookup failed");
  };
  return fake;
}

const names = ["@humanmax/cli"];
test("published workspace versions are unwrapped and skipped", async () => {
  const fake = registry({ existing: true });
  const messages = [];
  await publishWorkspaces({ ...fake, names, log: m => messages.push(m) });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 0);
  assert.deepEqual(messages, ["skip @humanmax/cli@0.1.1 (already on the registry)"]);
});
test("dry run previews absent versions without any publish", async () => {
  const fake = registry();
  const messages = [];
  await publishWorkspaces({ ...fake, names, dryRun: true, log: m => messages.push(m) });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 0);
  assert.deepEqual(messages, ["would publish @humanmax/cli@0.1.1"]);
});
test("authentication, network and invalid registry responses stop publication", async () => {
  for (const error of ["E401", "E403", "ENOTFOUND"]) {
    const fake = registry({ error });
    await assert.rejects(async () => publishWorkspaces({ ...fake, names }), /registry/);
    assert.equal(fake.calls.filter(c => c[0] === "publish").length, 0);
  }
  await assert.rejects(async () => publishWorkspaces({ names, run: () => ({ status: 0, stdout: "{}" }) }), /version/);
});
test("a missing version is published once and verified", async () => {
  const fake = registry();
  await publishWorkspaces({ ...fake, names, log() {} });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(fake.calls.at(-1)[0], "view");
});
test("post-publish verification tolerates bounded registry propagation", async () => {
  const fake = registry({ visibilityDelay: 2 });
  let waits = 0;
  await publishWorkspaces({ ...fake, names, log() {}, verificationAttempts: 4, wait() { waits += 1; } });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(fake.calls.filter(c => c[0] === "view").length, 4);
  assert.equal(waits, 2);
});
test("default verification covers registry propagation beyond the old three-minute limit", async () => {
  const fake = registry({ visibilityDelay: 40 });
  let waits = 0;
  await publishWorkspaces({ ...fake, names, log() {}, wait() { waits += 1; } });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(waits, 40);
});
test("successful publishes stop after the bounded propagation window", async () => {
  const fake = registry({ visibilityDelay: Number.POSITIVE_INFINITY });
  let waits = 0;
  await assert.rejects(
    async () => publishWorkspaces({ ...fake, names, log() {}, verificationAttempts: 3, verificationDelayMs: 10, wait() { waits += 1; } }),
    /npm publish returned exit 0.*registry did not expose.*3 checks/,
  );
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(fake.calls.filter(c => c[0] === "view").length, 4);
  assert.equal(waits, 2);
});
test("failed publishes cannot be reported as successful", async () => {
  const token = `npm_${"a".repeat(40)}`;
  const fake = registry({
    publishFails: true,
    publishStderr: `${"discard-me ".repeat(600)}\nnpm error code E403\nnpm error token ${token}\n_authToken=plain-secret\nAuthorization: Bearer bearer-secret\nNODE_AUTH_TOKEN=env-secret`,
  });
  let waits = 0;
  let failure;
  try {
    await publishWorkspaces({ ...fake, names, log() {}, verificationAttempts: 3, wait() { waits += 1; } });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof Error);
  assert.match(failure.message, /npm publish failed.*exit 1.*npm error code E403/s);
  assert.match(failure.message, /\[REDACTED\]/);
  assert.doesNotMatch(failure.message, new RegExp(token));
  for (const secret of ["plain-secret", "bearer-secret", "env-secret"]) {
    assert.doesNotMatch(failure.message, new RegExp(secret));
  }
  assert.ok(failure.message.length < 5_000, "npm diagnostic must be bounded");
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(fake.calls.filter(c => c[0] === "view").length, 2);
  assert.equal(waits, 0);
});


test("registry verification reads the exact version resource and requests revalidation", async () => {
  const { registryVersionExists } = await import("./publish-workspaces.mjs");
  const calls = [];
  const visible = await registryVersionExists("@humanmax/cli", "0.2.0", { fetch: async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ name: "@humanmax/cli", version: "0.2.0" }));
  } });
  assert.equal(visible, true);
  assert.equal(calls[0].url, "https://registry.npmjs.org/%40humanmax%2Fcli/0.2.0");
  assert.equal(calls[0].options.headers["Cache-Control"], "no-cache");
  assert.equal(calls[0].options.cache, "no-store");
  assert.ok(calls[0].options.signal instanceof AbortSignal);
  assert.equal(calls[0].options.headers.Authorization, undefined);
});

test("only a registry 404 means absent; invalid identities and other failures stop publication", async () => {
  const { registryVersionExists } = await import("./publish-workspaces.mjs");
  const lookup = response => registryVersionExists("@humanmax/cli", "0.2.0", { fetch: async () => response });
  assert.equal(await lookup(new Response("not found", { status: 404 })), false);
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(() => lookup(new Response("private detail", { status })), /registry lookup failed/);
  }
  for (const data of [{ name: "wrong", version: "0.2.0" }, { name: "@humanmax/cli", version: "0.1.0" }, {}]) {
    await assert.rejects(() => lookup(new Response(JSON.stringify(data))), /registry lookup failed/);
  }
  await assert.rejects(() => lookup(new Response("invalid JSON")), /registry lookup failed/);
  await assert.rejects(() => registryVersionExists("@humanmax/cli", "0.2.0", { fetch: async () => { throw new Error("network detail"); } }), /registry lookup failed/);
});


test("all async preflight lookups complete before any package is published", async () => {
  const writes = [];
  await assert.rejects(() => publishWorkspaces({
    names: ["first", "second"],
    run(args) {
      if (args[0] === "pkg") return { status: 0, stdout: JSON.stringify({ [args.at(-1)]: "0.2.0" }) };
      writes.push(args);
      return { status: 0, stdout: "" };
    },
    async lookup(name) {
      if (name === "second") throw new Error("registry lookup failed");
      return false;
    },
  }), /registry lookup failed/);
  assert.equal(writes.length, 0);
});

test("an invisible successful publication retains bounded redacted npm diagnostics", async () => {
  const fake = registry({ visibilityDelay: Infinity });
  const run = args => {
    const result = fake.run(args);
    return args[0] === "publish" ? { ...result, stdout: "npm notice accepted NODE_AUTH_TOKEN=private-value" } : result;
  };
  await assert.rejects(() => publishWorkspaces({ ...fake, run, names, verificationAttempts: 1 }), error => {
    assert.match(error.message, /npm publish returned exit 0/);
    assert.match(error.message, /npm notice accepted/);
    assert.doesNotMatch(error.message, /private-value/);
    return true;
  });
});
