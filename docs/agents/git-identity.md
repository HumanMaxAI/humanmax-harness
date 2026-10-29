# Git identity — HumanMaxAI account

This machine has two GitHub identities. Use the HumanMaxAI organisation account for Harness writes.

| Path | Account | Use |
|---|---|---|
| SSH host `github.com-hm`, key `~/.ssh/id_ed25519_hm` | `HumanMaxAI` | Write: commit push to `HumanMaxAI/humanmax-harness` |
| SSH host `github.com-billrain`, HTTPS `gh` | `billrain` | Read-only on the org repo. Do not push harness here. |

## Origin

```text
git@github.com-hm:HumanMaxAI/humanmax-harness.git
```

```bash
ssh -T git@github.com-hm
# Hi HumanMaxAI!

git push -u origin HEAD
```

1. Check that `origin` uses the SSH URL shown above.
2. Run `ssh -T git@github.com-hm`. The expected account greeting is `Hi HumanMaxAI!`.
3. Run `git push -u origin HEAD`. Confirm that the push succeeds.

Do not push through `gh` HTTPS. Do not use remote `fork` (`billrain/humanmax-harness`) as the source of truth. Do not change `git config`.

`gh pr create` as billrain fails with `must be a collaborator`. Open the PR from the GitHub UI or an authenticated HumanMaxAI session.

When lane work is complete, commit with the `Co-authored-by` trailer. Push to this remote in the same turn.
