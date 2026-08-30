# Commit attribution

Every commit created by a coding agent must carry a Git `Co-authored-by` trailer that names the **harness tool** and the **model**.

## Format

```text
Co-authored-by: <Harness> + <Model> <<harness>+<model-slug>@noreply.humanmax.ai>
```

- `<Harness>` is the product the human used: `Cursor`, `Claude Code`, `Codex`.
- `<Model>` is the exact model label for that session: `Grok 4.6`, `Claude Opus 4.6`.
- `<harness>` is the harness in lowercase kebab form: `cursor`, `claude-code`, `codex`.
- `<model-slug>` is the model in lowercase with spaces turned into hyphens: `grok-4.6`.

Examples:

```text
Co-authored-by: Cursor + Grok 4.6 <cursor+grok-4.6@noreply.humanmax.ai>
Co-authored-by: Claude Code + Claude Opus 4.6 <claude-code+claude-opus-4.6@noreply.humanmax.ai>
Co-authored-by: Codex + GPT-5.4 <codex+gpt-5.4@noreply.humanmax.ai>
```

Print a trailer:

```bash
node scripts/co-author.mjs Cursor "Grok 4.6"
```

## Rules

- Put a blank line before the trailer.
- Do not invent a second trailer style (`Signed-off-by` for this purpose, or a prose “written with”).
- Do not omit the email. GitHub only recognises `Co-authored-by: name <email>`.
- Do not use a personal or customer address.
- If several agents touched the same commit, add one trailer per harness + model pair.
- Human-only commits may omit the trailer.
