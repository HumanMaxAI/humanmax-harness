# `@humanmax/runtime-harness`

Run state, budgets, tool registry, action gateway, and Preview enforcement adapters.

This package provides mechanics and a seam. It does not issue production authority.

- Undeclared tools fail closed.
- Read/compute tools execute without the gateway.
- Effectful tools always go through the adapter. `LocalReviewAdapter` returns `REQUIRE_REVIEW` and does not run the handler. `DenyAllProductionAdapter` always denies and never returns `ALLOW`.
- `productionEnforcement` remains `unconfigured`.
- Events carry references only. Payloads are not recorded.
