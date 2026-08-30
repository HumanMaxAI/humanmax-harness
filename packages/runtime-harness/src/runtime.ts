import { randomUUID } from "node:crypto";
import {
  isEffectful,
  validate,
  type ProductionEnforcementState,
  type ProposedAction,
  type Tool,
} from "@humanmax/contracts";
import {
  DenyAllProductionAdapter,
  LocalReviewAdapter,
  type EnforcementAdapter,
} from "./adapters.ts";

export type { EnforcementAdapter, EnforcementContext } from "./adapters.ts";
export { DenyAllProductionAdapter, LocalReviewAdapter };

export type Budgets = {
  maxSteps: number;
  maxToolCalls: number;
  timeoutSeconds: number;
};

export type RunLifecycle =
  | "running"
  | "cancelled"
  | "completed"
  | "failed";

export type RunRecord = {
  id: string;
  agentId: string;
  lifecycle: RunLifecycle;
  budgets: Budgets;
  steps: number;
  toolCalls: number;
  startedAt: number;
};

export type RuntimeEvent = {
  type: string;
  runId: string;
  toolId?: string;
  status?: InvokeStatus;
  redacted: true;
};

export type InvokeStatus = "ok" | "denied" | "review";

export type InvokeResult = {
  status: InvokeStatus;
  output?: unknown;
  reviewRef?: string;
  reasonCodes?: string[];
};

export type ToolHandler = (input: unknown) => Promise<unknown>;

export type RuntimeOptions = {
  adapter: EnforcementAdapter;
};

type RegisteredTool = {
  declaration: Tool;
  handler: ToolHandler;
};

export type HarnessRuntime = {
  registerTool(declaration: Tool, handler: ToolHandler): void;
  startRun(input: { agentId: string; budgets: Budgets }): RunRecord;
  invokeTool(
    runId: string,
    toolId: string,
    input: unknown,
  ): Promise<InvokeResult>;
  cancel(runId: string): void;
  getRun(runId: string): RunRecord | undefined;
  events(runId: string): RuntimeEvent[];
  productionEnforcement(): ProductionEnforcementState;
};

export function createRuntime(options: RuntimeOptions): HarnessRuntime {
  const tools = new Map<string, RegisteredTool>();
  const runs = new Map<string, RunRecord>();
  const eventLog = new Map<string, RuntimeEvent[]>();
  const context = { productionEnforcement: "unconfigured" as const };

  function emit(runId: string, event: Omit<RuntimeEvent, "redacted">): void {
    const entry: RuntimeEvent = { ...event, redacted: true };
    const current = eventLog.get(runId) ?? [];
    current.push(entry);
    eventLog.set(runId, current);
  }

  return {
    productionEnforcement() {
      return context.productionEnforcement;
    },

    registerTool(declaration, handler) {
      const result = validate("Tool", declaration);
      if (!result.ok) {
        throw new Error(result.errors.join("; "));
      }
      tools.set(declaration.metadata.id, {
        declaration: result.value,
        handler,
      });
    },

    startRun({ agentId, budgets }) {
      const run: RunRecord = {
        id: randomUUID(),
        agentId,
        lifecycle: "running",
        budgets,
        steps: 0,
        toolCalls: 0,
        startedAt: Date.now(),
      };
      runs.set(run.id, run);
      eventLog.set(run.id, []);
      return { ...run };
    },

    cancel(runId) {
      const run = runs.get(runId);
      if (!run) {
        return;
      }
      run.lifecycle = "cancelled";
    },

    getRun(runId) {
      const run = runs.get(runId);
      return run ? { ...run } : undefined;
    },

    events(runId) {
      return [...(eventLog.get(runId) ?? [])];
    },

    async invokeTool(runId, toolId, _input) {
      const run = runs.get(runId);
      if (!run) {
        return { status: "denied", reasonCodes: ["unknown-run"] };
      }
      if (run.lifecycle === "cancelled") {
        emit(runId, { type: "tool.denied", runId, toolId, status: "denied" });
        return { status: "denied", reasonCodes: ["run-cancelled"] };
      }
      const elapsedSeconds = (Date.now() - run.startedAt) / 1000;
      if (
        run.toolCalls >= run.budgets.maxToolCalls ||
        run.steps >= run.budgets.maxSteps ||
        elapsedSeconds >= run.budgets.timeoutSeconds
      ) {
        emit(runId, { type: "tool.denied", runId, toolId, status: "denied" });
        return { status: "denied", reasonCodes: ["budget-exhausted"] };
      }

      const registered = tools.get(toolId);
      if (!registered) {
        emit(runId, { type: "tool.denied", runId, toolId, status: "denied" });
        return { status: "denied", reasonCodes: ["undeclared-tool"] };
      }

      run.steps += 1;
      run.toolCalls += 1;
      emit(runId, { type: "tool.invoked", runId, toolId });

      if (!isEffectful(registered.declaration.spec.effectClass)) {
        const output = await registered.handler(_input);
        emit(runId, {
          type: "tool.completed",
          runId,
          toolId,
          status: "ok",
        });
        return { status: "ok", output };
      }

      const action: ProposedAction = {
        toolId,
        agentId: run.agentId,
        runId,
        effectClass: registered.declaration.spec.effectClass,
      };
      const decision = await options.adapter.assess(action, context);

      if (decision.outcome === "REQUIRE_REVIEW") {
        emit(runId, {
          type: "tool.review",
          runId,
          toolId,
          status: "review",
        });
        return { status: "review", reviewRef: decision.reviewRef };
      }

      if (decision.outcome !== "ALLOW") {
        const reasonCodes =
          decision.outcome === "DENY"
            ? decision.reasonCodes
            : ["enforcement-unavailable"];
        emit(runId, {
          type: "tool.denied",
          runId,
          toolId,
          status: "denied",
        });
        return { status: "denied", reasonCodes };
      }

      const output = await registered.handler(_input);
      emit(runId, {
        type: "tool.completed",
        runId,
        toolId,
        status: "ok",
      });
      return { status: "ok", output };
    },
  };
}
