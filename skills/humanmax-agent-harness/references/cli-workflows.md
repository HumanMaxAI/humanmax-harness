# CLI workflows

Always invoke the project-pinned `humanmax` with `--format json`.

```bash
humanmax doctor --format json
humanmax add tool <id> --effect read --dry-run --format json
humanmax add tool <id> --effect reversible-write --format json
humanmax add eval <id> --format json
humanmax upgrade --dry-run --format json
humanmax generate --check --format json
humanmax test --format json
humanmax check --format json
humanmax dev --format json
```

Do not run `adopt`, `inspect`, or `upgrade --apply` in Preview.
