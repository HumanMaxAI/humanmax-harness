# `@humanmax/contracts`

Language-neutral public types, JSON Schema, and validation for HumanMax Agent Harness.

Other packages depend on this lane. Change it in isolation. Do not copy these identifiers into Skill prose or generated markdown as the only copy of a control.

## Invariants

- Result states are `PASS`, `FAIL`, `UNKNOWN`, `NEEDS_HUMAN_REVIEW`. Absence of evidence is not a pass.
- Layer 01 `productionEnforcement` is only `unconfigured`. There is no `enforced` value.
- Effectful tools must set `gateway: required`.
- An approved exception sets `governanceStatus: accepted-risk` and never rewrites `result` to `PASS`.
- Finding identity is `findingId(ruleId, subject, location)`. Message text is not part of identity.

## Validate

```ts
import { validate, applyException } from "@humanmax/contracts";

const result = validate("HarnessProject", document);
```

JSON Schema files live in `schemas/`.
