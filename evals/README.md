# Evals

Two kinds of evidence that astack changes outcomes, not just structure.

## Comparison eval (`tasks/`)

Seven realistic tasks, each a natural request plus a small synthetic project with planted problems:

| Task | Request | What is planted |
| --- | --- | --- |
| `copy-landing` | "It reads like every AI-written startup page, fix it up" | Slop copy and UI, an unsupported user-count claim, facts and a disclosure that must survive |
| `brand-page` | "Give this dog walker's site a real identity, keep the facts, works on phones" | Generic dark SaaS styling, fake stats, a fixed-width table that overflows on phones |
| `checkout-tracking` | "Add the tracking we need to see where checkout drops off" | Double submit, declines, personal data in the form |
| `signup-qa` | "Test signup like a real user and fix what's broken" | Mobile overflow hiding the button, an off-by-one password rule, a storage key mismatch |
| `release-claim` | "Engineering says it's shipped; is it?" | Checks on an old commit, a skipped test, an unresolved real bug, a stale cached version endpoint |
| `launch-ready` | "Launching tomorrow on X and Show HN, get the site ready and draft posts" | noindex, robots disallow, JS-only content, wrong share card, no measurement |
| `launch-assets` | "Make the share card, a square one and a short demo clip; brand in DESIGN.md, copy in NOTES.md" | A brand font that silently falls back to a plausible serif, reworded signed-off copy, an off-token badge, a tempting untrue claim |

### Method

1. Each fixture is copied twice into neutral folders (`proj-<random>`). One copy gets astack installed with the CLI; the other gets nothing.
2. A fresh agent works each copy with the same request. The astack agent also sees the installed-skills list, as Claude Code shows it. Neither prompt mentions evaluation.
3. Outputs are copied into `A/` and `B/` in random order, with the skills folder removed and any skill paths neutralised, next to the original files and each agent's report.
4. A fresh judge scores both against `rubric.md` (10 criteria, 0 to 2 each), which the working agents never saw. Judges must check claims themselves: render pages, run the code, diff against the original. They also say which result they would rather hand the user.

`rubric.md` in each task lists the planted problems, so future runs can be scored the same way.

### Limits

- One run per arm per task: model variance is not averaged out.
- Workers and judges are the same model family. A judge from another family would be a stronger check.
- The rubrics were written by the same author as the skills, so they reward what the skills teach. They are published here so that bias can be inspected.

## Routing eval (`routing/`)

Whether the skill descriptions make an agent load the right skill, and only when it helps.

- `cases.json`: 48 direct requests, some of which should load nothing.
- `cases-hard.json`: 27 near-misses: small edits that need no skill, requests that sit between two skills.
- A fresh agent sees only the skill names and descriptions and picks skills per request. `score.py cases.json run.json` scores a run.
- Every case id must be present, including requests that load no skill. Invalid input exits 2, a routing miss exits 1 and a complete passing run exits 0. Use `score.py cases.json candidate.json --compare baseline.json` to expose improvements and regressions by case.

## Changing the execution loop

Run the same requests with the old and candidate skills, using at least two fresh repeats per client. Preserve the model, task, tools and authority within each comparison. Record task completion and the specific invariants that held or failed; routing alone does not prove execution quality. Keep failures from earlier attempts when tuning descriptions, then rerun the affected set.

For comparisons, report which tasks changed outcome, tool/skill choices, elapsed time and token usage when available. Separate cached from uncached input, and avoid claiming a latency or cost improvement from a small sample. A missing trace or incomplete run is an error, not a passing result. See [the execution policy](../docs/single-loop.md).

## Results

See [RESULTS.md](RESULTS.md).
