import assert from "node:assert/strict";
import { test } from "node:test";
import { findingId } from "./finding-id.ts";

test("finding identity is stable for the same rule, subject and location", () => {
  const input = {
    ruleId: "HMX-TOOL-004",
    subject: { type: "tool", id: "crm-customer-update" },
    location: { file: ".humanmax/tools/crm-update.tool.yaml", line: 14 },
  };
  assert.equal(findingId(input), findingId(input));
  assert.match(findingId(input), /^finding_[a-f0-9]{32}$/);
});

test("message text is not part of finding identity", () => {
  const left = findingId({
    ruleId: "HMX-TOOL-004",
    subject: { type: "tool", id: "crm-customer-update" },
  });
  const right = findingId({
    ruleId: "HMX-TOOL-004",
    subject: { type: "tool", id: "crm-customer-update" },
  });
  assert.equal(left, right);
});

test("a different subject produces a different finding id", () => {
  const left = findingId({
    ruleId: "HMX-TOOL-004",
    subject: { type: "tool", id: "crm-customer-update" },
  });
  const right = findingId({
    ruleId: "HMX-TOOL-004",
    subject: { type: "tool", id: "crm-customer-read" },
  });
  assert.notEqual(left, right);
});
