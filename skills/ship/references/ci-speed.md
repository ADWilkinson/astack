# Fast CI

When agents write most of the code, the wait for checks sets the pace of every loop: each push, each review fix, each rebase. A slow pipeline also teaches skipping. Treat a slow gate as a defect in the repo, and fix it as its own change, with the owner's agreement, never inside a feature PR.

Prompted by Pontus Abrahamsson's [account of a frontend pipeline brought under two minutes](https://x.com/pontusab/status/2121982070193058191).

## Measure first

```sh
gh pr checks <number> --json name,state,startedAt,completedAt      # push to the last required check, on one PR
gh run list --workflow <name> --limit 20 --json databaseId,conclusion,createdAt,updatedAt
gh run view <id> --json jobs --jq '.jobs[] | [.name, .startedAt, .completedAt] | @tsv'
```

Write down the wall-clock time from push to the last required check over the last ten or so PR runs, and the slowest job and step. Change the largest number first. Compare before and after over several real runs of the same workflow, not one lucky run.

## What moves the number

| Move | Detail |
| --- | --- |
| Run jobs side by side | Lint, type-check, build and tests are separate jobs that start together. A chain of `needs:` makes the total the sum of the jobs, where side by side it is the slowest one. |
| Test only what the diff can reach, on PRs | Use the tool's own graph: `vitest --changed origin/main`, `jest --changedSince=origin/main`, `turbo run test --affected`, `nx affected -t test`. These compare against the base branch, so the checkout needs its history (`fetch-depth: 0` on `actions/checkout`, or a fetch of the base). Run the full suite on the default branch and before a release. |
| Fill shards by recorded time | Splitting by file count leaves one shard with the slow files. Keep the last run's timings and balance on them. Playwright, Jest and Vitest take `--shard=i/n`, which splits by file; to balance by time, generate each shard's file list from the previous run's JUnit timings. |
| Faster tools for the same check | A native type checker or linter can replace a slow one when it reports the same errors on this repo. Run both once and compare the output before switching, and do not drop rules to make the switch. |
| Cache what is deterministic | The dependency store keyed on the lockfile, build output keyed on inputs, browser binaries. A cache keyed too loosely serves a stale build; key it on what changes the result. |
| Stop superseded runs | A `concurrency` group per workflow and ref on PR workflows (below), so a new push ends the old run. |
| Skip work, not checks | Path filters may skip a job that cannot be affected. A required check must still report, or the PR hangs or merges unchecked. |

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

## Limits

- The PR gate now runs the reachable tests and the default branch runs them all, so nothing stops being checked, but some failures are found one step later. That is only safe when a red default branch is fixed or reverted before the next merge. The affected set must come from the dependency graph. If a bug reaches main because a PR ran too few tests, widen the selection.
- Do not buy speed with retries, raised timeouts or a deleted slow test. Those are the moves in [gate integrity](review-and-release.md#gate-integrity).
- Report the measured times, the runs they came from and what was not changed.
