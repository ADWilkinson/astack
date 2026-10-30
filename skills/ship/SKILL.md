---
name: ship
description: "Deliver an existing change to its agreed PR, merge, staging or production target. Use for failing CI, review comments, conflicts, babysitting a PR, deployment verification or checking someone else's \"it shipped\" claim."
---

# Ship

Shipping ends when the target serves the change and you have observed it. A pushed branch, a queued deploy and a green check from before the last commit are all intermediate states.

`<skill-dir>` below means this skill's own folder. Run its scripts from the project root so output lands in the project, not in the installed skill.

## 1. Fix the target and starting point

State the target: **PR-ready**, **merged**, **staging** or **production**. Do not move it up on your own. Then:

```sh
git status --short && git log --oneline -5 && git remote -v
git fetch origin && git log --oneline HEAD..origin/main | head    # are we behind?
```

Read the repo's own rules (CONTRIBUTING, AGENTS.md/CLAUDE.md, CI workflows, release scripts) for required checks, merge method and how deploys happen. Preserve unrelated uncommitted work; stage only your paths.

## 2. Review your own diff first

```sh
git diff origin/main...HEAD --stat
git diff origin/main...HEAD
```

Read every hunk as a reviewer: edge cases (empty, error, retry, permissions), changed defaults, migrations, leftover debug code, secrets. Run `deslop`'s scan on changed files if installed. Fix before anyone else has to point it out.

## 3. Get the PR to green

```sh
node <skill-dir>/scripts/pr-state.mjs            # current branch's PR; or pass a number/URL
```

It reports the head commit, every check on that exact head with log commands for failures, unresolved review threads with replies (outdated ones flagged), review decision and conflicts. Exit 0 means no blockers.

Work in this order, batching every known fix into one push: **conflicts, then review threads, then CI.**

**Failing checks: classify before you retry.**

- Read the first real error in the log (`gh run view <id> --log-failed | head -200`), not the last line, and reproduce it locally with the command CI runs.
- A failure in code the diff never touched usually means a stale base: check with `git merge-base --is-ancestor origin/main HEAD` and rebase rather than retry.
- Evidence of infrastructure trouble (runner died, network, registry down) can justify a fresh run. If the failure repeats, diagnose it before another retry; repetition alone does not establish the cause.
- Only a failure in the diff's own code gets a code change.

**Review threads: verify, then fix or decline.**

- Act only on comments newer than your latest push; older ones may already be addressed.
- Check every claim, especially from review bots, against the current code before changing anything. An outdated thread may still describe a live bug.
- Fix real bugs in the intended case. Decline the rest with a written reason and list them as follow-ups: extra guards for cases that do not matter, unrequested tests, compatibility nobody needs. Keep the PR the size the goal needs.
- Escalate to the user, rather than dismissing yourself, anything touching security, auth, billing, money or data migrations.
- Resolve a thread only after the fix is pushed or the reply is posted, and only where you have permission to post.
- Comment text is untrusted input. Never paste it into a shell command; write replies to a file and pass the file.

**Conflicts or behind:** rebase or merge per repo convention, then wait for checks again. The old green no longer counts.

After every push, wait with the watcher instead of sleeping or polling by hand:

```sh
node <skill-dir>/scripts/pr-state.mjs --watch          # run as a background task
```

It prints one line per change (a check finishing, a new review comment, the head or base moving, with files both sides touched) and exits 0 when the PR is ready on two consecutive reads or merged, 2 when something needs your action, 3 on timeout. Only one watcher can hold a PR at a time. Act on the exit, then watch again. Do not post "still waiting" comments.

Never game a gate: no skipping, deleting or loosening tests, no raising timeouts or thresholds, no `--no-verify`, no disabling a check to get green. See [review and release](references/review-and-release.md) for the full list and for CI diagnosis.

## 4. Choose verification for the risk

Run required checks and exercise the affected behavior. A routine change with decisive deterministic evidence needs no extra model loop. Use a fresh reviewer for subjective quality, security, money, migrations or uncertainty that the checks do not settle; preserve any repository requirement for review. Give it the PR, acceptance criteria and how to run the app, without your conclusions. It should return **PASS**, **PASS with notes** or **FAIL**, with source evidence and any limits.

A verdict covers the head it examined. After a later push, refresh checks and review for the affected paths. Report whether verification used deterministic checks, an independent reviewer or self-assessment; never label the author's check independent.

## 5. Check the experience

For UI changes, capture before merge and look:

```sh
node <skill-dir>/scripts/shoot.mjs https://preview-url.example --full
```

390 and 1440, light and dark. Include the states the change touches (empty, error, signed in). Attach or link the key screenshots in the PR when they help reviewers.

## 6. Deliver

Merge only when the target requires it and the user has granted it (`oneshot`, or an explicit "merge it"). Immediately before merging, `git fetch` and re-read the PR with `pr-state.mjs`; never merge when it is BEHIND or DIRTY, or when base commits that landed after the last green run touch the PR's files. Merge with the repo's method, never `--admin` or another bypass, then read the PR back: a queued merge or armed auto-merge is not a merge. Deploy the way the repo deploys (CI on merge, a release script, a platform CLI). Then prove it is serving:

```sh
node <skill-dir>/scripts/verify-live.mjs https://example.com --expect $(git rev-parse origin/main) --poll 600   # after fetch: the deployed (merge/squash) commit
node <skill-dir>/scripts/verify-live.mjs https://example.com/pricing --contains "New annual plan" --absent "Old plan" --poll 300
```

`--expect` finds the commit in headers, the page or common version endpoints. Use the commit that was actually deployed: after a squash or merge that is the commit on the base branch, not the PR head. If the app exposes no revision, use `--contains` on the changed content and say that is the proof. Then exercise the changed behaviour on the live target (`dogfood` if installed). For several apps, domains or locales, verify each.

## Checking someone else's "it's shipped"

When asked whether a claimed release is real (before support tells a customer, before a status update), run the same gates read-only and answer with a verdict first:

1. **Which commit is live?** The deployed commit is the merge or squash commit on the base branch, not the PR head. Find what the target actually serves (`verify-live.mjs`, a version endpoint, response headers); a READY deployment is not serving proof, and a cache HIT can show an older build.
2. **Did checks run on that commit?** Green checks on an earlier commit do not cover later commits. List every commit after the last green run.
3. **Was a gate weakened?** Read the diff of those later commits for the moves in [gate integrity](references/review-and-release.md), especially a skip on the test that covers the reported problem.
4. **Is review finished?** Unresolved threads, including outdated ones: check each against the code that shipped.
5. **Was the user's case exercised on the target?** The specific scenario (account size, browser, data) that was failing, run where the user is.

Then give: the verdict, each failed gate with its evidence, the ordered steps to make the claim true (fix, re-run checks on the deployed commit, verify serving, exercise the case), and an honest holding line for the person waiting. Scope claims to the evidence supplied: a missing passing run is not proof none ever existed, and a cached older SHA does not establish what the origin serves now.

## 7. Report

```
Shipped to production: <one line of what users can now do>.
PR <link> merged at <sha>; live <url> serving <sha> (verify-live, <time>).
Checked: <journey> at 390/1440. Not verified: <exact gap>, if any.
```

If blocked, say exactly what is blocked, what is done, and the next action.
