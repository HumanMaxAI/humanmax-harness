import assert from "node:assert/strict";
import { test } from "node:test";
import { publishWorkspaces } from "./publish-workspaces.mjs";

function registry({ existing = false, error, publishFails = false } = {}) {
  const calls = [];
  let published = false;
  return { calls, run(args) {
    calls.push(args);
    if (args[0] === "pkg") return { status: 0, stdout: JSON.stringify({ "@humanmax/cli": "0.1.1" }) };
    if (args[0] === "view") {
      assert.equal(args[1], "@humanmax/cli@0.1.1");
      if (error) return { status: 1, stdout: JSON.stringify({ error: { code: error } }) };
      return existing || published ? { status: 0, stdout: '"0.1.1"' }
        : { status: 1, stdout: '{"error":{"code":"E404"}}' };
    }
    if (args[0] === "publish") {
      if (publishFails) return { status: 1, stdout: "" };
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
test("failed publishes cannot be reported as successful", () => {
  const fake = registry({ publishFails: true });
  assert.throws(() => publishWorkspaces({ ...fake, names, log() {} }), /publish failed/);
});
