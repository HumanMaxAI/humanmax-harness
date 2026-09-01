# `create-humanmax-agent`

Bootstrap package for `npm create humanmax-agent` once published. Until then, run it from this clone:

```bash
node --experimental-strip-types packages/create-humanmax-agent/src/cli.ts my-agent --defaults
npx create-humanmax-agent my-agent --defaults --dry-run
```

Preview writes TypeScript `tool-agent` + `base` only. Non-empty destinations require `--apply`. Passing the generated tests is not production enforcement.
