# Results

## Comparison eval, 26 October 2026 (astack 0.3.0 skills)

Same model, same request, same files; one agent had astack installed, one did not. Each pair was scored blind by a separate judge against the hidden rubric (10 criteria, 0 to 2, max 20). Raw scores and judge notes: [results/2026-10-26.json](results/2026-10-26.json).

| Task | astack | Baseline | Judge preferred | Deciding difference |
| --- | ---: | ---: | --- | --- |
| brand-page | **20** | 14 | astack | Left a DESIGN.md, added no unsourced copy, every tap target usable on phones. Baseline kept eyebrow labels and invented a claim. |
| checkout-tracking | **19** | 14 | astack | Blocked a second `order_completed` after success and sent only allowlisted properties. Baseline could double count and leaked raw error text (which can contain an email) to analytics. |
| launch-ready | **20** | 16 | astack | Per-channel `?ref=` tracking with a 24h/7d readout, sitemap, 404, install command readable on phones. Baseline had no measurement and a clipped command. |
| signup-qa | **20** | 17 | astack | Replayed the journey on mobile and desktop with a tight diff. Baseline verified phone only and made a change on a false premise. |
| copy-landing | **20** | 18 | astack | Removed the unsupported "10,000+ freelancers" claim. Baseline kept it on the page and made it stronger. |
| release-claim | 18 | 18 | baseline (narrowly) | Tie. Baseline's next steps required re-running checks on the deployed commit; astack's run barely consulted the skill. |
| **Total** | **117 / 120** | **97 / 120** | astack 5 of 6 | |

What the skills changed most: **truthfulness under pressure** (removing unsupported claims instead of keeping them), **finishing the loop** (measurement plans, design records, desktop replays), and **checking the outcome rather than the code** (double-count guards found by actually submitting twice).

Where they did not help: the release-claim task, which a capable model already handles from the evidence. That result led to a new "checking someone else's it's shipped" section in `ship`.

### What the eval missed

Both brand-page results, with and without astack, landed on warm cream with a serif headline and a terracotta accent, which is today's most common generated look. The judge didn't penalise it. astack 0.5 names that default and checks plans against it; a re-run of the same task picked a direction from the subject instead and passes `slop-scan.mjs` clean. That re-run wasn't scored blind, so it isn't in the table. See the [case study](../docs/case-study-pawpath.md).

### Caveats

- One run per arm per task. Treat a 2-point difference as noise; the 5 and 6-point gaps are the meaningful ones.
- Workers and judges are the same model family, and the rubrics were written by the skills' author. Fixtures, prompts and rubrics are all in [tasks/](tasks/) so the setup can be inspected and re-run.
- Both arms sometimes wrote scratch files outside their folder; judges noted it but did not score it.

## Routing eval

Re-run on 26 October 2026 against the final 11-skill suite. `oneshot` is user-invoked only, so the agent sees 10 descriptions.

| Set | Cases | Correct |
| --- | ---: | ---: |
| Direct requests (`cases.json`) | 42 | 42 |
| Near-misses (`cases-hard.json`): small edits that need no skill, requests between two skills | 24 | 24 |

The first pass on the smaller suite scored 63 of 66. Two misses were outdated expectations ("all the way to prod" now correctly loads `astack` plus `ship`, since `astack` stops at the PR). One was a real gap: "the dashboard numbers look wrong" loaded nothing, so `instrument`'s description now covers metrics that look off. The agent sees only names and descriptions; the direct set was written alongside the descriptions, so it is the weaker of the two tests.
