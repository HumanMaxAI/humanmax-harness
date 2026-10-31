# Intent: Useful generated project documentation

Date: 2026-10-31. Status: accepted by the human request in this chat.

## Problem

The human used the published generator for `sanguo-yanyi`. The README still describes the generic fixture after application development. No SECURITY.md exists. The human reports that the generated project has little practical effect.

## Facts

The project README has the correct name but still describes only the starter. Its application is a Three Kingdoms interactive chronicle. The site runs through `src/server.ts`; `npm start` runs the starter fixture. The generator does not emit SECURITY.md or instruct coding agents to keep project docs current. It cannot infer future application changes.

## Outcome

Repair the current project's README and add a security document based on its actual source. Improve newly generated README, SECURITY.md, and AGENTS.md. Add regression and packed-distribution verification. Prepare generator and bootstrap 0.2.1 patch candidates.

## Constraints

Preserve application source, declarations, policies, gateway behavior, result states, pack digests, and user work. Do not invent a security contact, response SLA, owner, approval, or production guarantee. Do not implement automatic application discovery or upgrade apply. New documents are explicit authored documentation, not evidence that a security review occurred.
