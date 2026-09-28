# Intent: Agentic Engineering implementation baseline

Date: 2026-09-28. Lane: `docs`. Status: accepted scope, based on the user's explicit request; detailed contracts remain proposed until reviewed.

## Problem

The user asks for a systematic Agentic Engineering architecture/best-practices document before broad code changes, followed by ordered implementation. The earlier conversation conflated the full product design with shipped Preview capabilities. A new implementation baseline must be grounded in source.

## Proposed outcome

Document Prompt, Context, Memory, Tool/ACI, Harness, Loop, Evaluation, Safety/Governance, and Observability/Improvement, including current state, target architecture, module boundaries, generated layout, configuration/runtime contracts, P0/P1/P2, non-goals, acceptance, and compatibility.

The requested implementation order is **Prompt contract → Context policy/compaction/retrieval → Working state/handoff → Loop policy/completion/verification/no-progress → trajectory tracing**. This change delivers the complete documentation baseline and task plan first. It does not claim these capabilities are implemented.

## Affected users and systems

Customers generating TypeScript tool-agent projects; maintainers of contracts, runtime, generator, CLI, Core/findings, and the canonical Skill. The generated customer project remains the product.

## Constraints

- Position HumanMax as an **assurance-ready agentic engineering scaffold**.
- Preserve existing contracts → packs → gateway → Core → CLI authority order.
- Keep one tool registry and one action-gateway seam; preserve fail-closed behavior and all four finding states.
- Keep deterministic checks local/offline and `packages/core` free of model/network/write dependencies.
- Do not introduce production authority or a general-purpose multi-agent framework.
- Documentation first; no runtime, schema, package, dependency, or CI changes in this change.

## Out of scope

Implementing all P0 code in this documentation change, hosted services, production approvals, scheduler/daemon, vector database, provider SDK, autonomous prompt optimization, Preview-excluded templates/profiles, or full upgrade apply.

## Open questions

None block writing the baseline. Proposed defaults and implementation decision points must be explicit in the design rather than inferred from chat.
