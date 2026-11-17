# Fast CI

When agents write most of the code, the wait for checks sets the pace of every loop: each push, each review fix, each rebase. A slow pipeline also teaches skipping. Treat a slow gate as a defect in the repo, and fix it as its own change, with the owner's agreement, never inside a feature PR.

Prompted by Pontus Abrahamsson's [account of a frontend pipeline brought under two minutes](https://x.com/pontusab/status/2121982070193058191).

## Measure first

```sh
gh run list --workflow <name> --limit 20 --json databaseId,conclusion,createdAt,updatedAt
gh run view <id> --json jobs --jq '.jobs[] | [.name, .startedAt, .completedAt] | @tsv'
```

Write down the wall-clock time from push to the last required check, and the slowest job and step. Change the largest number first. Record before and after from real runs on the same branch, not from one lucky run.

## What moves the number

| Move | Detail |
| --- | --- |
| Run jobs side by side | Lint, type-check, build and tests are separate jobs that start together. A chain of `needs:` makes the total the sum of the jobs, where side by side it is the slowest one. |
| Test only what the diff can reach, on PRs | Use the tool's own graph: `vitest --changed origin/main`, `jest --changedSince`, `turbo run test --affected`, `nx affected -t test`. Run the full suite on the default branch and before a release. |
| Fill shards by recorded time | Splitting by file count leaves one shard with the slow files. Keep the last run's timings and balance on them. Playwright, Jest and Vitest take `--shard=i/n`; a timing-aware splitter does the balancing. |
| Faster tools for the same check | A native type checker or linter can replace a slow one when it reports the same errors on this repo. Run both once and compare the output before switching. Turn lint rules on, not off. |
| Cache what is deterministic | The dependency store keyed on the lockfile, build output keyed on inputs, browser binaries. A cache keyed too loosely serves a stale build; key it on what changes the result. |
| Stop superseded runs | `concurrency: { group: ${{ github.ref }}, cancel-in-progress: true }` on PR workflows, so a new push ends the old run. |
| Skip work, not checks | Path filters may skip a job that cannot be affected. A required check must still report, or the PR hangs or merges unchecked. |

## Limits

- A faster pipeline that checks less is a weaker gate. The affected-tests set must come from the dependency graph, with the full suite still running on the default branch. If a bug reaches main because a PR ran too few tests, widen the selection.
- Do not buy speed with retries, raised timeouts or a deleted slow test. Those are the moves in [gate integrity](review-and-release.md#gate-integrity).
- Report the measured times, the runs they came from and what was not changed.
