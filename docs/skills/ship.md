# ship

## What it does

Gets a change to its agreed target: reviews the diff, classifies CI failures before retrying, works review threads with some scepticism, gets an independent PASS from an agent that didn't write the change, refuses to game gates, deploys and proves the target is serving it.

## When to reach for it

"Ship it", "fix CI", "address the review comments", "babysit this PR", "deploy and verify".

## It's working if

pr-state.mjs exits 0 on the current head, or verify-live.mjs finds the deployed commit or changed content at the real URL, and the changed behaviour was exercised there.

## Common questions

**How does it wait for CI?** pr-state.mjs --watch runs in the background, prints one line per change, and exits when the PR is ready (two agreeing reads), needs action, or times out.

**Will it skip a flaky test to get green?** No. Skips, loosened assertions, raised thresholds and --no-verify are listed as gate gaming.

[Skill source](../../skills/ship/SKILL.md)
