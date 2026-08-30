import assert from "node:assert/strict";
import { test } from "node:test";
import { previewTool } from "@humanmax/contracts";
import {
  DenyAllProductionAdapter,
  LocalReviewAdapter,
  createRuntime,
} from "./runtime.ts";

function writeTool() {
  return previewTool();
}

function readTool() {
  return {
    ...previewTool(),
    metadata: { id: "knowledge-read" },
    spec: {
      ...previewTool().spec,
      effectClass: "read" as const,
      gateway: "not-applicable" as const,
      idempotency: "not-applicable" as const,
    },
  };
}

test("undeclared tools fail closed", async () => {
  const runtime = createRuntime({
    adapter: new LocalReviewAdapter(),
  });
  const run = runtime.startRun({
    agentId: "customer-support-agent",
    budgets: { maxSteps: 4, maxToolCalls: 2, timeoutSeconds: 30 },
  });
  const result = await runtime.invokeTool(run.id, "not-registered", {});
  assert.equal(result.status, "denied");
  assert.ok(result.reasonCodes?.includes("undeclared-tool"));
});

test("read tools execute without the action gateway", async () => {
  let gatewayCalls = 0;
  const adapter = new LocalReviewAdapter();
  const original = adapter.assess.bind(adapter);
  adapter.assess = async (action, context) => {
    gatewayCalls += 1;
    return original(action, context);
  };
  const runtime = createRuntime({ adapter });
  runtime.registerTool(readTool(), async () => ({ ok: true }));
  const run = runtime.startRun({
    agentId: "customer-support-agent",
    budgets: { maxSteps: 4, maxToolCalls: 2, timeoutSeconds: 30 },
  });
  const result = await runtime.invokeTool(run.id, "knowledge-read", {
    query: "policy",
  });
  assert.equal(result.status, "ok");
  assert.deepEqual(result.output, { ok: true });
  assert.equal(gatewayCalls, 0);
});

test("effectful tools cannot skip the action gateway", async () => {
  let executed = false;
  const runtime = createRuntime({
    adapter: new LocalReviewAdapter(),
  });
  runtime.registerTool(writeTool(), async () => {
    executed = true;
    return { updated: true };
  });
  const run = runtime.startRun({
    agentId: "customer-support-agent",
    budgets: { maxSteps: 4, maxToolCalls: 2, timeoutSeconds: 30 },
  });
  const result = await runtime.invokeTool(run.id, "crm-customer-update", {
    id: "c1",
  });
  assert.equal(result.status, "review");
  assert.equal(executed, false);
  assert.ok(result.reviewRef);
});

test("deny-all-production never allows an effectful action", async () => {
  let executed = false;
  const adapter = new DenyAllProductionAdapter();
  const runtime = createRuntime({ adapter });
  runtime.registerTool(writeTool(), async () => {
    executed = true;
    return { updated: true };
  });
  const run = runtime.startRun({
    agentId: "customer-support-agent",
    budgets: { maxSteps: 4, maxToolCalls: 2, timeoutSeconds: 30 },
  });
  const result = await runtime.invokeTool(run.id, "crm-customer-update", {
    id: "c1",
  });
  assert.equal(adapter.id, "deny-all-production");
  assert.equal(runtime.productionEnforcement(), "unconfigured");
  assert.equal(result.status, "denied");
  assert.ok(
    result.reasonCodes?.includes("production-enforcement-unconfigured"),
  );
  assert.equal(executed, false);
  const decision = await adapter.assess(
    {
      toolId: "crm-customer-update",
      agentId: "customer-support-agent",
      runId: run.id,
      effectClass: "reversible-write",
    },
    { productionEnforcement: "unconfigured" },
  );
  assert.notEqual(decision.outcome, "ALLOW");
});

test("budget exhaustion fails closed before a tool runs", async () => {
  let executed = false;
  const runtime = createRuntime({
    adapter: new LocalReviewAdapter(),
  });
  runtime.registerTool(readTool(), async () => {
    executed = true;
    return { ok: true };
  });
  const run = runtime.startRun({
    agentId: "customer-support-agent",
    budgets: { maxSteps: 1, maxToolCalls: 0, timeoutSeconds: 30 },
  });
  const result = await runtime.invokeTool(run.id, "knowledge-read", {});
  assert.equal(result.status, "denied");
  assert.ok(result.reasonCodes?.includes("budget-exhausted"));
  assert.equal(executed, false);
});

test("cancelled runs reject further tool calls", async () => {
  const runtime = createRuntime({
    adapter: new LocalReviewAdapter(),
  });
  runtime.registerTool(readTool(), async () => ({ ok: true }));
  const run = runtime.startRun({
    agentId: "customer-support-agent",
    budgets: { maxSteps: 4, maxToolCalls: 2, timeoutSeconds: 30 },
  });
  runtime.cancel(run.id);
  const result = await runtime.invokeTool(run.id, "knowledge-read", {});
  assert.equal(result.status, "denied");
  assert.ok(result.reasonCodes?.includes("run-cancelled"));
  assert.equal(runtime.getRun(run.id)?.lifecycle, "cancelled");
});

test("runtime events redact payloads", async () => {
  const runtime = createRuntime({
    adapter: new LocalReviewAdapter(),
  });
  runtime.registerTool(readTool(), async () => ({ secret: "value" }));
  const run = runtime.startRun({
    agentId: "customer-support-agent",
    budgets: { maxSteps: 4, maxToolCalls: 2, timeoutSeconds: 30 },
  });
  await runtime.invokeTool(run.id, "knowledge-read", { token: "raw-secret" });
  const events = runtime.events(run.id);
  assert.ok(events.length > 0);
  const serialized = JSON.stringify(events);
  assert.equal(serialized.includes("raw-secret"), false);
  assert.equal(serialized.includes("value"), false);
  assert.equal(events.every((event) => event.redacted === true), true);
});
