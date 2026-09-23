import assert from "node:assert/strict";
import { test } from "node:test";
import { publishWorkspaces } from "./publish-workspaces.mjs";

function registry({ existing = false, error, publishFails = false, publishStderr = "", visibilityDelay = 0 } = {}) {
  const calls = [];
  let published = false;
  let postPublishLookups = 0;
  return { calls, run(args) {
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
}

const names = ["@humanmax/cli"];
test("published workspace versions are unwrapped and skipped", () => {
  const fake = registry({ existing: true });
  const messages = [];
  publishWorkspaces({ ...fake, names, log: m => messages.push(m) });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 0);
  assert.deepEqual(messages, ["skip @humanmax/cli@0.1.1 (already on the registry)"]);
});
test("dry run previews absent versions without any publish", () => {
  const fake = registry();
  const messages = [];
  publishWorkspaces({ ...fake, names, dryRun: true, log: m => messages.push(m) });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 0);
  assert.deepEqual(messages, ["would publish @humanmax/cli@0.1.1"]);
});
test("authentication, network and invalid registry responses stop publication", () => {
  for (const error of ["E401", "E403", "ENOTFOUND"]) {
    const fake = registry({ error });
    assert.throws(() => publishWorkspaces({ ...fake, names }), /registry/);
    assert.equal(fake.calls.filter(c => c[0] === "publish").length, 0);
  }
  assert.throws(() => publishWorkspaces({ names, run: () => ({ status: 0, stdout: "{}" }) }), /version/);
});
test("a missing version is published once and verified", () => {
  const fake = registry();
  publishWorkspaces({ ...fake, names, log() {} });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(fake.calls.at(-1)[0], "view");
});
test("post-publish verification tolerates bounded registry propagation", () => {
  const fake = registry({ visibilityDelay: 2 });
  let waits = 0;
  publishWorkspaces({ ...fake, names, log() {}, verificationAttempts: 4, wait() { waits += 1; } });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(fake.calls.filter(c => c[0] === "view").length, 4);
  assert.equal(waits, 2);
});
test("default verification covers registry propagation beyond two minutes", () => {
  const fake = registry({ visibilityDelay: 26 });
  let waits = 0;
  publishWorkspaces({ ...fake, names, log() {}, wait() { waits += 1; } });
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(waits, 26);
});
test("successful publishes stop after the bounded propagation window", () => {
  const fake = registry({ visibilityDelay: Number.POSITIVE_INFINITY });
  let waits = 0;
  assert.throws(
    () => publishWorkspaces({ ...fake, names, log() {}, verificationAttempts: 3, verificationDelayMs: 10, wait() { waits += 1; } }),
    /npm publish returned exit 0.*registry did not expose.*3 checks/,
  );
  assert.equal(fake.calls.filter(c => c[0] === "publish").length, 1);
  assert.equal(fake.calls.filter(c => c[0] === "view").length, 4);
  assert.equal(waits, 2);
});
test("failed publishes cannot be reported as successful", () => {
  const token = `npm_${"a".repeat(40)}`;
  const fake = registry({
    publishFails: true,
    publishStderr: `${"discard-me ".repeat(600)}\nnpm error code E403\nnpm error token ${token}\n_authToken=plain-secret\nAuthorization: Bearer bearer-secret\nNODE_AUTH_TOKEN=env-secret`,
  });
  let waits = 0;
  let failure;
  try {
    publishWorkspaces({ ...fake, names, log() {}, verificationAttempts: 3, wait() { waits += 1; } });
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
