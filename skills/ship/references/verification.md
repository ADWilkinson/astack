# Verification

A check is worth what it can catch. This reference chooses the check for a change, keeps the check out of the change's reach, and turns a miss into a rule. It follows Anthropic's account of [how the Claude Code team verifies work](https://claude.dev/blog/how-the-claude-code-team-thinks-about-verification), paraphrased.

## Run the change

Verification means using the thing that changed. Tests come second.

- Web: drive the page in a browser. Mobile: a simulator or device. Desktop: the app itself. Backend: start the service and call it.
- A unit test can pass while the feature is broken, because neither the test nor its author held the whole task. The journey to the user's outcome is the check that is hard to fool.
- Write down how to start and exercise the app once, where the next agent finds it: a project `verify` skill, a script or a section of AGENTS.md next to the code it covers. Make it fast and make it work on a cold checkout. A slow or unreliable start-up is skipped, and then nothing is verified.
- A feature map (features, paths, shortcuts, selectors, expected results) guides the walk and is the rubric for grading it. Keep it with the code.

## Pick the test that can fail

| Kind | Use when | What it states |
| --- | --- | --- |
| End to end | A user-facing flow changed. Choose this first. | The journey reaches its outcome: added to cart, paid, confirmation shown. |
| Property | Parsing, money, state machines, migrations, retries, anything with rules that must always hold. | A statement that can never be false, attacked with generated inputs (fast-check, Hypothesis, proptest). |
| Differential | A rewrite, port or migration where behaviour must stay the same. | Old and new agree on the same inputs. |

Properties worth writing:

- **Round trip**: decode(encode(x)) equals x. Also parse and serialise.
- **Invariant**: a balance never goes negative; a list stays sorted; ids stay unique.
- **Idempotency**: running the migration, normaliser or retry twice equals running it once.
- **Equivalence**: the optimised path matches the slow, obviously correct one.

Generated inputs come from a different bias than the author's examples, which is the point. For a differential test, feed both systems random or sampled real inputs, normalise differences that do not matter (whitespace, key order), and keep a short list of approved intentional changes. Every other difference is a finding.

A flaky test teaches reruns in place of fixes, and a slow suite gets skipped. Fix both before adding more tests. For a flake, find the race or the outside dependency. Do not skip it, sleep past it or wrap it in a retry. If the cause cannot be found, the owner deletes the test as its own change with the reason recorded, so that nobody trusts a check that is not there. A rerun is a stopgap, named as one.

## Order and limits

1. Cheap checks first, before a PR exists: types, lint, build, the tests the diff can reach.
2. Then run the change.
3. Then review, on the current commit. A review of an earlier commit covers nothing that came after it.
4. Fix and repeat. A round is one diagnosis, one fix and one rerun. After three rounds on the same failing check, stop and hand it to a person with what was tried and the evidence. A fourth identical attempt is not diagnosis.

When a reviewer misses things, sharpen its rules file before adding a second reviewer. A later round gets the earlier findings and what was dismissed, so it does not start again. It still does not get the author's conclusions.

## Keep the check out of the change's reach

- A change does not grade itself. Read review rules, gate configuration and checklists from the base branch, not from the branch under review.
- A PR that edits a check and relies on the edit has two changes in it. The check change needs its own approval from the owner.
- A check that escalates to a person says why, in terms the owner of that area would use.

## A checklist the diff selects

Keep reliability items where the reviewer reads them (`REVIEW.md` or the repo's equivalent). Each item has three parts: a trigger readable from a diff, the check to run, and the incident or PR that earned it. On a review, read the diff and run only the items whose trigger matches. A list that runs in full every time is skimmed. A list keyed to the diff gets run.

```md
- Trigger: touches session restore or transcript parsing.
  Check: resume a session saved by the previous release.
  Why: #412, old transcripts failed to load after a format change.
```

## Say how it was verified

Record the method with the work: a commit trailer such as `Verified-by: ran the checkout journey on the preview`, the PR body or the report. "Not verified" is a valid entry and a useful one, because unverified commits can then be found. Where a repo gates commits on verification, bring the gate in through observe mode first. Log what it would have blocked, remove the false positives, then enforce.

## Turn a miss into a rule

When a bug got past the checks, ask whether a reviewer reading the diff could have caught it.

- A candidate rule must have recurred (two or more PRs, review comments or reverts) and be detectable from a diff.
- Try to disprove it before adding it: find the cases where it would flag correct code.
- Prefer a check to a sentence. A hook, lint rule or test runs every time, and a line in a long file gets skipped.
- Grade the checks on what mattered: bugs that reached users and reverts, set against changes of similar size that stayed clean, so a stricter reviewer does not win by flagging everything.
- When adding a rule, look for one to remove. Rules, checklist items and tests that have caught nothing since they were added cost attention on every run.
