# ship

## What it does

Gets a change to its agreed target: reviews the diff, classifies CI failures before retrying, works review threads with some scepticism, uses independent review when risk or unresolved judgment warrants it, refuses to game gates, deploys and proves the target is serving it. It chooses verification that can fail (running the change first, property tests for rules that must always hold, a differential run for a rewrite) and reads review rules from the base branch, so a change cannot edit its own checks.

## When to reach for it

"Ship it", "fix CI", "CI is too slow", "address the review comments", "babysit this PR", "prove the rewrite behaves the same", "deploy and verify".

## It's working if

pr-state.mjs exits 0 on the current head, or verify-live.mjs finds the deployed commit or changed content at the real URL, and the changed behaviour was exercised there.

## Common questions

**How does it wait for CI?** pr-state.mjs --watch runs in the background, prints one line per change, and exits when the PR is ready (two agreeing reads), needs action, or times out.

**Will it skip a flaky test to get green?** No. Skips, loosened assertions, raised thresholds and --no-verify are listed as gate gaming. A flaky test is diagnosed; it is not skipped, slept past or wrapped in a retry.

**What does it do about slow CI?** It measures the pipeline from real runs and shortens it as a separate change: jobs side by side, the tests the diff can reach on PRs with the full suite on the default branch, superseded runs cancelled. No check is weakened to save time.

**When does it stop trying?** After three rounds (a diagnosis, a fix and a rerun) on the same failing check, it hands the problem to a person with what was tried.

[Skill source](../../skills/ship/SKILL.md)
