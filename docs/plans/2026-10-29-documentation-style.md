# Plan: Simplified technical writing

Date: 2026-10-29. Lane: docs.
Intent: [Documentation style](./2026-10-29-documentation-style-intent.md).

## Files

- `AGENTS.md`: add the requested writing rules and link the style guide. Coordinate this shared-file edit within this documentation task.
- `README.md`: simplify prose and number development steps.
- `docs/README.md`, `docs/agents/README.md`, `docs/design/README.md`, `docs/reviews/README.md`, `docs/plans/README.md`: simplify indexes and link the style guide.
- `docs/agents/2026-10-29-documentation-style.md`: define the editorial rules and verification procedure.
- Existing operating docs in `docs/agents/`: simplify instructions while preserving their requirements and examples.
- `CHANGELOG.md`: add entries dated 2026-10-29. Preserve older entries.

## Procedure

1. Commit this plan and the intent before editing the documentation.
2. Add the writing rules to `AGENTS.md` and create the style guide.
3. Update the README, indexes, and operating docs.
4. Review the diff for changes to technical meaning and required constraints.
5. Run the verification commands. Paste their summaries and exit codes in the session.
6. Commit the completed documentation update with the required attribution.

## Risks and exclusions

An editorial change can weaken a requirement or imply a new product capability. Preserve obligations, exceptions, result states, numbers, commands, code examples, and historical dates. Keep existing design, review, and plan records unchanged. Do not infer current release status from historical reports. Approximately 80% strictness is an editorial target; it is not a measured compliance score or a claim of ASD-STE100 conformity.

## Verification

1. Run `node scripts/check-scaffold.mjs`. Expect exit code 0.
2. Run `git diff --check`. Expect exit code 0.
3. Compare existing fenced code blocks before and after the edits. Expect identical content.
4. Check relative file links in changed Markdown files. Report pre-existing missing targets separately.
5. Review the diff for preserved requirements, numbers, risks, exceptions, and evidence states.

Package code does not change. Workspace tests and typecheck are not required by the documentation lane verification rule for this change.
