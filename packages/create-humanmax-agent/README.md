# `create-humanmax-agent`

Bootstrap package for `npm create humanmax-agent`. Delegates generation to `@humanmax/project-generator`.

```bash
npx create-humanmax-agent my-agent --defaults
npx create-humanmax-agent my-agent --defaults --dry-run
```

Preview writes TypeScript `tool-agent` + `base` only. Non-empty destinations require `--apply`. Passing the generated tests is not production enforcement.
