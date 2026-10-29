# Documentation writing style

Date: 2026-10-29.

The human requested a style inspired by ASD-STE100 Simplified Technical English, at approximately 80% strictness. Use this guide for repository documentation. The binding rules are in [AGENTS.md](../../AGENTS.md#documentation-writing-style).

The 80% target allows normal technical English where it improves precision. It is not a measured compliance score. This guide does not claim conformity with ASD-STE100 or impose its controlled vocabulary.

## Sentence rules

- Use short, direct sentences.
- Express one main idea per sentence.
- Prefer active voice. Name the actor when the reader must know who acts.
- State a condition before the action that depends on it.
- Use explicit nouns when a pronoun could refer to more than one object.
- Remove vague words unless you can define their meaning in context.

Recommendation: aim for 20 words or fewer per sentence. Keep a longer sentence when splitting it would obscure a condition, exception, or technical relationship. Technical accuracy takes priority over sentence length.

## Technical meaning

- Use one term for one concept. Preserve established repository terminology.
- Preserve command names, flags, paths, identifiers, schema keys, and code examples exactly.
- Preserve all important technical details, risks, exceptions, numbers, units, limits, and versions.
- Preserve the force of each requirement. Do not change “must” to “should” or remove a prohibition.
- Preserve Preview limits and the action-gateway boundary.
- Preserve `PASS`, `FAIL`, `UNKNOWN`, and `NEEDS_HUMAN_REVIEW` exactly. Missing evidence remains `UNKNOWN`.
- Preserve historical dates, verdicts, and evidence. A style edit does not establish a new technical fact.

## Facts, assumptions, and recommendations

Distinguish these categories when a reader could confuse them:

| Category | Required content | Example |
|---|---|---|
| Fact | Observable result and its evidence or date | “Fact: `node scripts/check-scaffold.mjs` exited with code 0 in this verification run.” |
| Assumption | Unverified premise and its effect | “Assumption: the registry contains the pinned version. Verify this before installation.” |
| Recommendation | Suggested action and its reason | “Recommendation: use a separate worktree to isolate edits.” |
| Requirement | Mandatory action or prohibition | “Do not overwrite another agent's claim.” |

Use explicit labels when the category is unclear. Do not label an unverified claim as a fact. A recommendation does not grant approval or create an exception.

## Procedures

Use numbered steps when actions have an order. State prerequisites before the steps. Name the actor when responsibility changes. State the action, condition, and expected result explicitly.

Example:

Prerequisite: run the command from the repository root.

1. Run `node scripts/check-scaffold.mjs`.
2. Check the exit code. The expected exit code is 0.
3. If the command fails, correct the reported scaffold problem. Run the command again.
4. Record the command output and exit code before you claim completion.

Use bullets for independent requirements or reference information. Use tables when readers need to compare terms, mappings, or states.

## Editorial examples

| Before | After |
|---|---|
| “The check should then be run so that any problems can be identified.” | “Run the check. If it fails, inspect the reported problems.” |
| “It may not be available.” | “Assumption: the package version may be absent from the registry. Verify the version before installation.” |
| “Retry for a while if the registry has not caught up.” | “If post-publish verification returns E404, retry for up to two minutes. Stop immediately for other lookup errors.” |

Use examples only when their conditions match the documented system. Do not add a number, timeout, or behavior merely to make prose more specific.

## Editorial verification

1. Compare the edited text with its source. Check requirements, technical terms, risks, exceptions, and numbers.
2. Confirm that each procedure has numbered steps and explicit expected results.
3. Check that facts, assumptions, and recommendations are distinguishable.
4. Compare commands, code examples, paths, identifiers, and result states. Confirm that the edit preserves them.
5. Check Markdown links and formatting. Run `git diff --check`; expect exit code 0.
6. Run the repository checks required for the touched lane. Record the output and exit codes.

Do not use a readability score as proof of technical accuracy. Keep design changes separate from editorial changes. Follow the repository's dated revision process when technical meaning must change.
