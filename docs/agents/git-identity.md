# Git identity — HumanMaxAI account

This machine has two GitHub identities. Harness work uses the organisation account.

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

Do not push via `gh` HTTPS. Do not use remote `fork` (`billrain/humanmax-harness`) as source of truth. Do not change `git config`. `gh pr create` as billrain fails with `must be a collaborator`; open the PR from the GitHub UI or an authenticated HumanMaxAI session.

When a lane is finished, commit (with Co-authored-by) and push on this remote in the same turn.
