import assert from "node:assert/strict";
import { test } from "node:test";
import { coAuthorTrailer, slug } from "./co-author.mjs";

test("cursor + grok uses the required trailer shape", () => {
  assert.equal(
    coAuthorTrailer("Cursor", "Grok 4.6"),
    "Co-authored-by: Cursor + Grok 4.6 <cursor+grok-4.6@noreply.humanmax.ai>",
  );
});

test("model spaces become hyphens in the email", () => {
  assert.equal(slug("Claude Opus 4.6"), "claude-opus-4.6");
  assert.equal(
    coAuthorTrailer("Claude Code", "Claude Opus 4.6"),
    "Co-authored-by: Claude Code + Claude Opus 4.6 <claude-code+claude-opus-4.6@noreply.humanmax.ai>",
  );
});
